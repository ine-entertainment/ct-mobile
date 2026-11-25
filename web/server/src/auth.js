const crypto = require("node:crypto");
const config = require("./config");
const { run, get, all } = require("./db");
const { randomId, randomToken, hashToken, nowIso, addDaysIso, maskPhone } = require("./util");
const { mapUser, mapAdmin } = require("./mappers");

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function cleanupExpiredSessions() {
  const now = nowIso();
  run("DELETE FROM customer_sessions WHERE expires_at < ?", [now]);
  run("DELETE FROM admin_sessions WHERE expires_at < ?", [now]);
  run("DELETE FROM auth_codes WHERE expires_at < ?", [now]);
  run("DELETE FROM merge_tickets WHERE expires_at < ? OR used = 1", [now]);
}

function createCustomerSession(userId) {
  const token = randomToken();
  const now = nowIso();
  const expires = new Date(Date.now() + config.customerSessionDays * 86400000).toISOString();
  run(
    "INSERT INTO customer_sessions (token, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
    [hashToken(token), userId, now, expires, now]
  );
  return token;
}

function getCustomerByToken(token) {
  if (!token) return null;
  const row = get(
    `SELECT u.*, s.token AS session_token, s.expires_at AS session_expires_at
       FROM customer_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > ?`,
    [hashToken(token), nowIso()]
  );
  if (!row || row.status !== "active") return null;
  return row;
}

function getIdentitiesForUser(userId) {
  return all("SELECT * FROM identities WHERE user_id = ? ORDER BY created_at ASC", [userId]);
}

function customerPayload(userRow) {
  return mapUser(userRow, getIdentitiesForUser(userRow.id));
}

function optionalCustomer(req, _res, next) {
  const token = bearerToken(req);
  const row = getCustomerByToken(token);
  req.customer = row || null;
  req.customerToken = token || "";
  next();
}

function requireCustomer(req, res, next) {
  const token = bearerToken(req);
  const row = getCustomerByToken(token);
  if (!row) {
    return res.status(401).json({ error: "unauthorized", message: "登录状态已失效，请重新登录" });
  }
  req.customer = row;
  req.customerToken = token;
  run("UPDATE customer_sessions SET last_seen_at = ? WHERE token = ?", [nowIso(), hashToken(token)]);
  next();
}

function deleteCustomerSession(token) {
  if (!token) return;
  run("DELETE FROM customer_sessions WHERE token = ?", [hashToken(token)]);
}

function invalidateUserSessions(userId) {
  run("DELETE FROM customer_sessions WHERE user_id = ?", [userId]);
}

function createAdminSession(adminId) {
  const token = randomToken();
  const now = nowIso();
  const expires = new Date(Date.now() + config.adminSessionHours * 3600000).toISOString();
  run(
    "INSERT INTO admin_sessions (token, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    [hashToken(token), adminId, now, expires]
  );
  return token;
}

function getAdminByToken(token) {
  if (!token) return null;
  return get(
    `SELECT a.*, s.token AS session_token, s.expires_at AS session_expires_at
       FROM admin_sessions s
       JOIN admin_users a ON a.id = s.admin_id
      WHERE s.token = ? AND s.expires_at > ?`,
    [hashToken(token), nowIso()]
  );
}

function requireAdmin(req, res, next) {
  const token = bearerToken(req);
  const admin = getAdminByToken(token);
  if (!admin || admin.status !== "active") {
    return res.status(401).json({ error: "unauthorized", message: "管理员登录已失效" });
  }
  req.admin = admin;
  req.adminToken = token;
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== "super") {
    return res.status(403).json({ error: "forbidden", message: "仅超级管理员可执行此操作" });
  }
  next();
}

function deleteAdminSession(token) {
  if (!token) return;
  run("DELETE FROM admin_sessions WHERE token = ?", [hashToken(token)]);
}

function adminPayload(adminRow) {
  return mapAdmin(adminRow);
}

function newIdentity(userId, type, value, meta = {}) {
  const now = nowIso();
  run(
    `INSERT INTO identities (id, user_id, type, value, nickname, avatar, union_id, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomId("idn"),
      userId,
      type,
      value,
      meta.nickname || "",
      meta.avatar || "",
      meta.unionId || "",
      now,
      now,
    ]
  );
}

function getIdentity(type, value) {
  return get("SELECT * FROM identities WHERE type = ? AND value = ?", [type, value]);
}

function getIdentityByIdentityId(id) {
  return get("SELECT * FROM identities WHERE id = ?", [id]);
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function maskedPhone(phone) {
  return maskPhone(phone);
}

module.exports = {
  bearerToken,
  cleanupExpiredSessions,
  createCustomerSession,
  getCustomerByToken,
  getIdentitiesForUser,
  customerPayload,
  optionalCustomer,
  requireCustomer,
  deleteCustomerSession,
  invalidateUserSessions,
  createAdminSession,
  getAdminByToken,
  requireAdmin,
  requireSuperAdmin,
  deleteAdminSession,
  adminPayload,
  newIdentity,
  getIdentity,
  getIdentityByIdentityId,
  safeCompare,
  maskedPhone,
};
