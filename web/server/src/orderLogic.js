const {
  addDaysToDate,
  shortDate,
  cnDateTime,
} = require("./util");

const RENTAL_STATUS = {
  paid: "待发货",
  shipped: "已发货",
  in_use: "使用中",
  return_pending: "待归还",
  completed: "已完成",
  cancelled: "已取消",
  refund_requested: "退款处理中",
  refunded: "已退款",
};

const PHOTO_STATUS = {
  deposit_paid: "待确认",
  confirmed: "待服务",
  shooting: "拍摄中",
  selecting: "待选片",
  delivering: "修片中",
  completed: "已完成",
  cancelled: "已取消",
};

const RENTAL_FLOW = ["paid", "shipped", "in_use", "return_pending", "completed"];
const PHOTO_FLOW = ["deposit_paid", "confirmed", "shooting", "selecting", "completed"];

const DELIVERY = {
  hotel: { fee: 15, label: "酒店配送" },
  express: { fee: 18, label: "顺丰快递" },
  pickup: { fee: 0, label: "门店自提" },
};

function statusLabel(type, status) {
  return (type === "photo" ? PHOTO_STATUS : RENTAL_STATUS)[status] || status;
}

function statusOptions(type) {
  return Object.entries(type === "photo" ? PHOTO_STATUS : RENTAL_STATUS).map(([value, label]) => ({
    value,
    label,
  }));
}

function dayPrice(price, days) {
  const n = Number(days) || 3;
  if (n === 3) return Number(price);
  if (n === 5) return Math.round(Number(price) * 1.5);
  if (n === 7) return Math.round(Number(price) * 1.9);
  return Math.round((Number(price) / 3) * n);
}

function deliveryInfo(delivery) {
  return DELIVERY[delivery] || DELIVERY.hotel;
}

function shortDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function timelineForRental(status, ctx) {
  const start = ctx.startDate;
  const end = ctx.endDate;
  const paidTime = shortDateTime(ctx.createdAt);

  if (status === "cancelled") {
    return [
      { label: "支付成功", time: paidTime, state: "done" },
      { label: "订单已取消", time: shortDateTime(ctx.updatedAt || ctx.createdAt), state: "current" },
    ];
  }
  if (status === "refund_requested") {
    return [
      { label: "支付成功", time: paidTime, state: "done" },
      { label: "退款处理中", time: "预计 1-3 个工作日", state: "current" },
    ];
  }
  if (status === "refunded") {
    return [
      { label: "支付成功", time: paidTime, state: "done" },
      { label: "退款完成", time: shortDateTime(ctx.updatedAt || ctx.createdAt), state: "done" },
    ];
  }

  const steps = [
    { label: "支付成功", time: paidTime },
    {
      label: "商家消毒打包",
      time: start ? `预计 ${shortDate(addDaysToDate(start, -2))} 18:00 前` : "待商家处理",
    },
    {
      label: "配送到酒店",
      time: start ? `预计 ${shortDate(addDaysToDate(start, -1))} 14:00 前` : "待配送",
    },
    {
      label: "使用中",
      time: start && end ? `${shortDate(start)} - ${shortDate(end)}` : "",
    },
    {
      label: "归还 / 退押金",
      time: end ? `${shortDate(addDaysToDate(end, 1))} 前` : "",
    },
  ];

  const progress = {
    paid: 1,
    shipped: 2,
    in_use: 3,
    return_pending: 4,
    completed: 5,
  }[status] ?? 1;

  return steps.map((step, index) => ({
    ...step,
    state: index < progress ? "done" : index === progress ? "current" : "todo",
  }));
}

function timelineForPhoto(status, ctx) {
  const paidTime = shortDateTime(ctx.createdAt);
  if (status === "cancelled") {
    return [
      { label: "定金支付", time: paidTime, state: "done" },
      { label: "预约已取消", time: shortDateTime(ctx.updatedAt || ctx.createdAt), state: "current" },
    ];
  }

  const steps = [
    { label: "定金支付", time: paidTime },
    { label: "摄影师确认", time: "预计 2 小时内" },
    { label: "拍摄", time: ctx.slot || "待确认档期" },
    { label: "选片 / 精修", time: "拍摄后 7-15 天" },
    { label: "交付 / 尾款", time: "精修完成后" },
  ];

  const progress = {
    deposit_paid: 1,
    confirmed: 2,
    shooting: 2,
    selecting: 3,
    delivering: 3,
    completed: 5,
  }[status] ?? 1;

  return steps.map((step, index) => ({
    ...step,
    state: index < progress ? "done" : index === progress ? "current" : "todo",
  }));
}

function buildTimeline(type, status, ctx = {}) {
  return type === "photo" ? timelineForPhoto(status, ctx) : timelineForRental(status, ctx);
}

function defaultStatusSub(type, status, ctx = {}) {
  const start = ctx.startDate;
  const end = ctx.endDate;
  const slot = ctx.slot || "";
  const deposit = Number(ctx.deposit || 0);

  if (type === "photo") {
    return {
      deposit_paid: `${slot} · 摄影师将在 2 小时内确认`,
      confirmed: `${slot} · 摄影师已确认，请提前 15 分钟到达`,
      shooting: `${slot} · 正在拍摄`,
      selecting: "拍摄完成，请在 7 天内选片",
      delivering: "已选片，精修预计 15 天内交付",
      completed: "精修已交付，感谢你的选择",
      cancelled: "预约已取消，定金将原路退回",
    }[status] || "";
  }

  return {
    paid: start ? `商家正在消毒打包，预计 ${shortDate(addDaysToDate(start, -2))} 18:00 前发出` : "商家正在消毒打包",
    shipped: start ? `已从商家发出，预计 ${shortDate(addDaysToDate(start, -1))} 送达` : "已从商家发出",
    in_use: start && end ? `${shortDate(start)} - ${shortDate(end)} · 穿着中，注意归还时间` : "使用中",
    return_pending: end ? `请在 ${shortDate(addDaysToDate(end, 1))} 前寄回或预约上门取件` : "待归还",
    completed: `订单已完成，押金 ¥${deposit} 将在质检后原路退回`,
    cancelled: "订单已取消，款项将原路退回",
    refund_requested: "退款申请已提交，客服将在 1 个工作日内处理",
    refunded: "退款已完成，预计 1-3 个工作日到账",
  }[status] || "";
}

module.exports = {
  RENTAL_STATUS,
  PHOTO_STATUS,
  RENTAL_FLOW,
  PHOTO_FLOW,
  DELIVERY,
  statusLabel,
  statusOptions,
  dayPrice,
  deliveryInfo,
  buildTimeline,
  defaultStatusSub,
  shortDateTime,
};
