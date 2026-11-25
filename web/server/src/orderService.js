const { get, all, run, transaction } = require("./db");
const {
  randomId,
  nowIso,
  addDaysToDate,
  cnToday,
  shortDate,
  generateOrderNo,
  text,
  isValidPhone,
} = require("./util");
const { dayPrice, deliveryInfo, buildTimeline, defaultStatusSub } = require("./orderLogic");
const { mapOrder } = require("./mappers");

class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

function fail(status, code, message, extra) {
  throw new ApiError(status, code, message, extra);
}

function getOrderRow(orderId) {
  return get("SELECT * FROM orders WHERE id = ?", [orderId]);
}

function getDepositForOrder(orderId) {
  return get("SELECT * FROM deposits WHERE order_id = ?", [orderId]);
}

function orderWithDeposit(row, userName = "") {
  const deposit = row ? getDepositForOrder(row.id) : null;
  return mapOrder(row, {
    depositStatus: deposit ? deposit.status : null,
    depositRefundedAmount: deposit ? deposit.refunded_amount : 0,
    userName,
  });
}

function releaseOrderStock(row) {
  if (!row || row.type !== "rental" || !row.product_id || !row.size || row.stock_released) return false;
  const sku = get("SELECT * FROM product_skus WHERE product_id = ? AND size = ?", [row.product_id, row.size]);
  if (sku) {
    run("UPDATE product_skus SET stock_available = MIN(stock_total, stock_available + 1) WHERE id = ?", [sku.id]);
  }
  run("UPDATE orders SET stock_released = 1 WHERE id = ?", [row.id]);
  return true;
}

function timelineContext(row, updatedAt) {
  return {
    startDate: row.start_date,
    endDate: row.end_date,
    slot: row.slot,
    createdAt: row.created_at,
    updatedAt: updatedAt || nowIso(),
    deposit: row.deposit,
  };
}

function updateOrderStatus(row, status, options = {}) {
  const updatedAt = nowIso();
  const context = timelineContext(row, updatedAt);
  const statusSub =
    options.statusSub !== undefined && String(options.statusSub).trim() !== ""
      ? text(options.statusSub, 300)
      : defaultStatusSub(row.type, status, context);
  const timeline = buildTimeline(row.type, status, context);
  run(
    `UPDATE orders SET status = ?, status_sub = ?, timeline = ?, admin_note = ?, updated_at = ?
      WHERE id = ?`,
    [
      status,
      statusSub,
      JSON.stringify(timeline),
      options.adminNote !== undefined ? text(options.adminNote, 500) : row.admin_note,
      updatedAt,
      row.id,
    ]
  );
  return { timeline, statusSub, updatedAt };
}

function ensureUniqueOrderNo(type) {
  for (let i = 0; i < 5; i += 1) {
    const orderNo = generateOrderNo(type);
    if (!get("SELECT 1 AS x FROM orders WHERE order_no = ?", [orderNo])) return orderNo;
  }
  return `${type === "photo" ? "YYP" : "YY"}${Date.now()}`;
}

function resolveAddress(user, body) {
  const addressInput = body.address && typeof body.address === "object" ? body.address : {};
  const name = text(addressInput.name ?? body.addressName ?? user.address_name, 40);
  const phone = text(addressInput.phone ?? body.addressPhone ?? user.address_phone, 20);
  const addressText = text(addressInput.text ?? body.addressText ?? user.address_text, 200);
  if (!name) fail(400, "address_required", "请填写收货人姓名", { field: "name" });
  if (!isValidPhone(phone)) fail(400, "address_required", "请填写正确的收货手机号", { field: "phone" });
  if (!addressText) fail(400, "address_required", "请填写收货地址", { field: "text" });
  return { name, phone, text: addressText };
}

function createRentalOrder(user, body) {
  const productId = text(body.productId, 60);
  const product = get("SELECT * FROM products WHERE id = ? AND status = 'active'", [productId]);
  if (!product) fail(404, "product_not_found", "商品不存在或已下架");

  const sizes = JSON.parse(product.sizes);
  const size = text(body.size, 10) || (sizes.includes("M") ? "M" : sizes[0]);
  if (!sizes.includes(size)) fail(400, "invalid_size", "请选择正确的尺码");
  const sku = get("SELECT * FROM product_skus WHERE product_id = ? AND size = ?", [productId, size]);
  if (!sku || sku.stock_available <= 0) fail(409, "out_of_stock", "该尺码当前没有可租库存，请换一个尺码");

  const days = [3, 5, 7].includes(Number(body.days)) ? Number(body.days) : 3;
  const deliveryKey = ["hotel", "express", "pickup"].includes(body.delivery) ? body.delivery : "hotel";
  const delivery = deliveryInfo(deliveryKey);
  const insurance = body.insurance ? 9 : 0;
  const address = resolveAddress(user, body);
  const rent = dayPrice(product.price, days);
  const coupon = 20;
  const total = Math.max(0, rent + product.deposit + delivery.fee + insurance - coupon);

  const startDate = addDaysToDate(cnToday(), 3);
  const endDate = addDaysToDate(startDate, days - 1);
  const dateText = `${shortDate(startDate)} - ${shortDate(endDate)} · ${days} 天`;
  const createdAt = nowIso();
  const orderId = randomId("ord");
  const orderNo = ensureUniqueOrderNo("rental");
  const context = { startDate, endDate, createdAt, updatedAt: createdAt, deposit: product.deposit };
  const status = "paid";
  const statusSub = defaultStatusSub("rental", status, context);
  const timeline = buildTimeline("rental", status, context);

  const result = transaction(() => {
    const changed = run(
      "UPDATE product_skus SET stock_available = stock_available - 1 WHERE id = ? AND stock_available > 0",
      [sku.id]
    );
    if (!changed.changes) fail(409, "out_of_stock", "该尺码刚刚被租走，请换一个尺码");

    run(
      `INSERT INTO orders
        (id, order_no, user_id, type, status, status_sub, product_id, photographer_id,
         title, image, date_text, merchant, paid, deposit, balance, size, days, delivery,
         insurance, address_name, address_phone, address_text, timeline, slot, start_date,
         end_date, stock_released, admin_note, created_at, updated_at)
       VALUES (?, ?, ?, 'rental', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 0, '', ?, ?)`,
      [
        orderId,
        orderNo,
        user.id,
        status,
        statusSub,
        productId,
        product.title,
        product.img,
        dateText,
        product.merchant,
        total,
        product.deposit,
        size,
        days,
        deliveryKey,
        insurance,
        address.name,
        address.phone,
        address.text,
        JSON.stringify(timeline),
        startDate,
        endDate,
        createdAt,
        createdAt,
      ]
    );

    run(
      `INSERT INTO deposits (id, order_id, user_id, amount, status, refunded_amount, note, refunded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'held', 0, '', NULL, ?, ?)`,
      [randomId("dep"), orderId, user.id, product.deposit, createdAt, createdAt]
    );

    run(
      `UPDATE users SET address_name = ?, address_phone = ?, address_text = ?, updated_at = ? WHERE id = ?`,
      [address.name, address.phone, address.text, createdAt, user.id]
    );

    return getOrderRow(orderId);
  });

  return orderWithDeposit(result);
}

function createPhotoOrder(user, body) {
  const photographerId = text(body.photographerId, 60);
  const photographer = get("SELECT * FROM photographers WHERE id = ? AND status = 'active'", [photographerId]);
  if (!photographer) fail(404, "photographer_not_found", "摄影师不存在或已下架");

  const slot = text(body.slot, 40);
  if (!slot) fail(400, "slot_required", "请选择拍摄档期");

  const price = photographer.package_price;
  const deposit = photographer.package_deposit;
  const balance = Math.max(0, price - deposit);
  const createdAt = nowIso();
  const orderId = randomId("ord");
  const orderNo = ensureUniqueOrderNo("photo");
  const status = "deposit_paid";
  const statusSub = defaultStatusSub("photo", status, { slot });
  const timeline = buildTimeline("photo", status, { slot, createdAt, updatedAt: createdAt });

  const result = transaction(() => {
    run(
      `INSERT INTO orders
        (id, order_no, user_id, type, status, status_sub, product_id, photographer_id,
         title, image, date_text, merchant, paid, deposit, balance, size, days, delivery,
         insurance, address_name, address_phone, address_text, timeline, slot, start_date,
         end_date, stock_released, admin_note, created_at, updated_at)
       VALUES (?, ?, ?, 'photo', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, '', 0, '', 0, ?, ?, ?, ?, ?, '', '', 1, '', ?, ?)`,
      [
        orderId,
        orderNo,
        user.id,
        status,
        statusSub,
        photographerId,
        `${photographer.name} · ${photographer.package_title}`,
        photographer.cover,
        slot,
        `${photographer.name}摄影工作室`,
        deposit,
        deposit,
        balance,
        user.address_name,
        user.address_phone,
        user.address_text,
        JSON.stringify(timeline),
        slot,
        createdAt,
        createdAt,
      ]
    );
    return getOrderRow(orderId);
  });

  return orderWithDeposit(result);
}

function listUserOrders(userId, type) {
  const params = [userId];
  let sql = "SELECT * FROM orders WHERE user_id = ?";
  if (type === "rental" || type === "photo") {
    sql += " AND type = ?";
    params.push(type);
  }
  sql += " ORDER BY created_at DESC";
  return all(sql, params).map((row) => orderWithDeposit(row));
}

module.exports = {
  ApiError,
  fail,
  getOrderRow,
  getDepositForOrder,
  orderWithDeposit,
  releaseOrderStock,
  updateOrderStatus,
  createRentalOrder,
  createPhotoOrder,
  listUserOrders,
  resolveAddress,
};
