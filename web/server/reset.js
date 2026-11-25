/* 清空本地数据库并重新写入种子数据。仅用于开发环境。 */
const fs = require("node:fs");
const path = require("node:path");
const config = require("./src/config");

if (process.env.NODE_ENV === "production") {
  console.error("生产环境禁止执行 reset。");
  process.exit(1);
}

for (const suffix of ["", "-wal", "-shm"]) {
  const file = config.dbPath + suffix;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log("deleted", file);
  }
}
require("./src/db");
console.log("database reset & seeded:", config.dbPath);
