import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { db, persist } from "./db.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  userForToken,
  requireAuth,
  loginBlocked,
  recordLoginFailure,
  clearLoginFailures,
} from "./auth.js";

const PORT = Number(process.env.PORT || 4000);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("uploads");
const WEB_DIR = process.env.WEB_DIR || path.resolve("../app/build/web");
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const PAGE_SIZE = 50;
const EXTRA_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function originAllowed(origin, host) {
  if (!origin) return true;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (host && url.host === host) return true;
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return true;
  return EXTRA_ORIGINS.includes(url.origin);
}

const app = express();
app.set("trust proxy", process.env.TRUST_PROXY === "1");
app.use(
  cors((req, cb) => {
    const allowed = originAllowed(req.headers.origin, req.headers["x-forwarded-host"] || req.headers.host);
    cb(null, { origin: allowed });
  }),
);
app.use(express.json({ limit: "6mb" }));
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    maxAge: "7d",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
    },
  }),
);

const server = http.createServer(app);
const io = new Server(server, {
  allowRequest: (req, cb) =>
    cb(null, originAllowed(req.headers.origin, req.headers["x-forwarded-host"] || req.headers.host)),
});

const online = new Map();

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
  bio: u.bio,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt,
  lastSeen: u.lastSeen ?? null,
  online: online.has(u.id),
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sniffImage(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("latin1"))) return "gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return "webp";
  return null;
}

function saveAvatar(dataUrl) {
  const match = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl || "");
  if (!match) throw new HttpError(400, "Profile image must be a PNG, JPEG, WEBP or GIF");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > MAX_AVATAR_BYTES) throw new HttpError(400, "Profile image must be under 3 MB");
  const ext = sniffImage(buffer);
  if (!ext) throw new HttpError(400, "Profile image must be a PNG, JPEG, WEBP or GIF");
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

const wrap = (fn) => (req, res, next) => {
  Promise.resolve()
    .then(() => fn(req, res, next))
    .catch(next);
};

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function conversationMessages(conversationId) {
  return db.messages.filter((m) => m.conversationId === conversationId);
}

function conversationView(conv, viewerId) {
  const otherId = conv.members.find((m) => m !== viewerId) ?? viewerId;
  const other = db.users.find((u) => u.id === otherId);
  const msgs = conversationMessages(conv.id);
  const last = msgs[msgs.length - 1] ?? null;
  const readAt = conv.readAt?.[viewerId] ?? 0;
  const unread = msgs.filter((m) => m.senderId !== viewerId && m.createdAt > readAt).length;
  return {
    id: conv.id,
    user: other ? publicUser(other) : null,
    lastMessage: last,
    unread,
    otherReadAt: conv.readAt?.[otherId] ?? 0,
    updatedAt: last?.createdAt ?? conv.createdAt,
  };
}

function memberConversation(req) {
  const conv = db.conversations.find((c) => c.id === req.params.id);
  if (!conv || !conv.members.includes(req.user.id)) throw new HttpError(404, "Conversation not found");
  return conv;
}

async function disconnectToken(userId, token) {
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  for (const socket of sockets) if (socket.data.token === token) socket.disconnect(true);
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get(
  "/api/auth/username-available",
  wrap((req, res) => {
    const username = cleanText(req.query.username, 40).toLowerCase();
    const valid = USERNAME_RE.test(username);
    const taken = db.users.some((u) => u.username === username);
    res.json({ username, valid, available: valid && !taken });
  }),
);

app.post(
  "/api/auth/register",
  wrap(async (req, res) => {
    const username = cleanText(req.body.username, 40).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const displayName = cleanText(req.body.displayName, 40) || username;
    const bio = cleanText(req.body.bio, 160);
    if (!USERNAME_RE.test(username))
      throw new HttpError(400, "Username must be 3-20 characters: letters, numbers, _ or .");
    if (db.users.some((u) => u.username === username)) throw new HttpError(409, "Username is already taken");
    if (password.length < 6 || password.length > 200)
      throw new HttpError(400, "Password must be between 6 and 200 characters");
    const avatarUrl = req.body.avatar ? saveAvatar(req.body.avatar) : null;
    const passwordHash = await hashPassword(password);
    if (db.users.some((u) => u.username === username)) throw new HttpError(409, "Username is already taken");
    const user = {
      id: crypto.randomUUID(),
      username,
      displayName,
      bio,
      avatarUrl,
      passwordHash,
      createdAt: Date.now(),
    };
    db.users.push(user);
    persist();
    res.status(201).json({ token: createSession(user.id), user: publicUser(user) });
  }),
);

app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const username = cleanText(req.body.username, 40).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password.slice(0, 200) : "";
    const keys = [`ip:${req.ip}`, `user:${username}`];
    if (keys.some(loginBlocked)) throw new HttpError(429, "Too many login attempts. Try again in a few minutes.");
    const user = db.users.find((u) => u.username === username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      keys.forEach(recordLoginFailure);
      throw new HttpError(401, "Invalid username or password");
    }
    clearLoginFailures(`user:${username}`);
    res.json({ token: createSession(user.id), user: publicUser(user) });
  }),
);

app.post(
  "/api/auth/logout",
  requireAuth,
  wrap(async (req, res) => {
    destroySession(req.token);
    await disconnectToken(req.user.id, req.token);
    res.json({ ok: true });
  }),
);

app.get("/api/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.put(
  "/api/me",
  requireAuth,
  wrap((req, res) => {
    const user = req.user;
    if (req.body.displayName !== undefined) user.displayName = cleanText(req.body.displayName, 40) || user.username;
    if (req.body.bio !== undefined) user.bio = cleanText(req.body.bio, 160);
    if (req.body.avatar) user.avatarUrl = saveAvatar(req.body.avatar);
    if (req.body.avatar === null) user.avatarUrl = null;
    persist();
    const view = publicUser(user);
    io.emit("user:updated", view);
    res.json({ user: view });
  }),
);

app.get("/api/users", requireAuth, (req, res) => {
  const q = cleanText(req.query.q, 40).toLowerCase();
  const users = db.users
    .filter((u) => u.id !== req.user.id)
    .filter((u) => !q || u.username.includes(q) || u.displayName.toLowerCase().includes(q))
    .sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)) || a.username.localeCompare(b.username))
    .slice(0, 50)
    .map(publicUser);
  res.json({ users });
});

app.get(
  "/api/users/:id",
  requireAuth,
  wrap((req, res) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: publicUser(user) });
  }),
);

app.get("/api/conversations", requireAuth, (req, res) => {
  const conversations = db.conversations
    .filter((c) => c.members.includes(req.user.id))
    .map((c) => conversationView(c, req.user.id))
    .filter((c) => c.lastMessage)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ conversations });
});

app.post(
  "/api/conversations",
  requireAuth,
  wrap((req, res) => {
    const other = db.users.find((u) => u.id === req.body.userId);
    if (!other) throw new HttpError(404, "User not found");
    const members = [req.user.id, other.id].sort();
    let conv = db.conversations.find((c) => c.members.join() === members.join());
    if (!conv) {
      conv = { id: crypto.randomUUID(), members, createdAt: Date.now(), readAt: {} };
      db.conversations.push(conv);
      persist();
    }
    res.json({ conversation: conversationView(conv, req.user.id) });
  }),
);

app.get(
  "/api/conversations/:id/messages",
  requireAuth,
  wrap((req, res) => {
    const conv = memberConversation(req);
    const before = Number(req.query.before) || Infinity;
    const older = conversationMessages(conv.id).filter((m) => m.createdAt < before);
    res.json({
      messages: older.slice(-PAGE_SIZE),
      hasMore: older.length > PAGE_SIZE,
      conversation: conversationView(conv, req.user.id),
    });
  }),
);

app.post(
  "/api/conversations/:id/messages",
  requireAuth,
  wrap((req, res) => {
    const conv = memberConversation(req);
    const text = cleanText(req.body.text, 4000);
    if (!text) throw new HttpError(400, "Message cannot be empty");
    const msgs = conversationMessages(conv.id);
    const previous = msgs[msgs.length - 1]?.createdAt ?? 0;
    const message = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: req.user.id,
      text,
      createdAt: Math.max(Date.now(), previous + 1),
    };
    db.messages.push(message);
    conv.readAt = { ...conv.readAt, [req.user.id]: message.createdAt };
    persist();
    for (const memberId of conv.members) {
      io.to(`user:${memberId}`).emit("message:new", {
        message,
        conversation: conversationView(conv, memberId),
      });
    }
    res.status(201).json({ message });
  }),
);

app.post(
  "/api/conversations/:id/read",
  requireAuth,
  wrap((req, res) => {
    const conv = memberConversation(req);
    const msgs = conversationMessages(conv.id);
    const at = Math.max(conv.readAt?.[req.user.id] ?? 0, msgs[msgs.length - 1]?.createdAt ?? 0);
    conv.readAt = { ...conv.readAt, [req.user.id]: at };
    persist();
    for (const memberId of conv.members) {
      io.to(`user:${memberId}`).emit("conversation:read", { conversationId: conv.id, userId: req.user.id, at });
    }
    res.json({ ok: true, at });
  }),
);

if (fs.existsSync(path.join(WEB_DIR, "index.html"))) {
  app.use(express.static(WEB_DIR));
  app.get(/^\/(?!api|uploads|socket\.io).*/, (_req, res) => res.sendFile(path.join(WEB_DIR, "index.html")));
}

app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === "entity.too.large" ? 413 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Something went wrong" : err.message });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = userForToken(token);
  if (!user) return next(new Error("Unauthorized"));
  socket.data.user = user;
  socket.data.token = token;
  next();
});

io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  online.set(user.id, (online.get(user.id) || 0) + 1);
  io.emit("presence", { userId: user.id, online: true });
  const typingIn = new Map();

  const emitTyping = (conv, typing) => {
    for (const memberId of conv.members) {
      if (memberId !== user.id) {
        io.to(`user:${memberId}`).emit("typing", { conversationId: conv.id, userId: user.id, typing });
      }
    }
  };

  socket.on("typing", ({ conversationId, typing } = {}) => {
    if (!userForToken(socket.data.token)) {
      socket.disconnect(true);
      return;
    }
    const conv = db.conversations.find((c) => c.id === conversationId);
    if (!conv || !conv.members.includes(user.id)) return;
    if (typing) typingIn.set(conv.id, conv);
    else typingIn.delete(conv.id);
    emitTyping(conv, Boolean(typing));
  });

  socket.on("disconnect", () => {
    for (const conv of typingIn.values()) emitTyping(conv, false);
    typingIn.clear();
    const count = (online.get(user.id) || 1) - 1;
    if (count > 0) {
      online.set(user.id, count);
      return;
    }
    online.delete(user.id);
    user.lastSeen = Date.now();
    persist();
    io.emit("presence", { userId: user.id, online: false, lastSeen: user.lastSeen });
  });
});

setInterval(async () => {
  for (const socket of await io.fetchSockets()) {
    if (!userForToken(socket.data.token)) socket.disconnect(true);
  }
}, 60 * 1000).unref();

server.listen(PORT, () => console.log(`NightChat server listening on http://localhost:${PORT}`));
