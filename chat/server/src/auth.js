import crypto from "node:crypto";
import { db, persist } from "./db.js";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.sessions.push({ token, userId, createdAt: Date.now() });
  persist();
  return token;
}

export function destroySession(token) {
  const i = db.sessions.findIndex((s) => s.token === token);
  if (i >= 0) {
    db.sessions.splice(i, 1);
    persist();
  }
}

export function userForToken(token) {
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.userId) ?? null;
}

export function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export function requireAuth(req, res, next) {
  const token = bearer(req);
  const user = userForToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  req.token = token;
  next();
}
