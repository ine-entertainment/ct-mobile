const express = require("express");
const config = require("../config");
const { run, get, all, transaction } = require("../db");
const {
  nowIso,
  randomId,
  isValidPhone,
  maskPhone,
  maskOpenid,
  text,
  toInt,
} = require("../util");
const {
  requireCustomer,
  createCustomerSession,
  deleteCustomerSession,
  customerPayload,
  getIdentitiesForUser,
  getIdentity,
} = require("../auth");
const { mapUser } = require("../mappers");

const router = express.Router();

/* ---------------------------------------------------------
   验证码 / 手机号登录
   --------------------------------------------------------- */
const sendBuckets = new Map();

function allowSend(phone, ip) {
  const key = `${phone}|${ip}`;
  const now = Date.now();
  const bucket = (sendBuckets.get(key) || []).filter((t) => now - t < 10 * 60e3);
  if (bucket.length > 0 && now - bucket[bucket.length - 1] < 55e3) {
    return { ok: false, wait: Math.ceil((55e3 - (now - bucket[bucket.length - 1])) / 1000) };
  }
  if (bucket.length >= 5) return { ok: false, wait: 600 };
  bucket.push(now);
  sendBuckets.set(key, bucket);
  return { ok: true };
}

function verifyPhoneCode(phone, code, consume = true) {
  const row = get("SELECT * FROM auth_codes WHERE phone = ?", [phone]);
  if (row) {
    if (row.expires_at < nowIso()) {
      run("DELETE FROM auth_codes WHERE phone = ?", [phone]);
      return { ok: false, message: "验证码已过期，请重新获取" };
    }
    if (row.attempts >= 5) {
      run("DELETE FROM auth_codes WHERE phone = ?", [phone]);
      return { ok: false, message: "验证码尝试次数过多，请重新获取" };
    }
    if (String(row.code) !== String(code)) {
      run("UPDATE auth_codes SET attempts = attempts + 1 WHERE phone = ?", [phone]);
      return { ok: false, message: "验证码不正确" };
    }
    if (consume) run("DELETE FROM auth_codes WHERE phone = ?", [phone]);
    return { ok: true };
  }

  /* 本地演示模式允许固定验证码，方便真机联调；生产环境必须走短信服务。 */
  if (!config.isProd && String(code) === String(config.devSmsCode)) {
    return { ok: true };
  }
  return { ok: false, message: "请先获取验证码" };
}

router.post("/phone/send-code", (req, res) => {
  if (config.isProd) {
    return res.status(501).json({
      error: "sms_not_configured",
      message: "短信服务尚未接入，生产环境已禁用本地固定验证码",
    });
  }
  const phone = text(req.body.phone, 20);
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "invalid_phone", message: "请输入正确的手机号" });
  }
  const limit = allowSend(phone, req.ip || req.socket.remoteAddress || "");
  if (!limit.ok) {
    return res.status(429).json({ error: "too_many_requests", message: `请 ${limit.wait} 秒后再试` });
  }

  const code = config.devSmsCode;
  const now = nowIso();
  const expires = new Date(Date.now() + config.smsTtlSeconds * 1000).toISOString();
  run(
    `INSERT INTO auth_codes (phone, code, expires_at, attempts, created_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, attempts = 0, created_at = excluded.created_at`,
    [phone, code, expires, now]
  );

  res.json({
    ok: true,
    mock: true,
    expiresIn: config.smsTtlSeconds,
    message: "本地演示环境未接入短信，验证码固定为 123456",
    devCode: config.isProd ? undefined : code,
  });
});

function createCustomer(nickname, avatar) {
  const id = randomId("u");
  const now = nowIso();
  run(
    `INSERT INTO users (id, nickname, avatar, city, member_level, deposit_credit, status, created_at, updated_at)
     VALUES (?, ?, ?, '三亚', '旅行会员', 2000, 'active', ?, ?)`,
    [id, nickname, avatar || "model-2", now, now]
  );
  return id;
}

router.post("/phone/login", (req, res) => {
  const phone = text(req.body.phone, 20);
  const code = text(req.body.code, 10);
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "invalid_phone", message: "请输入正确的手机号" });
  }
  if (!code) {
    return res.status(400).json({ error: "invalid_code", message: "请输入验证码" });
  }
  const check = verifyPhoneCode(phone, code);
  if (!check.ok) {
    return res.status(400).json({ error: "invalid_code", message: check.message });
  }

  let identity = getIdentity("phone", phone);
  let isNew = false;
  let user;
  if (!identity) {
    user = transaction(() => {
      const userId = createCustomer(`旅行者${phone.slice(-4)}`, "model-2");
      run(
        `INSERT INTO identities (id, user_id, type, value, nickname, avatar, created_at, last_login_at)
         VALUES (?, ?, 'phone', ?, ?, 'model-2', ?, ?)`,
        [randomId("idn"), userId, phone, `旅行者${phone.slice(-4)}`, nowIso(), nowIso()]
      );
      return get("SELECT * FROM users WHERE id = ?", [userId]);
    });
    isNew = true;
  } else {
    user = get("SELECT * FROM users WHERE id = ?", [identity.user_id]);
    if (!user || user.status !== "active") {
      return res.status(403).json({ error: "account_disabled", message: "账号已被停用，请联系客服" });
    }
    run("UPDATE identities SET last_login_at = ? WHERE id = ?", [nowIso(), identity.id]);
  }

  const token = createCustomerSession(user.id);
  res.json({ token, user: customerPayload(user), isNew });
});

/* ---------------------------------------------------------
   微信登录（本地模拟；接入真实微信时替换 code -> openid 的换取逻辑）
   --------------------------------------------------------- */
function normalizeWechatCode(code) {
  const value = text(code, 64);
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(value)) return "";
  return value;
}

router.post("/wechat/login", (req, res) => {
  if (!config.wechatMock) {
    return res.status(501).json({
      error: "wechat_not_configured",
      message: "微信登录服务尚未配置，请设置 WECHAT_MOCK=true 使用本地模拟",
    });
  }
  const code = normalizeWechatCode(req.body.code);
  if (!code) {
    return res.status(400).json({ error: "invalid_code", message: "请提供微信授权码" });
  }
  const nickname = text(req.body.nickname, 40);
  const avatar = text(req.body.avatar, 80) || "model-1";

  let identity = getIdentity("wechat", code);
  let isNew = false;
  let user;
  if (!identity) {
    user = transaction(() => {
      const userId = createCustomer(nickname || `微信用户${code.slice(-4)}`, avatar);
      run(
        `INSERT INTO identities (id, user_id, type, value, nickname, avatar, created_at, last_login_at)
         VALUES (?, ?, 'wechat', ?, ?, ?, ?, ?)`,
        [randomId("idn"), userId, code, nickname, avatar, nowIso(), nowIso()]
      );
      return get("SELECT * FROM users WHERE id = ?", [userId]);
    });
    isNew = true;
  } else {
    user = get("SELECT * FROM users WHERE id = ?", [identity.user_id]);
    if (!user || user.status !== "active") {
      return res.status(403).json({ error: "account_disabled", message: "账号已被停用，请联系客服" });
    }
    run("UPDATE identities SET last_login_at = ? WHERE id = ?", [nowIso(), identity.id]);
  }

  const token = createCustomerSession(user.id);
  res.json({ token, user: customerPayload(user), isNew });
});

/* ---------------------------------------------------------
   当前账号
   --------------------------------------------------------- */
router.get("/me", requireCustomer, (req, res) => {
  const user = customerPayload(req.customer);
  const stats = {
    orders: get("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", [user.id]).n,
    favorites: get("SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?", [user.id]).n,
    unread: 0,
  };
  res.json({ user, stats });
});

router.post("/logout", requireCustomer, (req, res) => {
  deleteCustomerSession(req.customerToken);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   绑定 / 解绑
   --------------------------------------------------------- */
function accountSummary(userRow) {
  const identities = getIdentitiesForUser(userRow.id);
  const phone = identities.find((i) => i.type === "phone");
  const wechat = identities.find((i) => i.type === "wechat");
  return {
    id: userRow.id,
    nickname: userRow.nickname,
    avatar: userRow.avatar,
    phoneMasked: phone ? maskPhone(phone.value) : "",
    wechatMasked: wechat ? maskOpenid(wechat.value) : "",
    createdAt: userRow.created_at,
    orderCount: get("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", [userRow.id]).n,
  };
}

function makeMergeTicket(currentUserId, targetUserId, type, value) {
  const id = randomId("mrg");
  const now = nowIso();
  const expires = new Date(Date.now() + 10 * 60e3).toISOString();
  run(
    `INSERT INTO merge_tickets
      (id, current_user_id, target_user_id, identity_type, identity_value, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, currentUserId, targetUserId, type, value, expires, now]
  );
  return { id, expiresAt: expires };
}

router.post("/bind", requireCustomer, (req, res) => {
  const type = text(req.body.type, 10);
  const currentUser = req.customer;
  if (!["phone", "wechat"].includes(type)) {
    return res.status(400).json({ error: "invalid_type", message: "不支持的绑定类型" });
  }

  const existingOfType = get("SELECT * FROM identities WHERE user_id = ? AND type = ?", [currentUser.id, type]);
  if (existingOfType) {
    return res.status(409).json({
      error: "identity_type_exists",
      message: type === "phone" ? "当前账号已绑定手机号，请先解绑" : "当前账号已绑定微信，请先解绑",
    });
  }

  let value;
  let nickname = "";
  let avatar = "";
  if (type === "phone") {
    value = text(req.body.phone, 20);
    const code = text(req.body.code, 10);
    if (!isValidPhone(value)) {
      return res.status(400).json({ error: "invalid_phone", message: "请输入正确的手机号" });
    }
    const check = verifyPhoneCode(value, code);
    if (!check.ok) {
      return res.status(400).json({ error: "invalid_code", message: check.message });
    }
  } else {
    if (!config.wechatMock) {
      return res.status(501).json({ error: "wechat_not_configured", message: "微信绑定尚未配置" });
    }
    value = normalizeWechatCode(req.body.code);
    if (!value) {
      return res.status(400).json({ error: "invalid_code", message: "请提供微信授权码" });
    }
    nickname = text(req.body.nickname, 40);
    avatar = text(req.body.avatar, 80);
  }

  const identity = getIdentity(type, value);
  if (!identity) {
    const now = nowIso();
    run(
      `INSERT INTO identities (id, user_id, type, value, nickname, avatar, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomId("idn"), currentUser.id, type, value, nickname, avatar, now, now]
    );
    return res.json({ ok: true, merged: false, user: customerPayload(currentUser) });
  }

  if (identity.user_id === currentUser.id) {
    return res.status(409).json({ error: "already_bound", message: "该身份已绑定在当前账号" });
  }

  const target = get("SELECT * FROM users WHERE id = ?", [identity.user_id]);
  if (!target || target.status !== "active") {
    return res.status(403).json({ error: "target_disabled", message: "该身份所在账号不可用" });
  }

  const ticket = makeMergeTicket(currentUser.id, target.id, type, value);
  res.status(409).json({
    error: "identity_conflict",
    code: "identity_conflict",
    mergeRequired: true,
    message: "该身份已绑定另一个账号，需要合并账号后才能继续",
    ticketId: ticket.id,
    ticketExpiresAt: ticket.expiresAt,
    current: accountSummary(currentUser),
    target: accountSummary(target),
  });
});

router.post("/merge/confirm", requireCustomer, (req, res) => {
  const ticketId = text(req.body.ticketId, 80);
  const keep = text(req.body.keep, 20) === "target" ? "target" : "current";
  const ticket = get(
    "SELECT * FROM merge_tickets WHERE id = ? AND current_user_id = ? AND used = 0 AND expires_at > ?",
    [ticketId, req.customer.id, nowIso()]
  );
  if (!ticket) {
    return res.status(400).json({ error: "invalid_ticket", message: "合并凭证已失效，请重新绑定" });
  }
  const target = get("SELECT * FROM users WHERE id = ?", [ticket.target_user_id]);
  if (!target || target.status !== "active") {
    return res.status(400).json({ error: "target_unavailable", message: "目标账号不可用，无法合并" });
  }

  const survivorId = keep === "target" ? target.id : req.customer.id;
  const loserId = keep === "target" ? req.customer.id : target.id;
  if (survivorId === loserId) {
    return res.status(400).json({ error: "same_account", message: "两个账号相同，无需合并" });
  }

  const result = transaction(() => {
    const survivor = get("SELECT * FROM users WHERE id = ?", [survivorId]);
    const loser = get("SELECT * FROM users WHERE id = ?", [loserId]);

    const movedIdentities = [];
    const droppedIdentities = [];
    const loserIdentities = getIdentitiesForUser(loserId);
    for (const identity of loserIdentities) {
      const conflict = get("SELECT id FROM identities WHERE user_id = ? AND type = ?", [survivorId, identity.type]);
      if (conflict) {
        droppedIdentities.push({ type: identity.type, value: identity.value });
        run("DELETE FROM identities WHERE id = ?", [identity.id]);
      } else {
        run("UPDATE identities SET user_id = ? WHERE id = ?", [survivorId, identity.id]);
        movedIdentities.push({ type: identity.type, value: identity.value });
      }
    }

    const movedOrders = get("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?", [loserId]).n;
    run("UPDATE orders SET user_id = ? WHERE user_id = ?", [survivorId, loserId]);
    run("UPDATE deposits SET user_id = ? WHERE user_id = ?", [survivorId, loserId]);

    const loserFavorites = all("SELECT product_id FROM favorites WHERE user_id = ?", [loserId]);
    for (const favorite of loserFavorites) {
      run("INSERT OR IGNORE INTO favorites (user_id, product_id, created_at) VALUES (?, ?, ?)", [
        survivorId,
        favorite.product_id,
        nowIso(),
      ]);
    }
    run("DELETE FROM favorites WHERE user_id = ?", [loserId]);

    const loserLikes = all("SELECT post_id FROM post_likes WHERE user_id = ?", [loserId]);
    for (const like of loserLikes) {
      run("INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)", [
        like.post_id,
        survivorId,
        nowIso(),
      ]);
    }
    run("DELETE FROM post_likes WHERE user_id = ?", [loserId]);

    if (!survivor.address_text && loser.address_text) {
      run(
        `UPDATE users SET address_name = ?, address_phone = ?, address_text = ?, updated_at = ?
          WHERE id = ?`,
        [loser.address_name, loser.address_phone, loser.address_text, nowIso(), survivorId]
      );
    }

    run("DELETE FROM users WHERE id = ?", [loserId]);
    run("UPDATE merge_tickets SET used = 1 WHERE id = ?", [ticket.id]);

    const detail = {
      keep,
      movedIdentities,
      droppedIdentities,
      movedOrders,
      favorites: loserFavorites.length,
      likes: loserLikes.length,
    };
    run(
      `INSERT INTO account_merges (id, survivor_user_id, merged_user_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [randomId("amg"), survivorId, loserId, JSON.stringify(detail), nowIso()]
    );

    run("DELETE FROM customer_sessions WHERE user_id IN (?, ?)", [survivorId, loserId]);
    const token = createCustomerSession(survivorId);
    const userRow = get("SELECT * FROM users WHERE id = ?", [survivorId]);
    return { token, userRow, detail };
  });

  res.json({
    ok: true,
    merged: true,
    token: result.token,
    user: mapUser(result.userRow, getIdentitiesForUser(result.userRow.id)),
    detail: result.detail,
  });
});

router.delete("/identities/:type", requireCustomer, (req, res) => {
  const type = text(req.params.type, 10);
  if (!["phone", "wechat"].includes(type)) {
    return res.status(400).json({ error: "invalid_type", message: "不支持的身份类型" });
  }
  const identities = getIdentitiesForUser(req.customer.id);
  if (identities.length <= 1) {
    return res.status(409).json({
      error: "last_identity",
      message: "至少保留一种登录方式，请先绑定另一种身份",
    });
  }
  const target = identities.find((identity) => identity.type === type);
  if (!target) {
    return res.status(404).json({ error: "not_bound", message: "当前账号未绑定该身份" });
  }
  run("DELETE FROM identities WHERE id = ?", [target.id]);
  res.json({ ok: true, user: customerPayload(req.customer) });
});

/* ---------------------------------------------------------
   资料
   --------------------------------------------------------- */
router.patch("/users/me", requireCustomer, (req, res) => {
  const user = req.customer;
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
    ["addressName", "address_name", 40],
    ["addressPhone", "address_phone", 20],
    ["addressText", "address_text", 200],
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
  ]) {
    if (body[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(toInt(body[key], 0) || null);
    }
  }
  if (!fields.length) {
    return res.status(400).json({ error: "nothing_to_update", message: "没有需要更新的内容" });
  }
  fields.push("updated_at = ?");
  values.push(nowIso());
  values.push(user.id);
  run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  const updated = get("SELECT * FROM users WHERE id = ?", [user.id]);
  res.json({ ok: true, user: customerPayload(updated) });
});

module.exports = router;
