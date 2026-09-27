import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const empty = () => ({ users: [], sessions: [], conversations: [], messages: [] });

function load() {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch {
    return empty();
  }
}

export const db = load();

let timer = null;
export function persist() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 50);
}
