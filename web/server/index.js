const os = require("node:os");
const path = require("node:path");
const express = require("express");
const config = require("./src/config");
const { cleanupExpiredSessions } = require("./src/auth");
const { db } = require("./src/db");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  const orderCount = db.prepare("SELECT COUNT(*) AS n FROM orders").get().n;
  res.json({
    ok: true,
    name: "cloth-travel-server",
    time: new Date().toISOString(),
    users: userCount,
    orders: orderCount,
    mockSms: true,
    mockWechat: config.wechatMock,
  });
});

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/orders", require("./src/routes/orders"));
app.use("/api/admin", require("./src/routes/admin"));
app.use("/api", require("./src/routes/catalog"));

app.use(
  "/admin",
  express.static(config.adminDir, {
    index: "index.html",
    extensions: ["html"],
    setHeaders(res) {
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

app.use(
  express.static(config.publicDir, {
    index: "index.html",
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html") || filePath.endsWith(".js") || filePath.endsWith(".css")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "not_found", message: "接口不存在" });
  }
  const notFound = path.join(config.publicDir, "404.html");
  res.status(404).sendFile(notFound, (error) => {
    if (error) res.status(404).send("Not Found");
  });
});

app.use((error, req, res, _next) => {
  const status = error.status || (error.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) console.error("[server]", error);
  res.status(status).json({
    error: error.code || error.type || "internal_error",
    message: error.message || "服务器内部错误",
    ...(error.extra && error.extra.field ? { field: error.extra.field } : {}),
  });
});

cleanupExpiredSessions();
const cleanupTimer = setInterval(cleanupExpiredSessions, 10 * 60e3);
cleanupTimer.unref();

const server = app.listen(config.port, config.host, () => {
  const addresses = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list || []) {
      if (item.family === "IPv4" && !item.internal) addresses.push(item.address);
    }
  }
  console.log("");
  console.log("  未命名项目 · 后端服务已启动");
  console.log(`  本机访问    http://127.0.0.1:${config.port}`);
  for (const address of addresses) {
    console.log(`  局域网访问  http://${address}:${config.port}  (手机与电脑连同一 Wi-Fi)`);
  }
  console.log(`  管理后台    http://127.0.0.1:${config.port}/admin`);
  console.log(`  默认管理员  ${config.adminUsername} / ${config.adminPassword}`);
  console.log(`  测试手机号  13800000001  验证码 ${config.devSmsCode}`);
  console.log(`  数据库      ${config.dbPath}`);
  if (config.isProd && config.adminPassword === "admin123") {
    console.warn("  [WARN] 生产环境仍在使用默认管理员密码 admin123，请立即修改 ADMIN_PASSWORD。");
  }
  if (config.isProd && config.wechatMock) {
    console.warn("  [WARN] 生产环境开启了模拟微信登录，请接入真实微信授权后关闭 WECHAT_MOCK。");
  }
  console.log("");
});

function shutdown() {
  clearInterval(cleanupTimer);
  server.close(() => {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
