const { parseJson, maskPhone, maskOpenid } = require("./util");
const { statusLabel, statusOptions } = require("./orderLogic");

function relativeTime(value) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return String(value);
  const diff = Date.now() - time;
  if (diff < 60e3) return "刚刚";
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)} 分钟前`;
  if (diff < 86400e3) return `${Math.floor(diff / 3600e3)} 小时前`;
  if (diff < 2 * 86400e3) return "昨天";
  if (diff < 30 * 86400e3) return `${Math.floor(diff / 86400e3)} 天前`;
  return new Date(value).toLocaleDateString("zh-CN");
}

function mapProduct(row, skus = []) {
  if (!row) return null;
  const stockBySize = {};
  let stockTotal = 0;
  let stockAvailable = 0;
  for (const sku of skus) {
    stockBySize[sku.size] = {
      total: sku.stock_total,
      available: sku.stock_available,
    };
    stockTotal += sku.stock_total;
    stockAvailable += sku.stock_available;
  }
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    deposit: row.deposit,
    rating: row.rating,
    reviews: row.reviews,
    img: row.img,
    gallery: parseJson(row.gallery, []),
    styles: parseJson(row.styles, []),
    badge: row.badge || "",
    sizes: parseJson(row.sizes, []),
    fit: row.fit,
    model: row.model,
    merchant: row.merchant,
    includes: row.includes,
    real: parseJson(row.real, []),
    city: row.city,
    status: row.status,
    sortOrder: row.sort_order,
    skus: skus.map((sku) => ({
      id: sku.id,
      size: sku.size,
      stockTotal: sku.stock_total,
      stockAvailable: sku.stock_available,
    })),
    stockBySize,
    stockTotal,
    stockAvailable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPhotographer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    avatar: row.avatar,
    cover: row.cover,
    rating: row.rating,
    orders: row.orders_count,
    ordersCount: row.orders_count,
    price: row.price,
    tags: parseJson(row.tags, []),
    works: parseJson(row.works, []),
    bio: row.bio,
    package: {
      title: row.package_title,
      desc: row.package_desc,
      price: row.package_price,
      deposit: row.package_deposit,
      includes: parseJson(row.package_includes, []),
    },
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMakeup(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    avatar: row.avatar,
    desc: row.description,
    description: row.description,
    tags: parseJson(row.tags, []),
    price: row.price,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPost(row, liked = false) {
  if (!row) return null;
  return {
    id: row.id,
    user: row.user_name,
    userName: row.user_name,
    avatar: row.avatar,
    city: row.city,
    text: row.text,
    images: parseJson(row.images, []),
    tags: parseJson(row.tags, []),
    product: row.product_id,
    productId: row.product_id,
    likes: row.likes,
    comments: row.comments,
    liked: !!liked,
    status: row.status,
    time: relativeTime(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicIdentity(row) {
  const masked = row.type === "phone" ? maskPhone(row.value) : maskOpenid(row.value);
  return {
    id: row.id,
    type: row.type,
    typeLabel: row.type === "phone" ? "手机号" : "微信",
    valueMasked: masked,
    nickname: row.nickname || "",
    avatar: row.avatar || "",
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapUser(row, identities = []) {
  if (!row) return null;
  const phone = identities.find((identity) => identity.type === "phone");
  const wechat = identities.find((identity) => identity.type === "wechat");
  return {
    id: row.id,
    nickname: row.nickname,
    avatar: row.avatar,
    realName: row.real_name,
    gender: row.gender,
    height: row.height,
    weight: row.weight,
    size: row.size,
    city: row.city,
    memberLevel: row.member_level,
    depositCredit: row.deposit_credit,
    status: row.status,
    address: {
      name: row.address_name,
      phone: row.address_phone,
      text: row.address_text,
    },
    addressName: row.address_name,
    addressPhone: row.address_phone,
    addressText: row.address_text,
    phoneMasked: phone ? maskPhone(phone.value) : "",
    wechatMasked: wechat ? maskOpenid(wechat.value) : "",
    hasPhone: !!phone,
    hasWechat: !!wechat,
    identities: identities.map(publicIdentity),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrder(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    orderNo: row.order_no,
    type: row.type,
    typeLabel: row.type === "photo" ? "摄影订单" : "租衣订单",
    status: statusLabel(row.type, row.status),
    statusCode: row.status,
    statusSub: row.status_sub,
    title: row.title,
    image: row.image,
    date: row.date_text,
    merchant: row.merchant,
    paid: row.paid,
    deposit: row.deposit,
    balance: row.balance,
    size: row.size,
    days: row.days,
    delivery: row.delivery,
    deliveryLabel: {
      hotel: "酒店配送",
      express: "顺丰快递",
      pickup: "门店自提",
    }[row.delivery] || "",
    insurance: !!row.insurance,
    address: {
      name: row.address_name,
      phone: row.address_phone,
      text: row.address_text,
    },
    timeline: parseJson(row.timeline, []),
    slot: row.slot,
    productId: row.product_id,
    photographerId: row.photographer_id,
    startDate: row.start_date,
    endDate: row.end_date,
    adminNote: row.admin_note,
    depositStatus: extra.depositStatus || null,
    depositRefundedAmount: extra.depositRefundedAmount || 0,
    userId: row.user_id,
    userName: extra.userName || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeposit(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    orderNo: extra.orderNo || "",
    userId: row.user_id,
    userName: extra.userName || "",
    userPhone: extra.userPhone || "",
    amount: row.amount,
    status: row.status,
    statusLabel: {
      held: "冻结中",
      refunded: "已退回",
      deducted: "部分扣除",
    }[row.status] || row.status,
    refundedAmount: row.refunded_amount,
    note: row.note,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    roleLabel: row.role === "super" ? "超级管理员" : "运营",
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

module.exports = {
  relativeTime,
  mapProduct,
  mapPhotographer,
  mapMakeup,
  mapPost,
  mapUser,
  mapOrder,
  mapDeposit,
  mapAdmin,
  publicIdentity,
  statusOptions,
};
