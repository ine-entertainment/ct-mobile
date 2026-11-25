# Web 后端与运营后台说明（v1.0）

> 本文对应 2026-11-24 的本地全栈演示版本。它把原来的静态交互原型接到了真实后端，并新增了运营后台。
>
> 入口：`http://127.0.0.1:3000` · 后台：`http://127.0.0.1:3000/admin`

---

## 1. 目标与边界

### 已实现

- 手机号登录：固定验证码，本地演示不需要真实短信。
- 微信登录：使用模拟授权码，保留与真实 `code2session` 对接的位置。
- 同一账号最多绑定一个手机号、一个微信。
- 绑定冲突检测与账号合并：订单、收藏、点赞、登录身份一起迁移。
- 商品、分尺码库存、订单、押金、摄影预约、社区内容、用户管理。
- 用户端下单会真实扣减库存、生成订单与押金记录。
- 运营后台可改库存、推进订单状态、退押金、管理用户/供给/内容。
- 用户端所有页面数据来自 API，刷新后仍保留。
- 局域网真机访问：`0.0.0.0:3000`。

### 暂未实现 / 仍是模拟

| 项 | 现状 | 上线前需要 |
| --- | --- | --- |
| 短信 | 固定验证码 `123456`，接口返回 `devCode` | 接入阿里云/腾讯云短信，删除固定码与返回值 |
| 微信登录 | 授权码直接当 openid 使用 | 小程序 `wx.login` + `code2session`，Web 扫码登录需开放平台配置 |
| 支付 | 页面点“确认支付”直接创建已支付订单 | 微信支付统一下单、支付回调、退款接口、幂等处理 |
| 押金 | 数据库记账，后台手动退押 | 微信押金/预授权、退款回调、对账 |
| 物流 | 订单状态与运单号占位 | 顺丰同城/快递 API、轨迹回填 |
| 图片 | 本地 `public/assets/img` 演示图 | OSS/COS + CDN、后台上传 |
| 摄影档期 | 前端生成未来 4 个时段，服务端校验非空 | 摄影师日历、可约时段、冲突锁定 |
| 妆造预约 | 前台点击仍是提示 | 妆造师档期与预约单 |
| 发票/合同 | 未做 | 按经营主体补充 |

---

## 2. 技术栈与目录

- **Node.js 22.5+**（使用内置 `node:sqlite`，无需安装原生 SQLite 依赖）
- Express 4
- 原生 HTML/CSS/JS 前端与后台，无打包步骤
- 数据文件：`server/data/cloth-travel.db`（WAL 模式）

```text
ClothTravel/
├─ public/                 用户端（原视觉与页面）
│  ├─ index.html
│  ├─ app.js               API 客户端、登录、下单、账号安全
│  ├─ styles.css
│  └─ assets/img/
├─ admin/                  运营后台
│  ├─ index.html
│  ├─ admin.css
│  └─ admin.js
├─ server/
│  ├─ index.js             Express 入口、静态托管、局域网监听
│  ├─ schema.sql           SQLite 表结构
│  ├─ reset.js             重建演示数据库
│  └─ src/
│     ├─ db.js / seed.js / seed-data.json
│     ├─ auth.js           会话、中间件、管理员鉴权
│     ├─ orderLogic.js     状态、时间线、价格/配送计算
│     ├─ orderService.js   下单、库存、订单状态服务
│     ├─ mappers.js        DB → API 字段
│     ├─ util.js
│     └─ routes/
│        ├─ auth.js
│        ├─ catalog.js
│        ├─ orders.js
│        └─ admin.js
└─ docs/
```

---

## 3. 启动与重置

```bash
cd server
npm install
npm start        # 或 npm run dev（--watch）
```

启动日志会打印本机、局域网地址、默认管理员和测试手机号。

```bash
cd server
npm run reset    # 删除 data/*.db 并重新写入演示数据
```

> 先停止正在运行的服务再执行 reset，避免 Windows 文件占用。`reset` 在 `NODE_ENV=production` 下会拒绝执行。

### 管理员账号

首次建库时读取：

- `ADMIN_USER`（默认 `admin`）
- `ADMIN_PASSWORD`（默认 `admin123`）

已有数据库不会因修改环境变量自动改密码；上线前请在后台“管理员”中重置，或删除库重建。

---

## 4. 数据模型

| 表 | 作用 |
| --- | --- |
| `users` | 用户资料、地址、会员、免押额度、状态 |
| `identities` | 登录身份：`phone` / `wechat`，`UNIQUE(type, value)` 保证一个身份只能属于一个账号 |
| `customer_sessions` | 用户会话，存 token 的 SHA-256，不存明文 |
| `admin_users` / `admin_sessions` | 管理员与后台会话，和用户会话完全隔离 |
| `auth_codes` | 手机验证码、过期时间、尝试次数 |
| `merge_tickets` | 绑定冲突后 10 分钟内有效的合并凭证 |
| `account_merges` | 合并审计：保留谁、迁移了哪些身份/订单/收藏 |
| `products` / `product_skus` | 商品与分尺码库存（总库存、可租库存） |
| `orders` | 租衣/摄影订单、状态、时间线、地址、金额、库存释放标记 |
| `deposits` | 租衣押金：冻结/已退/部分扣除 |
| `photographers` | 摄影师与套餐 |
| `makeup_artists` | 妆造师 |
| `posts` / `post_likes` | 社区内容与点赞 |
| `favorites` | 收藏 |
| `audit_logs` | 后台操作留痕 |

### 关键一致性规则

- 一个用户最多一个手机号身份、一个微信身份（由绑定接口校验）。
- 订单金额全部由服务端根据商品/套餐重新计算，不信任前端传的金额。
- 下单在事务内校验并扣减 `stock_available`，避免超卖。
- 取消/退款/完成订单时释放库存，`stock_released` 防止重复释放。
- 押金在租衣下单时生成 `held`；后台退押后写 `refunded` 或 `deducted`。

---

## 5. 登录、绑定与合并

### 5.1 手机号登录

1. `POST /api/auth/phone/send-code` 生成固定验证码（演示）。
2. `POST /api/auth/phone/login`：验证码通过后：
   - 已有手机号身份 → 登录该用户；
   - 没有 → 创建新用户 + 手机号身份。
3. 返回 Bearer token，前端保存在 `localStorage`。

开发环境即使没有先调发送验证码，也接受固定码 `123456`（生产环境关闭）。

### 5.2 微信登录（模拟）

`POST /api/auth/wechat/login`，body `{ code }`：

- 当前实现直接把 `code` 当作稳定 openid（仅本地演示）。
- 已存在 → 登录；不存在 → 创建微信用户。
- 接真实微信时，把 `code` 换成 `code2session` 返回的 `openid/unionid`，其余身份映射逻辑不变。

种子数据：

- `wx-demo-2` 属于阿梨（同时有手机号 `13800000002`）。
- `wx-demo-3` 属于小满（仅微信，用来测试绑定手机号）。

### 5.3 绑定

`POST /api/auth/bind`，`type=phone|wechat`：

- 当前账号没有该类型身份 → 校验手机验证码/微信授权码：
  - 身份空闲：直接绑定；
  - 身份属于当前账号：提示已绑定；
  - 身份属于其他账号：返回 `409 identity_conflict`，附带：
    - `ticketId`
    - `current` / `target` 两个账号摘要（昵称、脱敏身份、订单数）
- 当前账号已有该类型身份 → `409 identity_type_exists`，要求先解绑。
- 合并凭证 10 分钟有效、一次性使用。

### 5.4 合并

`POST /api/auth/merge/confirm`，body `{ ticketId, keep: "current" | "target" }`：

1. 校验凭证属于当前登录用户且未过期。
2. 逐个迁移对方账号的登录身份：
   - 保留账号没有该类型 → 迁移；
   - 已有同类型（例如双方都有手机号）→ 丢弃对方该身份。
3. 迁移订单、押金、收藏、点赞。
4. 保留账号缺少地址时，继承被合并账号地址。
5. 删除被合并账号；记录 `account_merges`。
6. 注销双方旧会话，返回新 token，前端无缝替换。

### 5.5 解绑

`DELETE /api/auth/identities/:type`：

- 必须至少保留一种登录方式。
- 运营后台也可解绑用户身份，同样受此限制并记审计日志。

---

## 6. 主要 API

统一前缀 `/api`。需要登录的接口带：

```http
Authorization: Bearer <token>
```

### 用户端

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/auth/phone/send-code` | 发送验证码（演示固定 123456） |
| POST | `/auth/phone/login` | 手机号登录/注册 |
| POST | `/auth/wechat/login` | 微信登录（模拟） |
| GET | `/auth/me` | 当前用户与统计 |
| POST | `/auth/logout` | 退出 |
| POST | `/auth/bind` | 绑定手机/微信，冲突时返回合并凭证 |
| POST | `/auth/merge/confirm` | 确认合并并换新 token |
| DELETE | `/auth/identities/:type` | 解绑身份 |
| PATCH | `/users/me` | 改昵称、身材、地址 |
| GET | `/products` | 商品列表（支持 `style`/`q`） |
| GET | `/products/:id` | 商品详情与库存 |
| GET | `/photographers` / `/photographers/:id` | 摄影师 |
| GET | `/makeup` | 妆造师 |
| GET | `/posts` | 社区内容（带 token 时返回点赞状态） |
| POST | `/posts/:id/like` | 点赞/取消 |
| GET | `/favorites` | 收藏列表 |
| POST | `/favorites/:productId/toggle` | 收藏/取消 |
| GET | `/cities` | 城市与真实计数 |
| GET | `/config` | 演示配置 |
| GET | `/orders` | 我的订单 |
| GET | `/orders/:id` | 订单详情 |
| POST | `/orders/rental` | 创建租衣订单 |
| POST | `/orders/photo` | 创建摄影订单（定金） |
| POST | `/orders/:id/refund` | 申请退款 |
| POST | `/orders/:id/return` | 预约归还 |
| POST | `/orders/:id/reschedule` | 摄影改期 |
| GET | `/health` | 健康检查 |

### 运营后台

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/admin/auth/login` | 管理员登录 |
| GET | `/admin/dashboard` | 统计、趋势、最近订单、库存预警 |
| GET/PATCH | `/admin/users` / `/admin/users/:id` | 用户列表/详情/编辑 |
| DELETE | `/admin/users/:id/identities/:identityId` | 解绑用户身份 |
| GET/POST/PATCH/DELETE | `/admin/products...` | 商品与 SKU 库存 |
| GET/PATCH | `/admin/orders` / `/admin/orders/:id/status` | 订单与状态推进 |
| GET/POST | `/admin/deposits` / `/admin/deposits/:id/refund` | 押金与退款 |
| GET/POST/PATCH | `/admin/photographers...` | 摄影师 |
| GET/POST/PATCH | `/admin/makeup...` | 妆造师 |
| GET/POST/PATCH/DELETE | `/admin/posts...` | 社区内容 |
| GET | `/admin/logs` | 审计日志 |
| GET/POST/PATCH | `/admin/admins...` | 管理员（仅超级管理员） |

---

## 7. 运营后台模块

- **仪表盘**：用户/订单/实收/冻结押金/待处理/在租商品，近 7 天订单柱状图、订单状态、库存预警、热租商品。
- **订单管理**：筛选、详情、时间线、推进状态、内部备注；订单取消/退款自动释放库存并退押。
- **摄影预约**：只筛摄影订单，确认、拍摄、选片、交付。
- **押金管理**：冻结、已退、部分退回、扣损汇总；支持部分退款和备注。
- **商品与库存**：新增/编辑商品、分尺码库存、上下架；库存不能低于未归还数量。
- **用户管理**：搜索、身份、订单与消费、编辑资料/状态、解绑身份。
- **摄影师 / 妆造师 / 社区内容**：增删改与上下架。
- **操作日志**：记录管理员、动作、对象、变更细节。
- **管理员**：仅超级管理员可新增、停用、重置密码。

后台和用户端使用不同表、不同 token、不同中间件；普通用户 token 无法访问 `/api/admin/*`。

---

## 8. 真机联调

1. 手机和电脑连同一 Wi-Fi。
2. 启动服务，记下日志中的 `局域网访问 http://192.168.x.x:3000`。
3. 手机浏览器打开该地址。
4. 如果打不开：
   - Windows 防火墙放行 Node 或 3000 端口；
   - 确认没有把服务绑定在 `127.0.0.1`（本项目默认 `0.0.0.0`）；
   - 部分路由器开启了 AP 隔离，关闭后再试。

后台在手机上同样可访问：`/admin`。

---

## 9. 部署注意事项

当前 `wrangler.toml` 仍只把 `public/` 作为 Cloudflare Static Assets 部署。它**不能**运行 `server/` 的 Express + SQLite，因此线上静态部署只能看到登录页。

可选路线：

1. **最快上线**：把 `server/` 部署到支持 Node 的云主机/容器（需持久磁盘放 SQLite），前面加 HTTPS 反向代理；Cloudflare 只做 DNS/CDN。
2. **Serverless 化**：迁移到 Cloudflare Workers + D1 + R2，重写数据访问层和会话/文件逻辑；这需要单独开发，不是简单改配置。
3. **混合**：静态前端留在 Cloudflare，API 部署到独立域名，并在 `public/app.js` 的 `API_BASE` 和 CORS 上调整。

SQLite 适合当前演示与小规模单机；并发上来后建议切 PostgreSQL/MySQL，并保持现有表结构语义。

---

## 10. 安全与上线清单

- [ ] 删除固定验证码与 `devCode` 返回。
- [ ] 接入真实短信服务，限制发送频率和验证码尝试次数。
- [ ] 接入真实微信登录，校验 `state`、code 一次性、unionid 映射。
- [ ] 微信支付回调签名校验、金额校验、幂等与补单。
- [ ] 修改默认管理员密码，启用 HTTPS，限制后台访问来源。
- [ ] 图片迁 OSS/CDN，限制上传类型与大小。
- [ ] 备份数据库；SQLite 至少开启定时备份与 WAL checkpoint。
- [ ] 补充隐私政策、用户协议、租赁协议与押金损赔规则。
- [ ] 压测下单库存事务与并发退款。
- [ ] 将演示图片替换为有授权的真实素材。
