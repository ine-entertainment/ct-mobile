const express = require("express");
const config = require("../config");
const { all, get, run, transaction } = require("../db");
const {
  requireAdmin,
  requireSuperAdmin,
  createAdminSession,
  deleteAdminSession,
  adminPayload,
} = require("../auth");
const {
  nowIso,
  randomId,
  hashPassword,
  verifyPassword,
  text,
  toInt,
  clamp,
  maskPhone,
  maskOpenid,
} = require("../util");
const { RENTAL_STATUS, PHOTO_STATUS, statusOptions } = require("../orderLogic");
const {
  mapAdmin,
  mapDeposit,
  mapMakeup,
  mapOrder,
  mapPhotographer,
  mapPost,
  mapProduct,
  mapUser,
} = require("../mappers");
const {
  getOrderRow,
  getDepositForOrder,
  releaseOrderStock,
  updateOrderStatus,
} = require("../orderService");

const router = express.Router();

/* ---------------------------------------------------------
   工具
   --------------------------------------------------------- */
function audit(req, action, entity, entityId, detail = {}) {
  try {
    run(
      `INSERT INTO audit_logs (id, admin_id, admin_name, action, entity, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomId("log"),
        req.admin ? req.admin.id : "",
        req.admin ? req.admin.name : "",
        action,
        entity,
        String(entityId || ""),
        JSON.stringify(detail),
        nowIso(),
      ]
    );
  } catch {
    /* 审计失败不影响主流程 */
  }
}

function paging(req) {
  const page = Math.max(1, toInt(req.query.page, 1));
  const pageSize = clamp(toInt(req.query.pageSize, 20), 1, 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function pageResult(items, total, page, pageSize) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function normList(value, max = 60) {
  if (Array.isArray(value)) return value.map((item) => text(item, max)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,，\n]/)
      .map((item) => text(item, max))
      .filter(Boolean);
  }
  return [];
}

function validId(value) {
  return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(String(value || ""));
}

const PRODUCT_FIELDS = [
  ["title", "title", 100],
  ["img", "img", 200],
  ["fit", "fit", 100],
  ["model", "model", 100],
  ["merchant", "merchant", 100],
  ["includes", "includes", 200],
  ["badge", "badge", 100],
  ["city", "city", 40],
  ["status", "status", 20],
];

function loadSkus(productId) {
  return all("SELECT * FROM product_skus WHERE product_id = ? ORDER BY rowid ASC", [productId]);
}

function productWithSkus(row) {
  return row ? mapProduct(row, loadSkus(row.id)) : null;
}

function userRowWithIdentities(row, includeValues = false) {
  if (!row) return null;
  const identities = all("SELECT * FROM identities WHERE user_id = ? ORDER BY created_at ASC", [row.id]);
  const user = mapUser(row, identities);
  if (includeValues) {
    user.identities = identities.map((identity) => ({
      id: identity.id,
      type: identity.type,
      typeLabel: identity.type === "phone" ? "手机号" : "微信",
      value: identity.value,
      valueMasked: identity.type === "phone" ? maskPhone(identity.value) : maskOpenid(identity.value),
      nickname: identity.nickname,
      createdAt: identity.created_at,
      lastLoginAt: identity.last_login_at,
    }));
    user.phone = identities.find((i) => i.type === "phone")?.value || "";
    user.wechat = identities.find((i) => i.type === "wechat")?.value || "";
  }
  user.orderCount = get("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", [row.id]).n;
  user.spend = get("SELECT COALESCE(SUM(paid), 0) AS n FROM orders WHERE user_id = ?", [row.id]).n;
  return user;
}

/* ---------------------------------------------------------
   管理员登录
   --------------------------------------------------------- */
const loginBuckets = new Map();
function loginAllowed(key) {
  const now = Date.now();
  const bucket = (loginBuckets.get(key) || []).filter((t) => now - t < 10 * 60e3);
  if (bucket.length >= 8) return false;
  bucket.push(now);
  loginBuckets.set(key, bucket);
  return true;
}

router.post("/auth/login", (req, res) => {
  const username = text(req.body.username, 40);
  const password = text(req.body.password, 100);
  const key = `${username}|${req.ip || ""}`;
  if (!loginAllowed(key)) {
    return res.status(429).json({ error: "too_many_requests", message: "尝试次数过多，请 10 分钟后再试" });
  }
  if (!username || !password) {
    return res.status(400).json({ error: "invalid_credentials", message: "请输入管理员账号和密码" });
  }
  const admin = get("SELECT * FROM admin_users WHERE username = ?", [username]);
  if (!admin || admin.status !== "active" || !verifyPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials", message: "账号或密码不正确" });
  }
  run("UPDATE admin_users SET last_login_at = ? WHERE id = ?", [nowIso(), admin.id]);
  const token = createAdminSession(admin.id);
  res.json({ token, admin: adminPayload(admin) });
});

router.get("/auth/me", requireAdmin, (req, res) => {
  res.json({ admin: adminPayload(req.admin) });
});

router.post("/auth/logout", requireAdmin, (req, res) => {
  deleteAdminSession(req.adminToken);
  res.json({ ok: true });
});

/* 以下全部需要管理员登录 */
router.use(requireAdmin);

/* ---------------------------------------------------------
   仪表盘
   --------------------------------------------------------- */
router.get("/dashboard", (req, res) => {
  const stats = {
    users: get("SELECT COUNT(*) AS n FROM users WHERE status = 'active'").n,
    usersToday: get("SELECT COUNT(*) AS n FROM users WHERE substr(created_at, 1, 10) = date('now')").n,
    products: get("SELECT COUNT(*) AS n FROM products WHERE status = 'active'").n,
    orders: get("SELECT COUNT(*) AS n FROM orders").n,
    rentalOrders: get("SELECT COUNT(*) AS n FROM orders WHERE type = 'rental'").n,
    photoOrders: get("SELECT COUNT(*) AS n FROM orders WHERE type = 'photo'").n,
    revenue: get("SELECT COALESCE(SUM(paid), 0) AS n FROM orders").n,
    revenueToday: get(
      "SELECT COALESCE(SUM(paid), 0) AS n FROM orders WHERE substr(created_at, 1, 10) = date('now')"
    ).n,
    depositsHeld: get("SELECT COALESCE(SUM(amount), 0) AS n FROM deposits WHERE status = 'held'").n,
    depositsHeldCount: get("SELECT COUNT(*) AS n FROM deposits WHERE status = 'held'").n,
    pending: get(
      "SELECT COUNT(*) AS n FROM orders WHERE status IN ('paid','refund_requested','deposit_paid')"
    ).n,
  };

  const recentRows = all(
    `SELECT o.*, u.nickname AS user_name, d.status AS deposit_status, d.refunded_amount AS deposit_refunded
       FROM orders o JOIN users u ON u.id = o.user_id
       LEFT JOIN deposits d ON d.order_id = o.id
      ORDER BY o.created_at DESC LIMIT 8`
  );
  const recentOrders = recentRows.map((row) =>
    mapOrder(row, {
      userName: row.user_name,
      depositStatus: row.deposit_status,
      depositRefundedAmount: row.deposit_refunded,
    })
  );

  const trendRows = all(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS orders, COALESCE(SUM(paid), 0) AS revenue
       FROM orders
      WHERE created_at >= datetime('now', '-6 days')
      GROUP BY substr(created_at, 1, 10)
      ORDER BY day ASC`
  );

  const statusRows = all("SELECT type, status, COUNT(*) AS n FROM orders GROUP BY type, status ORDER BY n DESC");

  const topProducts = all(
    `SELECT o.product_id AS id, o.title, o.image, COUNT(*) AS orders, COALESCE(SUM(o.paid), 0) AS revenue
       FROM orders o WHERE o.type = 'rental' AND o.product_id IS NOT NULL
      GROUP BY o.product_id ORDER BY orders DESC LIMIT 5`
  );

  const lowStock = all(
    `SELECT p.id AS product_id, p.title, s.size, s.stock_available, s.stock_total
       FROM product_skus s JOIN products p ON p.id = s.product_id
      WHERE p.status = 'active' AND s.stock_available <= 1
      ORDER BY s.stock_available ASC, p.title ASC LIMIT 8`
  );

  res.json({
    stats,
    recentOrders,
    trend: trendRows,
    statusBreakdown: statusRows.map((row) => ({
      ...row,
      label: row.type === "photo" ? PHOTO_STATUS[row.status] || row.status : RENTAL_STATUS[row.status] || row.status,
    })),
    topProducts,
    lowStock,
  });
});

/* ---------------------------------------------------------
   用户
   --------------------------------------------------------- */
router.get("/users", (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  if (req.query.status) {
    where.push("u.status = ?");
    params.push(text(req.query.status, 20));
  }
  if (req.query.q) {
    const q = `%${text(req.query.q, 60)}%`;
    where.push(
      `(u.nickname LIKE ? OR u.id LIKE ? OR EXISTS (
        SELECT 1 FROM identities i WHERE i.user_id = u.id AND i.value LIKE ?
      ))`
    );
    params.push(q, q, q);
  }
  const total = get(`SELECT COUNT(*) AS n FROM users u WHERE ${where.join(" AND ")}`, params).n;
  const rows = all(
    `SELECT u.* FROM users u WHERE ${where.join(" AND ")} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const items = rows.map((row) => {
    const user = mapUser(row, all("SELECT * FROM identities WHERE user_id = ?", [row.id]));
    user.orderCount = get("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", [row.id]).n;
    user.spend = get("SELECT COALESCE(SUM(paid), 0) AS n FROM orders WHERE user_id = ?", [row.id]).n;
    return user;
  });
  res.json(pageResult(items, total, page, pageSize));
});

router.get("/users/:id", (req, res) => {
  const row = get("SELECT * FROM users WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "用户不存在" });
  const user = userRowWithIdentities(row, true);
  const orders = all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [row.id]).map(
    (order) =>
      mapOrder(order, {
        depositStatus: getDepositForOrder(order.id)?.status || null,
        depositRefundedAmount: getDepositForOrder(order.id)?.refunded_amount || 0,
      })
  );
  const deposits = all("SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC", [row.id]).map((rowDep) =>
    mapDeposit(rowDep)
  );
  res.json({ user, orders, deposits });
});

router.patch("/users/:id", (req, res) => {
  const row = get("SELECT * FROM users WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "用户不存在" });
  const body = req.body || {};
  const fields = [];
  const values = [];
  const stringFields = [
    ["nickname", "nickname", 40],
    ["avatar", "avatar", 120],
    ["realName", "real_name", 40],
    ["gender", "gender", 10],
    ["size", "size", 10],
    ["city", "city", 40],
    ["memberLevel", "member_level", 40],
    ["addressName", "address_name", 40],
    ["addressPhone", "address_phone", 20],
    ["addressText", "address_text", 200],
    ["status", "status", 20],
  ];
  for (const [key, column, max] of stringFields) {
    if (body[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(text(body[key], max));
    }
  }
  for (const [key, column] of [
    ["height", "height"],
    ["weight", "weight"],
    ["depositCredit", "deposit_credit"],
  ]) {
    if (body[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(toInt(body[key], 0) || null);
    }
  }
  if (!fields.length) return res.status(400).json({ error: "nothing_to_update", message: "没有可更新字段" });
  fields.push("updated_at = ?");
  values.push(nowIso());
  values.push(row.id);
  run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  audit(req, "user.update", "user", row.id, { fields: Object.keys(body) });
  res.json({ ok: true, user: userRowWithIdentities(get("SELECT * FROM users WHERE id = ?", [row.id]), true) });
});

router.delete("/users/:id/identities/:identityId", (req, res) => {
  const user = get("SELECT * FROM users WHERE id = ?", [text(req.params.id, 80)]);
  if (!user) return res.status(404).json({ error: "not_found", message: "用户不存在" });
  const identities = all("SELECT * FROM identities WHERE user_id = ?", [user.id]);
  if (identities.length <= 1) {
    return res.status(409).json({ error: "last_identity", message: "至少保留一种登录方式" });
  }
  const identity = identities.find((row) => row.id === req.params.identityId);
  if (!identity) return res.status(404).json({ error: "not_found", message: "身份不存在" });
  run("DELETE FROM identities WHERE id = ?", [identity.id]);
  audit(req, "user.identity.delete", "user", user.id, { type: identity.type });
  res.json({ ok: true, user: userRowWithIdentities(get("SELECT * FROM users WHERE id = ?", [user.id]), true) });
});

/* ---------------------------------------------------------
   商品 / 库存
   --------------------------------------------------------- */
router.get("/products", (req, res) => {
  const where = ["1=1"];
  const params = [];
  if (req.query.q) {
    const q = `%${text(req.query.q, 60)}%`;
    where.push("(title LIKE ? OR merchant LIKE ? OR id LIKE ?)");
    params.push(q, q, q);
  }
  if (req.query.status) {
    where.push("status = ?");
    params.push(text(req.query.status, 20));
  }
  const rows = all(`SELECT * FROM products WHERE ${where.join(" AND ")} ORDER BY sort_order ASC, created_at ASC`, params);
  res.json({ items: rows.map(productWithSkus) });
});

router.get("/products/:id", (req, res) => {
  const row = get("SELECT * FROM products WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "商品不存在" });
  res.json({ product: productWithSkus(row) });
});

function readProductBody(body) {
  const title = text(body.title, 100);
  const img = text(body.img, 200);
  if (!title) throw Object.assign(new Error("请填写商品名称"), { status: 400, code: "invalid_title" });
  if (!img) throw Object.assign(new Error("请填写商品主图"), { status: 400, code: "invalid_image" });
  const price = Math.max(0, toInt(body.price, 0));
  const deposit = Math.max(0, toInt(body.deposit, 0));
  const sizes = [...new Set(normList(body.sizes, 10))];
  return {
    title,
    price,
    deposit,
    rating: clamp(Number(body.rating) || 4.8, 0, 5),
    reviews: Math.max(0, toInt(body.reviews, 0)),
    img,
    gallery: normList(body.gallery, 200),
    styles: normList(body.styles, 20),
    badge: text(body.badge, 100),
    sizes: sizes.length ? sizes : ["S", "M", "L"],
    fit: text(body.fit, 100),
    model: text(body.model, 100),
    merchant: text(body.merchant, 100),
    includes: text(body.includes, 200),
    real: normList(body.real, 200),
    city: text(body.city, 40) || "三亚",
    status: ["active", "offline"].includes(body.status) ? body.status : "active",
    sortOrder: toInt(body.sortOrder, 0),
    stockBySize: body.stockBySize && typeof body.stockBySize === "object" ? body.stockBySize : {},
  };
}

router.post("/products", (req, res, next) => {
  try {
    const data = readProductBody(req.body || {});
    let id = text(req.body.id, 40).toLowerCase();
    if (id && !validId(id)) {
      return res.status(400).json({ error: "invalid_id", message: "商品 ID 只能包含小写字母、数字、- 和 _" });
    }
    if (!id) id = randomId("p").toLowerCase();
    if (get("SELECT 1 AS x FROM products WHERE id = ?", [id])) {
      return res.status(409).json({ error: "id_exists", message: "商品 ID 已存在" });
    }
    const now = nowIso();
    const maxSort = get("SELECT COALESCE(MAX(sort_order), -1) AS n FROM products").n;
    transaction(() => {
      run(
        `INSERT INTO products
          (id, title, price, deposit, rating, reviews, img, gallery, styles, badge, sizes, fit, model,
           merchant, includes, real, city, status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.title,
          data.price,
          data.deposit,
          data.rating,
          data.reviews,
          data.img,
          JSON.stringify(data.gallery),
          JSON.stringify(data.styles),
          data.badge,
          JSON.stringify(data.sizes),
          data.fit,
          data.model,
          data.merchant,
          data.includes,
          JSON.stringify(data.real),
          data.city,
          data.status,
          req.body.sortOrder !== undefined ? data.sortOrder : maxSort + 1,
          now,
          now,
        ]
      );
      data.sizes.forEach((size, index) => {
        const total = Math.max(0, toInt(data.stockBySize[size], index === 0 ? 5 : index === 1 ? 4 : 3));
        run(
          `INSERT INTO product_skus (id, product_id, size, stock_total, stock_available)
           VALUES (?, ?, ?, ?, ?)`,
          [randomId("sku"), id, size, total, total]
        );
      });
    });
    audit(req, "product.create", "product", id, { title: data.title });
    res.status(201).json({ ok: true, product: productWithSkus(get("SELECT * FROM products WHERE id = ?", [id])) });
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:id", (req, res, next) => {
  try {
    const row = get("SELECT * FROM products WHERE id = ?", [text(req.params.id, 80)]);
    if (!row) return res.status(404).json({ error: "not_found", message: "商品不存在" });
    const body = req.body || {};
    const data = {
      title: body.title !== undefined ? text(body.title, 100) : row.title,
      price: body.price !== undefined ? Math.max(0, toInt(body.price, row.price)) : row.price,
      deposit: body.deposit !== undefined ? Math.max(0, toInt(body.deposit, row.deposit)) : row.deposit,
      rating: body.rating !== undefined ? clamp(Number(body.rating) || 0, 0, 5) : row.rating,
      reviews: body.reviews !== undefined ? Math.max(0, toInt(body.reviews, row.reviews)) : row.reviews,
      img: body.img !== undefined ? text(body.img, 200) : row.img,
      gallery: body.gallery !== undefined ? normList(body.gallery, 200) : JSON.parse(row.gallery),
      styles: body.styles !== undefined ? normList(body.styles, 20) : JSON.parse(row.styles),
      badge: body.badge !== undefined ? text(body.badge, 100) : row.badge,
      sizes: body.sizes !== undefined ? [...new Set(normList(body.sizes, 10))] : JSON.parse(row.sizes),
      fit: body.fit !== undefined ? text(body.fit, 100) : row.fit,
      model: body.model !== undefined ? text(body.model, 100) : row.model,
      merchant: body.merchant !== undefined ? text(body.merchant, 100) : row.merchant,
      includes: body.includes !== undefined ? text(body.includes, 200) : row.includes,
      real: body.real !== undefined ? normList(body.real, 200) : JSON.parse(row.real),
      city: body.city !== undefined ? text(body.city, 40) : row.city,
      status: body.status !== undefined && ["active", "offline"].includes(body.status) ? body.status : row.status,
      sortOrder: body.sortOrder !== undefined ? toInt(body.sortOrder, row.sort_order) : row.sort_order,
      stockBySize: body.stockBySize && typeof body.stockBySize === "object" ? body.stockBySize : {},
    };
    if (!data.title) return res.status(400).json({ error: "invalid_title", message: "商品名称不能为空" });
    if (!data.img) return res.status(400).json({ error: "invalid_image", message: "商品主图不能为空" });
    if (!data.sizes.length) return res.status(400).json({ error: "invalid_sizes", message: "至少保留一个尺码" });

    const existingSkus = loadSkus(row.id);
    const removed = existingSkus.filter((sku) => !data.sizes.includes(sku.size));
    for (const sku of removed) {
      const booked = sku.stock_total - sku.stock_available;
      if (booked > 0) {
        return res
          .status(409)
          .json({ error: "sku_in_use", message: `尺码 ${sku.size} 还有 ${booked} 件未归还，不能删除` });
      }
    }
    for (const size of data.sizes) {
      const sku = existingSkus.find((item) => item.size === size);
      const requestedTotal = data.stockBySize[size] !== undefined ? toInt(data.stockBySize[size], 0) : undefined;
      if (sku && requestedTotal !== undefined) {
        const booked = sku.stock_total - sku.stock_available;
        if (requestedTotal < booked) {
          return res.status(409).json({
            error: "stock_too_low",
            message: `尺码 ${size} 至少需要保留 ${booked} 件库存（未归还订单）`,
          });
        }
      }
    }

    transaction(() => {
      run(
        `UPDATE products SET title = ?, price = ?, deposit = ?, rating = ?, reviews = ?, img = ?, gallery = ?,
          styles = ?, badge = ?, sizes = ?, fit = ?, model = ?, merchant = ?, includes = ?, real = ?,
          city = ?, status = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
        [
          data.title,
          data.price,
          data.deposit,
          data.rating,
          data.reviews,
          data.img,
          JSON.stringify(data.gallery),
          JSON.stringify(data.styles),
          data.badge,
          JSON.stringify(data.sizes),
          data.fit,
          data.model,
          data.merchant,
          data.includes,
          JSON.stringify(data.real),
          data.city,
          data.status,
          data.sortOrder,
          nowIso(),
          row.id,
        ]
      );

      for (const sku of removed) run("DELETE FROM product_skus WHERE id = ?", [sku.id]);
      data.sizes.forEach((size, index) => {
        const sku = existingSkus.find((item) => item.size === size);
        const requestedTotal = data.stockBySize[size] !== undefined ? toInt(data.stockBySize[size], 0) : undefined;
        if (!sku) {
          const total = Math.max(0, requestedTotal !== undefined ? requestedTotal : index === 0 ? 5 : 4);
          run(
            `INSERT INTO product_skus (id, product_id, size, stock_total, stock_available)
             VALUES (?, ?, ?, ?, ?)`,
            [randomId("sku"), row.id, size, total, total]
          );
        } else if (requestedTotal !== undefined) {
          const booked = sku.stock_total - sku.stock_available;
          const available = requestedTotal - booked;
          run("UPDATE product_skus SET stock_total = ?, stock_available = ? WHERE id = ?", [
            requestedTotal,
            available,
            sku.id,
          ]);
        }
      });
    });

    audit(req, "product.update", "product", row.id, { fields: Object.keys(body) });
    res.json({ ok: true, product: productWithSkus(get("SELECT * FROM products WHERE id = ?", [row.id])) });
  } catch (error) {
    next(error);
  }
});

router.delete("/products/:id", (req, res) => {
  const row = get("SELECT * FROM products WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "商品不存在" });
  const orderCount = get("SELECT COUNT(*) AS n FROM orders WHERE product_id = ?", [row.id]).n;
  if (orderCount > 0) {
    run("UPDATE products SET status = 'offline', updated_at = ? WHERE id = ?", [nowIso(), row.id]);
    audit(req, "product.offline", "product", row.id, { reason: "存在历史订单" });
    return res.json({ ok: true, offline: true, message: "商品存在历史订单，已改为下架" });
  }
  run("DELETE FROM products WHERE id = ?", [row.id]);
  audit(req, "product.delete", "product", row.id, { title: row.title });
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   订单
   --------------------------------------------------------- */
router.get("/orders", (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  if (req.query.type && ["rental", "photo"].includes(req.query.type)) {
    where.push("o.type = ?");
    params.push(req.query.type);
  }
  if (req.query.status) {
    where.push("o.status = ?");
    params.push(text(req.query.status, 30));
  }
  if (req.query.q) {
    const q = `%${text(req.query.q, 60)}%`;
    where.push("(o.order_no LIKE ? OR o.title LIKE ? OR u.nickname LIKE ? OR o.id LIKE ?)");
    params.push(q, q, q, q);
  }
  if (req.query.date) {
    where.push("substr(o.created_at, 1, 10) = ?");
    params.push(text(req.query.date, 20));
  }
  const total = get(
    `SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.user_id WHERE ${where.join(" AND ")}`,
    params
  ).n;
  const rows = all(
    `SELECT o.*, u.nickname AS user_name, d.status AS deposit_status, d.refunded_amount AS deposit_refunded
       FROM orders o JOIN users u ON u.id = o.user_id
       LEFT JOIN deposits d ON d.order_id = o.id
      WHERE ${where.join(" AND ")}
      ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json(
    pageResult(
      rows.map((row) =>
        mapOrder(row, {
          userName: row.user_name,
          depositStatus: row.deposit_status,
          depositRefundedAmount: row.deposit_refunded,
        })
      ),
      total,
      page,
      pageSize
    )
  );
});

router.get("/orders/:id", (req, res) => {
  const row = get("SELECT * FROM orders WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "订单不存在" });
  const deposit = getDepositForOrder(row.id);
  const user = get("SELECT * FROM users WHERE id = ?", [row.user_id]);
  res.json({
    order: mapOrder(row, {
      userName: user ? user.nickname : "",
      depositStatus: deposit ? deposit.status : null,
      depositRefundedAmount: deposit ? deposit.refunded_amount : 0,
    }),
    user: user ? userRowWithIdentities(user, true) : null,
    deposit: deposit ? mapDeposit(deposit, { orderNo: row.order_no, userName: user?.nickname }) : null,
    statusOptions: statusOptions(row.type),
  });
});

router.patch("/orders/:id/status", (req, res, next) => {
  try {
    const row = getOrderRow(text(req.params.id, 80));
    if (!row) return res.status(404).json({ error: "not_found", message: "订单不存在" });
    const status = text(req.body.status, 30);
    const allowed = Object.keys(row.type === "photo" ? PHOTO_STATUS : RENTAL_STATUS);
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "invalid_status", message: "订单状态不正确" });
    }
    if (row.status === status) {
      return res.json({ ok: true, order: orderForAdmin(row.id), changed: false });
    }
    if (["completed", "cancelled", "refunded"].includes(row.status)) {
      return res.status(409).json({ error: "final_status", message: "已完成、已取消或已退款订单不能再改状态" });
    }
    updateOrderStatus(row, status, {
      statusSub: req.body.statusSub,
      adminNote: req.body.adminNote !== undefined ? req.body.adminNote : row.admin_note,
    });
    if (row.type === "rental" && ["cancelled", "refunded", "completed"].includes(status)) {
      releaseOrderStock(row);
    }
    if (row.type === "rental" && ["cancelled", "refunded"].includes(status)) {
      const deposit = getDepositForOrder(row.id);
      if (deposit && deposit.status === "held") {
        run(
          `UPDATE deposits SET status = 'refunded', refunded_amount = amount, note = ?, refunded_at = ?, updated_at = ?
            WHERE id = ?`,
          ["订单取消 / 退款，押金自动退回", nowIso(), nowIso(), deposit.id]
        );
      }
    }
    audit(req, "order.status", "order", row.id, { from: row.status, to: status });
    res.json({ ok: true, order: orderForAdmin(row.id) });
  } catch (error) {
    next(error);
  }
});

function orderForAdmin(id) {
  const row = getOrderRow(id);
  if (!row) return null;
  const deposit = getDepositForOrder(id);
  const user = get("SELECT nickname FROM users WHERE id = ?", [row.user_id]);
  return mapOrder(row, {
    userName: user?.nickname || "",
    depositStatus: deposit?.status || null,
    depositRefundedAmount: deposit?.refunded_amount || 0,
  });
}

/* ---------------------------------------------------------
   押金
   --------------------------------------------------------- */
router.get("/deposits", (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  if (req.query.status) {
    where.push("d.status = ?");
    params.push(text(req.query.status, 20));
  }
  if (req.query.q) {
    const q = `%${text(req.query.q, 60)}%`;
    where.push("(o.order_no LIKE ? OR u.nickname LIKE ? OR u.id LIKE ?)");
    params.push(q, q, q);
  }
  const total = get(
    `SELECT COUNT(*) AS n FROM deposits d JOIN users u ON u.id = d.user_id JOIN orders o ON o.id = d.order_id WHERE ${where.join(" AND ")}`,
    params
  ).n;
  const summary = get(
    `SELECT
       COALESCE(SUM(CASE WHEN d.status = 'held' THEN d.amount ELSE 0 END), 0) AS held,
       COALESCE(SUM(CASE WHEN d.status = 'refunded' THEN d.refunded_amount ELSE 0 END), 0) AS refunded,
       COALESCE(SUM(CASE WHEN d.status = 'deducted' THEN d.refunded_amount ELSE 0 END), 0) AS deductedRefunded,
       COALESCE(SUM(CASE WHEN d.status = 'deducted' THEN d.amount - d.refunded_amount ELSE 0 END), 0) AS deducted
     FROM deposits d`
  );
  const rows = all(
    `SELECT d.*, o.order_no, u.nickname AS user_name, u.id AS user_uid,
            (SELECT value FROM identities WHERE user_id = u.id AND type = 'phone' LIMIT 1) AS user_phone
       FROM deposits d JOIN users u ON u.id = d.user_id JOIN orders o ON o.id = d.order_id
      WHERE ${where.join(" AND ")}
      ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const items = rows.map((row) =>
    mapDeposit(row, {
      orderNo: row.order_no,
      userName: row.user_name,
      userPhone: row.user_phone ? maskPhone(row.user_phone) : "",
    })
  );
  res.json({ ...pageResult(items, total, page, pageSize), summary });
});

router.post("/deposits/:id/refund", (req, res) => {
  const deposit = get("SELECT * FROM deposits WHERE id = ?", [text(req.params.id, 80)]);
  if (!deposit) return res.status(404).json({ error: "not_found", message: "押金记录不存在" });
  if (deposit.status !== "held") {
    return res.status(409).json({ error: "already_settled", message: "该押金已处理" });
  }
  const refundAmount =
    req.body.amount === undefined || req.body.amount === "" ? deposit.amount : toInt(req.body.amount, 0);
  if (refundAmount < 0 || refundAmount > deposit.amount) {
    return res.status(400).json({ error: "invalid_amount", message: "退款金额需在 0 到押金金额之间" });
  }
  const note = text(req.body.note, 200);
  const status = refundAmount >= deposit.amount ? "refunded" : "deducted";
  run(
    `UPDATE deposits SET status = ?, refunded_amount = ?, note = ?, refunded_at = ?, updated_at = ? WHERE id = ?`,
    [status, refundAmount, note, nowIso(), nowIso(), deposit.id]
  );
  const order = getOrderRow(deposit.order_id);
  if (order) {
    const extra = status === "refunded" ? "押金已原路退回" : `押金退回 ¥${refundAmount}，其余扣除`;
    run("UPDATE orders SET status_sub = ?, updated_at = ? WHERE id = ?", [
      `${order.status_sub} · ${extra}`,
      nowIso(),
      order.id,
    ]);
  }
  audit(req, "deposit.refund", "deposit", deposit.id, {
    orderId: deposit.order_id,
    refundAmount,
    status,
    note,
  });
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   摄影师 / 妆造师 / 社区
   --------------------------------------------------------- */
router.get("/photographers", (req, res) => {
  const rows = all("SELECT * FROM photographers ORDER BY sort_order ASC, created_at ASC");
  res.json({ items: rows.map(mapPhotographer) });
});

router.post("/photographers", (req, res, next) => {
  try {
    const body = req.body || {};
    const name = text(body.name, 40);
    if (!name) return res.status(400).json({ error: "invalid_name", message: "请填写摄影师名称" });
    const id = text(body.id, 40).toLowerCase() || randomId("ph");
    if (!validId(id)) return res.status(400).json({ error: "invalid_id", message: "摄影师 ID 不合法" });
    if (get("SELECT 1 AS x FROM photographers WHERE id = ?", [id])) {
      return res.status(409).json({ error: "id_exists", message: "摄影师 ID 已存在" });
    }
    const now = nowIso();
    const maxSort = get("SELECT COALESCE(MAX(sort_order), -1) AS n FROM photographers").n;
    run(
      `INSERT INTO photographers
        (id, name, title, avatar, cover, rating, orders_count, price, tags, works, bio,
         package_title, package_desc, package_price, package_deposit, package_includes,
         status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        text(body.title, 60),
        text(body.avatar, 120) || "model-1",
        text(body.cover, 120) || "hero-beach",
        clamp(Number(body.rating) || 4.8, 0, 5),
        Math.max(0, toInt(body.ordersCount, 0)),
        Math.max(0, toInt(body.price, 0)),
        JSON.stringify(normList(body.tags, 20)),
        JSON.stringify(normList(body.works, 200)),
        text(body.bio, 300),
        text(body.packageTitle, 80),
        text(body.packageDesc, 200),
        Math.max(0, toInt(body.packagePrice, 0)),
        Math.max(0, toInt(body.packageDeposit, 0)),
        JSON.stringify(normList(body.packageIncludes, 40)),
        ["active", "offline"].includes(body.status) ? body.status : "active",
        body.sortOrder !== undefined ? toInt(body.sortOrder, 0) : maxSort + 1,
        now,
        now,
      ]
    );
    audit(req, "photographer.create", "photographer", id, { name });
    res.status(201).json({ ok: true, photographer: mapPhotographer(get("SELECT * FROM photographers WHERE id = ?", [id])) });
  } catch (error) {
    next(error);
  }
});

router.patch("/photographers/:id", (req, res) => {
  const row = get("SELECT * FROM photographers WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "摄影师不存在" });
  const body = req.body || {};
  const value = (key, column, max = 300) => (body[key] !== undefined ? text(body[key], max) : row[column]);
  run(
    `UPDATE photographers SET name = ?, title = ?, avatar = ?, cover = ?, rating = ?, orders_count = ?,
      price = ?, tags = ?, works = ?, bio = ?, package_title = ?, package_desc = ?, package_price = ?,
      package_deposit = ?, package_includes = ?, status = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    [
      value("name", "name", 40),
      value("title", "title", 60),
      value("avatar", "avatar", 120),
      value("cover", "cover", 120),
      body.rating !== undefined ? clamp(Number(body.rating) || 0, 0, 5) : row.rating,
      body.ordersCount !== undefined ? Math.max(0, toInt(body.ordersCount, 0)) : row.orders_count,
      body.price !== undefined ? Math.max(0, toInt(body.price, 0)) : row.price,
      JSON.stringify(body.tags !== undefined ? normList(body.tags, 20) : JSON.parse(row.tags)),
      JSON.stringify(body.works !== undefined ? normList(body.works, 200) : JSON.parse(row.works)),
      value("bio", "bio"),
      value("packageTitle", "package_title", 80),
      value("packageDesc", "package_desc", 200),
      body.packagePrice !== undefined ? Math.max(0, toInt(body.packagePrice, 0)) : row.package_price,
      body.packageDeposit !== undefined ? Math.max(0, toInt(body.packageDeposit, 0)) : row.package_deposit,
      JSON.stringify(body.packageIncludes !== undefined ? normList(body.packageIncludes, 40) : JSON.parse(row.package_includes)),
      body.status !== undefined && ["active", "offline"].includes(body.status) ? body.status : row.status,
      body.sortOrder !== undefined ? toInt(body.sortOrder, row.sort_order) : row.sort_order,
      nowIso(),
      row.id,
    ]
  );
  audit(req, "photographer.update", "photographer", row.id, { fields: Object.keys(body) });
  res.json({ ok: true, photographer: mapPhotographer(get("SELECT * FROM photographers WHERE id = ?", [row.id])) });
});

router.get("/makeup", (req, res) => {
  const rows = all("SELECT * FROM makeup_artists ORDER BY sort_order ASC, created_at ASC");
  res.json({ items: rows.map(mapMakeup) });
});

router.post("/makeup", (req, res) => {
  const body = req.body || {};
  const name = text(body.name, 40);
  if (!name) return res.status(400).json({ error: "invalid_name", message: "请填写妆造师名称" });
  const id = text(body.id, 40).toLowerCase() || randomId("mk");
  if (!validId(id)) return res.status(400).json({ error: "invalid_id", message: "妆造师 ID 不合法" });
  if (get("SELECT 1 AS x FROM makeup_artists WHERE id = ?", [id])) {
    return res.status(409).json({ error: "id_exists", message: "妆造师 ID 已存在" });
  }
  const now = nowIso();
  const maxSort = get("SELECT COALESCE(MAX(sort_order), -1) AS n FROM makeup_artists").n;
  run(
    `INSERT INTO makeup_artists
      (id, name, title, avatar, description, tags, price, status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      text(body.title, 60),
      text(body.avatar, 120) || "model-1",
      text(body.desc ?? body.description, 300),
      JSON.stringify(normList(body.tags, 20)),
      Math.max(0, toInt(body.price, 0)),
      ["active", "offline"].includes(body.status) ? body.status : "active",
      body.sortOrder !== undefined ? toInt(body.sortOrder, 0) : maxSort + 1,
      now,
      now,
    ]
  );
  audit(req, "makeup.create", "makeup", id, { name });
  res.status(201).json({ ok: true, artist: mapMakeup(get("SELECT * FROM makeup_artists WHERE id = ?", [id])) });
});

router.patch("/makeup/:id", (req, res) => {
  const row = get("SELECT * FROM makeup_artists WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "妆造师不存在" });
  const body = req.body || {};
  run(
    `UPDATE makeup_artists SET name = ?, title = ?, avatar = ?, description = ?, tags = ?, price = ?,
      status = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
    [
      body.name !== undefined ? text(body.name, 40) : row.name,
      body.title !== undefined ? text(body.title, 60) : row.title,
      body.avatar !== undefined ? text(body.avatar, 120) : row.avatar,
      body.desc !== undefined || body.description !== undefined
        ? text(body.desc ?? body.description, 300)
        : row.description,
      JSON.stringify(body.tags !== undefined ? normList(body.tags, 20) : JSON.parse(row.tags)),
      body.price !== undefined ? Math.max(0, toInt(body.price, 0)) : row.price,
      body.status !== undefined && ["active", "offline"].includes(body.status) ? body.status : row.status,
      body.sortOrder !== undefined ? toInt(body.sortOrder, row.sort_order) : row.sort_order,
      nowIso(),
      row.id,
    ]
  );
  audit(req, "makeup.update", "makeup", row.id, { fields: Object.keys(body) });
  res.json({ ok: true, artist: mapMakeup(get("SELECT * FROM makeup_artists WHERE id = ?", [row.id])) });
});

router.get("/posts", (req, res) => {
  const rows = all("SELECT * FROM posts ORDER BY created_at DESC");
  res.json({ items: rows.map((row) => mapPost(row)) });
});

router.post("/posts", (req, res) => {
  const body = req.body || {};
  const userName = text(body.userName ?? body.user, 40);
  const content = text(body.text, 1000);
  if (!userName) return res.status(400).json({ error: "invalid_user", message: "请填写发布人" });
  if (!content) return res.status(400).json({ error: "invalid_text", message: "请填写内容" });
  const productId = text(body.productId ?? body.product, 60) || null;
  if (productId && !get("SELECT 1 AS x FROM products WHERE id = ?", [productId])) {
    return res.status(400).json({ error: "invalid_product", message: "关联商品不存在" });
  }
  const id = randomId("post");
  const now = nowIso();
  run(
    `INSERT INTO posts
      (id, user_name, avatar, city, text, images, tags, product_id, likes, comments, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userName,
      text(body.avatar, 120) || "model-1",
      text(body.city, 60) || "三亚",
      content,
      JSON.stringify(normList(body.images, 200)),
      JSON.stringify(normList(body.tags, 30)),
      productId,
      Math.max(0, toInt(body.likes, 0)),
      Math.max(0, toInt(body.comments, 0)),
      ["published", "hidden"].includes(body.status) ? body.status : "published",
      now,
      now,
    ]
  );
  audit(req, "post.create", "post", id, { userName });
  res.status(201).json({ ok: true, post: mapPost(get("SELECT * FROM posts WHERE id = ?", [id])) });
});

router.patch("/posts/:id", (req, res) => {
  const row = get("SELECT * FROM posts WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "内容不存在" });
  const body = req.body || {};
  const productId =
    body.productId !== undefined || body.product !== undefined
      ? text(body.productId ?? body.product, 60) || null
      : row.product_id;
  if (productId && !get("SELECT 1 AS x FROM products WHERE id = ?", [productId])) {
    return res.status(400).json({ error: "invalid_product", message: "关联商品不存在" });
  }
  run(
    `UPDATE posts SET user_name = ?, avatar = ?, city = ?, text = ?, images = ?, tags = ?,
      product_id = ?, likes = ?, comments = ?, status = ?, updated_at = ? WHERE id = ?`,
    [
      body.userName !== undefined || body.user !== undefined ? text(body.userName ?? body.user, 40) : row.user_name,
      body.avatar !== undefined ? text(body.avatar, 120) : row.avatar,
      body.city !== undefined ? text(body.city, 60) : row.city,
      body.text !== undefined ? text(body.text, 1000) : row.text,
      JSON.stringify(body.images !== undefined ? normList(body.images, 200) : JSON.parse(row.images)),
      JSON.stringify(body.tags !== undefined ? normList(body.tags, 30) : JSON.parse(row.tags)),
      productId,
      body.likes !== undefined ? Math.max(0, toInt(body.likes, 0)) : row.likes,
      body.comments !== undefined ? Math.max(0, toInt(body.comments, 0)) : row.comments,
      body.status !== undefined && ["published", "hidden"].includes(body.status) ? body.status : row.status,
      nowIso(),
      row.id,
    ]
  );
  audit(req, "post.update", "post", row.id, { fields: Object.keys(body) });
  res.json({ ok: true, post: mapPost(get("SELECT * FROM posts WHERE id = ?", [row.id])) });
});

router.delete("/posts/:id", (req, res) => {
  const row = get("SELECT * FROM posts WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "内容不存在" });
  run("DELETE FROM posts WHERE id = ?", [row.id]);
  audit(req, "post.delete", "post", row.id, {});
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   管理员账号 / 日志
   --------------------------------------------------------- */
router.get("/admins", requireSuperAdmin, (req, res) => {
  const rows = all("SELECT * FROM admin_users ORDER BY created_at ASC");
  res.json({ items: rows.map(mapAdmin) });
});

router.post("/admins", requireSuperAdmin, (req, res) => {
  const username = text(req.body.username, 40);
  const password = text(req.body.password, 100);
  const name = text(req.body.name, 40) || username;
  const role = req.body.role === "super" ? "super" : "ops";
  if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) {
    return res.status(400).json({ error: "invalid_username", message: "账号需为 3-40 位字母、数字或 _ . -" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "weak_password", message: "密码至少 6 位" });
  }
  if (get("SELECT 1 AS x FROM admin_users WHERE username = ?", [username])) {
    return res.status(409).json({ error: "username_exists", message: "管理员账号已存在" });
  }
  const id = randomId("adm");
  run(
    `INSERT INTO admin_users (id, username, password_hash, name, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    [id, username, hashPassword(password), name, role, nowIso()]
  );
  audit(req, "admin.create", "admin", id, { username, role });
  res.status(201).json({ ok: true, admin: mapAdmin(get("SELECT * FROM admin_users WHERE id = ?", [id])) });
});

router.patch("/admins/:id", requireSuperAdmin, (req, res) => {
  const row = get("SELECT * FROM admin_users WHERE id = ?", [text(req.params.id, 80)]);
  if (!row) return res.status(404).json({ error: "not_found", message: "管理员不存在" });
  const body = req.body || {};
  if (row.id === req.admin.id && body.status === "disabled") {
    return res.status(400).json({ error: "cannot_disable_self", message: "不能停用当前登录账号" });
  }
  run(
    `UPDATE admin_users SET name = ?, role = ?, status = ? WHERE id = ?`,
    [
      body.name !== undefined ? text(body.name, 40) : row.name,
      body.role !== undefined && ["super", "ops"].includes(body.role) ? body.role : row.role,
      body.status !== undefined && ["active", "disabled"].includes(body.status) ? body.status : row.status,
      row.id,
    ]
  );
  if (body.password) {
    if (String(body.password).length < 6) {
      return res.status(400).json({ error: "weak_password", message: "密码至少 6 位" });
    }
    run("UPDATE admin_users SET password_hash = ? WHERE id = ?", [hashPassword(body.password), row.id]);
    run("DELETE FROM admin_sessions WHERE admin_id = ? AND token != ?", [
      row.id,
      require("../auth").bearerToken(req) ? require("../util").hashToken(require("../auth").bearerToken(req)) : "",
    ]);
  }
  audit(req, "admin.update", "admin", row.id, { fields: Object.keys(body).filter((k) => k !== "password") });
  res.json({ ok: true, admin: mapAdmin(get("SELECT * FROM admin_users WHERE id = ?", [row.id])) });
});

router.get("/logs", (req, res) => {
  const { page, pageSize, offset } = paging(req);
  const where = ["1=1"];
  const params = [];
  if (req.query.q) {
    const q = `%${text(req.query.q, 60)}%`;
    where.push("(admin_name LIKE ? OR action LIKE ? OR entity LIKE ? OR entity_id LIKE ?)");
    params.push(q, q, q, q);
  }
  if (req.query.entity) {
    where.push("entity = ?");
    params.push(text(req.query.entity, 30));
  }
  const total = get(`SELECT COUNT(*) AS n FROM audit_logs WHERE ${where.join(" AND ")}`, params).n;
  const rows = all(
    `SELECT * FROM audit_logs WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json(pageResult(rows.map((row) => ({ ...row, detail: row.detail })), total, page, pageSize));
});

/* 导出给 index.js 的健康检查用 */
module.exports = router;
module.exports.__helpers = { audit, userRowWithIdentities };
