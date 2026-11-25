const express = require("express");
const { all, get, run, transaction } = require("../db");
const { requireCustomer, optionalCustomer } = require("../auth");
const { mapProduct, mapPhotographer, mapMakeup, mapPost } = require("../mappers");
const { nowIso, text } = require("../util");

const router = express.Router();

function skusFor(productId) {
  return all("SELECT * FROM product_skus WHERE product_id = ? ORDER BY rowid ASC", [productId]);
}

function loadProduct(row) {
  return row ? mapProduct(row, skusFor(row.id)) : null;
}

router.get("/products", (req, res) => {
  const where = ["status = 'active'"];
  const params = [];
  if (req.query.style && req.query.style !== "全部") {
    where.push("styles LIKE ?");
    params.push(`%${text(req.query.style, 20)}%`);
  }
  if (req.query.q) {
    where.push("(title LIKE ? OR merchant LIKE ? OR styles LIKE ?)");
    const q = `%${text(req.query.q, 40)}%`;
    params.push(q, q, q);
  }
  if (req.query.city) {
    where.push("city = ?");
    params.push(text(req.query.city, 20));
  }
  const rows = all(
    `SELECT * FROM products WHERE ${where.join(" AND ")} ORDER BY sort_order ASC, created_at ASC`,
    params
  );
  res.json({ items: rows.map(loadProduct) });
});

router.get("/products/:id", (req, res) => {
  const row = get("SELECT * FROM products WHERE id = ?", [text(req.params.id, 60)]);
  if (!row || row.status !== "active") {
    return res.status(404).json({ error: "not_found", message: "商品不存在或已下架" });
  }
  res.json({ product: loadProduct(row) });
});

router.get("/photographers", (req, res) => {
  const rows = all("SELECT * FROM photographers WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC");
  res.json({ items: rows.map(mapPhotographer) });
});

router.get("/photographers/:id", (req, res) => {
  const row = get("SELECT * FROM photographers WHERE id = ?", [text(req.params.id, 60)]);
  if (!row || row.status !== "active") {
    return res.status(404).json({ error: "not_found", message: "摄影师不存在或已下架" });
  }
  res.json({ photographer: mapPhotographer(row) });
});

router.get("/makeup", (req, res) => {
  const rows = all("SELECT * FROM makeup_artists WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC");
  res.json({ items: rows.map(mapMakeup) });
});

router.get("/posts", optionalCustomer, (req, res) => {
  const rows = all("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC");
  let likedIds = new Set();
  if (req.customer) {
    likedIds = new Set(
      all("SELECT post_id FROM post_likes WHERE user_id = ?", [req.customer.id]).map((row) => row.post_id)
    );
  }
  res.json({
    items: rows.map((row) => mapPost(row, likedIds.has(row.id))),
    tabs: ["推荐", "同城", "关注"],
  });
});

router.post("/posts/:id/like", requireCustomer, (req, res) => {
  const postId = text(req.params.id, 60);
  const post = get("SELECT * FROM posts WHERE id = ? AND status = 'published'", [postId]);
  if (!post) return res.status(404).json({ error: "not_found", message: "内容不存在" });

  const result = transaction(() => {
    const existing = get("SELECT 1 AS x FROM post_likes WHERE post_id = ? AND user_id = ?", [
      postId,
      req.customer.id,
    ]);
    if (existing) {
      run("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [postId, req.customer.id]);
      run("UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?", [postId]);
      return { liked: false };
    }
    run("INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)", [
      postId,
      req.customer.id,
      nowIso(),
    ]);
    run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId]);
    return { liked: true };
  });
  const updated = get("SELECT likes FROM posts WHERE id = ?", [postId]);
  res.json({ ok: true, liked: result.liked, likes: updated.likes });
});

router.get("/favorites", requireCustomer, (req, res) => {
  const rows = all(
    `SELECT p.* FROM favorites f JOIN products p ON p.id = f.product_id
      WHERE f.user_id = ? AND p.status = 'active'
      ORDER BY f.created_at DESC`,
    [req.customer.id]
  );
  res.json({ items: rows.map(loadProduct) });
});

router.post("/favorites/:productId/toggle", requireCustomer, (req, res) => {
  const productId = text(req.params.productId, 60);
  const product = get("SELECT id FROM products WHERE id = ? AND status = 'active'", [productId]);
  if (!product) return res.status(404).json({ error: "not_found", message: "商品不存在或已下架" });

  const result = transaction(() => {
    const existing = get("SELECT 1 AS x FROM favorites WHERE user_id = ? AND product_id = ?", [
      req.customer.id,
      productId,
    ]);
    if (existing) {
      run("DELETE FROM favorites WHERE user_id = ? AND product_id = ?", [req.customer.id, productId]);
      return { liked: false };
    }
    run("INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, ?)", [
      req.customer.id,
      productId,
      nowIso(),
    ]);
    return { liked: true };
  });
  res.json({ ok: true, ...result });
});

router.get("/cities", (req, res) => {
  const productCount = get("SELECT COUNT(*) AS n FROM products WHERE status = 'active' AND city = '三亚'").n;
  const stockCount = get(
    `SELECT COALESCE(SUM(s.stock_available), 0) AS n
       FROM product_skus s JOIN products p ON p.id = s.product_id
      WHERE p.status = 'active' AND p.city = '三亚'`
  ).n;
  res.json({
    items: [
      {
        name: "三亚",
        status: "open",
        weather: "28°C · 晴 · 海风 3 级",
        spots: 12,
        products: productCount,
        pieces: stockCount,
        hotels: 8,
      },
      { name: "大理", status: "soon", weather: "筹备中" },
      { name: "厦门", status: "soon", weather: "筹备中" },
      { name: "重庆", status: "soon", weather: "筹备中" },
      { name: "西安", status: "soon", weather: "筹备中" },
    ],
  });
});

router.get("/config", (req, res) => {
  res.json({
    projectName: "未命名项目",
    city: "三亚",
    mock: {
      sms: true,
      wechat: true,
      devSmsCode: process.env.NODE_ENV === "production" ? undefined : "123456",
    },
    depositCredit: 2000,
    delivery: {
      hotel: { fee: 15, label: "酒店配送" },
      express: { fee: 18, label: "顺丰快递" },
      pickup: { fee: 0, label: "门店自提" },
    },
  });
});

module.exports = router;
