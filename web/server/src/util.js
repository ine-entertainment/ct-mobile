const crypto = require("node:crypto");

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function maskPhone(phone) {
  const value = String(phone || "");
  if (value.length < 7) return value;
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}

function maskOpenid(openid) {
  const value = String(openid || "");
  if (value.length <= 6) return value;
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}

function cnToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysToDate(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shortDate(dateStr) {
  const parts = String(dateStr).split("-");
  if (parts.length < 3) return dateStr || "";
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function cnDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function cnDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateRangeLabel(startDate, endDate, days) {
  if (!startDate || !endDate) return "";
  return `${shortDate(startDate)} - ${shortDate(endDate)}${days ? ` · ${days} 天` : ""}`;
}

function generateOrderNo(type) {
  const date = cnToday().replace(/-/g, "");
  const prefix = type === "photo" ? "YYP" : "YY";
  const tail = String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 10));
  return `${prefix}${date}${tail}`;
}

function toInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function text(value, max = 500) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ""));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  nowIso,
  addDaysIso,
  randomId,
  randomToken,
  hashToken,
  hashPassword,
  verifyPassword,
  parseJson,
  toJson,
  maskPhone,
  maskOpenid,
  cnToday,
  addDaysToDate,
  shortDate,
  cnDateTime,
  cnDate,
  dateRangeLabel,
  generateOrderNo,
  toInt,
  clamp,
  text,
  pick,
  isValidPhone,
  sleep,
};
