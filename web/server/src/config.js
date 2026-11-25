const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";

module.exports = {
  root: ROOT,
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "0.0.0.0",
  dbPath: process.env.DB_PATH || path.join(ROOT, "data", "cloth-travel.db"),
  publicDir: path.resolve(ROOT, "..", "public"),
  adminDir: path.resolve(ROOT, "..", "admin"),
  devSmsCode: process.env.DEV_SMS_CODE || "123456",
  smsTtlSeconds: Number(process.env.SMS_TTL_SECONDS || 300),
  wechatMock: process.env.WECHAT_MOCK === "true" || (!isProd && process.env.WECHAT_MOCK !== "false"),
  adminUsername: process.env.ADMIN_USER || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  adminSessionHours: Number(process.env.ADMIN_SESSION_HOURS || 12),
  customerSessionDays: Number(process.env.CUSTOMER_SESSION_DAYS || 30),
  isProd,
};
