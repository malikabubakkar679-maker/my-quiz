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
} from "./auth.js";

const PORT = Number(process.env.PORT || 4000);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve("uploads");
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const WEB_DIR = process.env.WEB_DIR || path.resolve("../app/build/web");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

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

function saveAvatar(dataUrl) {
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl || "");
  if (!match) throw new HttpError(400, "Profile image must be a PNG, JPEG, WEBP or GIF");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_AVATAR_BYTES) throw new HttpError(400, "Profile image must be under 3 MB");
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) => {
  try {
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function conversationView(conv, viewerId) {
  const otherId = conv.members.find((m) => m !== viewerId) ?? viewerId;
  const other = db.users.find((u) => u.id === otherId);
  const msgs = db.messages.filter((m) => m.conversationId === conv.id);
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
  wrap((req, res) => {
    const username = cleanText(req.body.username, 40).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const displayName = cleanText(req.body.displayName, 40) || username;
    const bio = cleanText(req.body.bio, 160);
    if (!USERNAME_RE.test(username))
      throw new HttpError(400, "Username must be 3-20 characters: letters, numbers, _ or .");
    if (db.users.some((u) => u.username === username)) throw new HttpError(409, "Username is already taken");
    if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
    const avatarUrl = req.body.avatar ? saveAvatar(req.body.avatar) : null;
    const user = {
      id: crypto.randomUUID(),
      username,
      displayName,
      bio,
      avatarUrl,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    db.users.push(user);
    persist();
    res.status(201).json({ token: createSession(user.id), user: publicUser(user) });
  }),
);

app.post(
  "/api/auth/login",
  wrap((req, res) => {
    const username = cleanText(req.body.username, 40).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = db.users.find((u) => u.username === username);
    if (!user || !verifyPassword(password, user.passwordHash))
      throw new HttpError(401, "Invalid username or password");
    res.json({ token: createSession(user.id), user: publicUser(user) });
  }),
);

app.post("/api/auth/logout", requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

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
    const msgs = db.messages.filter((m) => m.conversationId === conv.id && m.createdAt < before);
    res.json({ messages: msgs.slice(-100), conversation: conversationView(conv, req.user.id) });
  }),
);

app.post(
  "/api/conversations/:id/messages",
  requireAuth,
  wrap((req, res) => {
    const conv = memberConversation(req);
    const text = cleanText(req.body.text, 4000);
    if (!text) throw new HttpError(400, "Message cannot be empty");
    const message = {
      id: crypto.randomUUID(),
      conversationId: conv.id,
      senderId: req.user.id,
      text,
      createdAt: Date.now(),
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
    const at = Date.now();
    conv.readAt = { ...conv.readAt, [req.user.id]: at };
    persist();
    for (const memberId of conv.members) {
      io.to(`user:${memberId}`).emit("conversation:read", { conversationId: conv.id, userId: req.user.id, at });
    }
    res.json({ ok: true });
  }),
);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "Something went wrong" : err.message });
});

if (fs.existsSync(path.join(WEB_DIR, "index.html"))) {
  app.use(express.static(WEB_DIR));
  app.get(/^\/(?!api|uploads|socket\.io).*/, (_req, res) => res.sendFile(path.join(WEB_DIR, "index.html")));
}

io.use((socket, next) => {
  const user = userForToken(socket.handshake.auth?.token);
  if (!user) return next(new Error("Unauthorized"));
  socket.data.user = user;
  next();
});

io.on("connection", (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  online.set(user.id, (online.get(user.id) || 0) + 1);
  io.emit("presence", { userId: user.id, online: true });

  socket.on("typing", ({ conversationId, typing } = {}) => {
    const conv = db.conversations.find((c) => c.id === conversationId);
    if (!conv || !conv.members.includes(user.id)) return;
    for (const memberId of conv.members) {
      if (memberId !== user.id) {
        io.to(`user:${memberId}`).emit("typing", { conversationId, userId: user.id, typing: Boolean(typing) });
      }
    }
  });

  socket.on("disconnect", () => {
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

server.listen(PORT, () => console.log(`NightChat server listening on http://localhost:${PORT}`));
