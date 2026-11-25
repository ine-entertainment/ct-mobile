const express = require("express");
const { requireCustomer } = require("../auth");
const { get, run } = require("../db");
const { nowIso, text } = require("../util");
const {
  createRentalOrder,
  createPhotoOrder,
  listUserOrders,
  orderWithDeposit,
  updateOrderStatus,
} = require("../orderService");
const { buildTimeline, defaultStatusSub } = require("../orderLogic");

const router = express.Router();

router.get("/", requireCustomer, (req, res) => {
  const items = listUserOrders(req.customer.id, req.query.type);
  res.json({ items });
});

router.get("/:id", requireCustomer, (req, res) => {
  const row = get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [
    text(req.params.id, 80),
    req.customer.id,
  ]);
  if (!row) return res.status(404).json({ error: "not_found", message: "订单不存在" });
  res.json({ order: orderWithDeposit(row) });
});

router.post("/rental", requireCustomer, (req, res, next) => {
  try {
    const order = createRentalOrder(req.customer, req.body || {});
    res.status(201).json({ ok: true, order });
  } catch (error) {
    next(error);
  }
});

router.post("/photo", requireCustomer, (req, res, next) => {
  try {
    const order = createPhotoOrder(req.customer, req.body || {});
    res.status(201).json({ ok: true, order });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/refund", requireCustomer, (req, res, next) => {
  try {
    const order = get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [
      text(req.params.id, 80),
      req.customer.id,
    ]);
    if (!order) return res.status(404).json({ error: "not_found", message: "订单不存在" });
    if (order.type !== "rental") {
      return res.status(400).json({ error: "invalid_type", message: "该订单不支持退款" });
    }
    if (!["paid", "shipped"].includes(order.status)) {
      return res.status(409).json({ error: "invalid_status", message: "当前订单状态不能申请退款" });
    }
    const reason = text(req.body.reason, 200);
    updateOrderStatus(order, "refund_requested", {
      statusSub: reason ? `退款申请：${reason}` : undefined,
      adminNote: reason ? `用户退款原因：${reason}` : "用户申请退款",
    });
    const updated = get("SELECT * FROM orders WHERE id = ?", [order.id]);
    res.json({ ok: true, order: orderWithDeposit(updated) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/return", requireCustomer, (req, res, next) => {
  try {
    const order = get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [
      text(req.params.id, 80),
      req.customer.id,
    ]);
    if (!order) return res.status(404).json({ error: "not_found", message: "订单不存在" });
    if (order.type !== "rental" || !["shipped", "in_use"].includes(order.status)) {
      return res.status(409).json({ error: "invalid_status", message: "当前订单状态不能预约归还" });
    }
    updateOrderStatus(order, "return_pending", {
      adminNote: "用户已预约归还，等待骑手上门取件",
    });
    const updated = get("SELECT * FROM orders WHERE id = ?", [order.id]);
    res.json({ ok: true, order: orderWithDeposit(updated) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reschedule", requireCustomer, (req, res, next) => {
  try {
    const order = get("SELECT * FROM orders WHERE id = ? AND user_id = ?", [
      text(req.params.id, 80),
      req.customer.id,
    ]);
    if (!order) return res.status(404).json({ error: "not_found", message: "订单不存在" });
    if (order.type !== "photo" || !["deposit_paid", "confirmed"].includes(order.status)) {
      return res.status(409).json({ error: "invalid_status", message: "当前订单状态不能改期" });
    }
    const slot = text(req.body.slot, 40);
    if (!slot) return res.status(400).json({ error: "slot_required", message: "请选择新的拍摄档期" });
    const status = "deposit_paid";
    const statusSub = `改期至 ${slot}，等待摄影师确认`;
    const timeline = buildTimeline("photo", status, {
      slot,
      createdAt: order.created_at,
      updatedAt: nowIso(),
    });
    run(
      `UPDATE orders SET slot = ?, date_text = ?, status = ?, status_sub = ?, timeline = ?,
        admin_note = ?, updated_at = ? WHERE id = ?`,
      [
        slot,
        slot,
        status,
        statusSub,
        JSON.stringify(timeline),
        `用户申请改期至 ${slot}`,
        nowIso(),
        order.id,
      ]
    );
    const updated = get("SELECT * FROM orders WHERE id = ?", [order.id]);
    res.json({ ok: true, order: orderWithDeposit(updated) });
  } catch (error) {
    next(error);
  }
});

/* 保留给后续扩展：订单状态说明 */
void defaultStatusSub;

module.exports = router;
