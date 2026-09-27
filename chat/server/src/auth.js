import crypto from "node:crypto";
import { promisify } from "node:util";
import { db, persist } from "./db.js";

const scrypt = promisify(crypto.scrypt);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;

const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const candidate = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

function pruneExpired(now = Date.now()) {
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  if (db.sessions.length !== before) persist();
}

db.sessions = db.sessions.filter((s) => typeof s.tokenHash === "string");
pruneExpired();
setInterval(pruneExpired, 60 * 60 * 1000).unref();

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db.sessions.push({ tokenHash: digest(token), userId, createdAt: now, expiresAt: now + SESSION_TTL_MS });
  persist();
  return token;
}

export function destroySession(token) {
  const hash = digest(token);
  const i = db.sessions.findIndex((s) => s.tokenHash === hash);
  if (i >= 0) {
    db.sessions.splice(i, 1);
    persist();
  }
}

export function userForToken(token) {
  if (typeof token !== "string" || !token) return null;
  const hash = digest(token);
  const session = db.sessions.find((s) => s.tokenHash === hash);
  if (!session || session.expiresAt <= Date.now()) return null;
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

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map();

export function loginBlocked(key) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordLoginFailure(key) {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || now - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: now });
  else entry.count += 1;
}

export function clearLoginFailures(key) {
  failures.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of failures) if (now - entry.first > WINDOW_MS) failures.delete(key);
}, WINDOW_MS).unref();
