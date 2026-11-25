const fs = require("node:fs");
const path = require("node:path");
const config = require("./config");

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  console.error("");
  console.error("  当前 Node.js 版本不支持内置 node:sqlite。");
  console.error("  请升级到 Node.js 22.5 或更高版本（本机使用 Node 24 验证）。");
  console.error("  下载：https://nodejs.org/");
  console.error("");
  process.exit(1);
}

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");
db.exec(fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8"));

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function exec(sql) {
  db.exec(sql);
}

function transaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  }
}

const seed = require("./seed");
seed(db);

module.exports = { db, run, get, all, exec, transaction };
