/* =========================================================
   未命名项目 · 旅行拍照租衣平台
   Vanilla JS · 单页多屏 · 本地后端 API
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const img = (name) => {
  const value = String(name || "");
  if (!value) return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("/") || value.startsWith("data:")) return value;
  return `assets/img/${value}.jpg`;
};
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* ---------------------------------------------------------
   API / session
   --------------------------------------------------------- */
const API_BASE = window.CT_API_BASE || "/api";
const TOKEN_KEY = "ct_token";
let AUTH = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  stats: { orders: 0, favorites: 0 },
};
let CITIES = [];
let booting = true;
let bootError = "";
let mergeConflict = null;
let orderSubmitting = false;

function deviceWechatCode() {
  let value = localStorage.getItem("ct_wx_code");
  if (!value) {
    value = `wx-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("ct_wx_code", value);
  }
  return value;
}

const loginState = {
  phone: "13800000001",
  code: "",
  devCode: "",
  wechatCode: deviceWechatCode(),
  busy: false,
  error: "",
};

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (AUTH.token) headers.Authorization = `Bearer ${AUTH.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(data.message || `请求失败（${response.status}）`);
    error.status = response.status;
    error.data = data;
    if (response.status === 401 && AUTH.token) {
      clearSession();
      booting = false;
      state.screen = "login";
      render();
      seedAppHistory([screenSnapshot()]);
    }
    throw error;
  }
  return data;
}

function setSession(token, user) {
  AUTH.token = token;
  AUTH.user = user;
  localStorage.setItem(TOKEN_KEY, token);
}

function clearSession() {
  AUTH = { token: "", user: null, stats: { orders: 0, favorites: 0 } };
  localStorage.removeItem(TOKEN_KEY);
  PRODUCTS = [];
  PHOTOGRAPHERS = [];
  MAKEUP_ARTISTS = [];
  POSTS = [];
  ORDERS = [];
  CITIES = [];
  state.liked = {};
  state.likedPosts = {};
}

async function loadBootstrapData() {
  const [productData, photographerData, makeupData, postData, orderData, cityData, favoriteData, meData] =
    await Promise.all([
      api("/products"),
      api("/photographers"),
      api("/makeup"),
      api("/posts"),
      api("/orders"),
      api("/cities"),
      api("/favorites"),
      api("/auth/me"),
    ]);
  PRODUCTS = productData.items || [];
  PHOTOGRAPHERS = photographerData.items || [];
  MAKEUP_ARTISTS = makeupData.items || [];
  POSTS = postData.items || [];
  ORDERS = orderData.items || [];
  CITIES = cityData.items || [];
  state.liked = Object.fromEntries((favoriteData.items || []).map((item) => [item.id, true]));
  state.likedPosts = Object.fromEntries(POSTS.filter((post) => post.liked).map((post) => [post.id, true]));
  AUTH.user = meData.user;
  AUTH.stats = meData.stats || { orders: ORDERS.length, favorites: favoriteData.items.length };

  if (!PRODUCTS.some((item) => item.id === state.productId)) state.productId = PRODUCTS[0]?.id || "white";
  if (!PHOTOGRAPHERS.some((item) => item.id === state.photoId)) state.photoId = PHOTOGRAPHERS[0]?.id || "alan";
  if (!state.slot || !state.slot.includes(":")) state.slot = photoSlots()[0];
}

/* ---------------------------------------------------------
   Date helpers
   --------------------------------------------------------- */
function shortDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function rentalWindow(days = state.days) {
  const today = new Date();
  const ship = addDays(today, 1);
  const deliver = addDays(today, 2);
  const start = addDays(today, 3);
  const end = addDays(start, Math.max(0, Number(days) - 1));
  const returnBy = addDays(end, 1);
  return { ship, deliver, start, end, returnBy };
}

function rentalRangeLabel(days = state.days) {
  const { start, end } = rentalWindow(days);
  return `${shortDay(start)} - ${shortDay(end)}`;
}

function photoSlots() {
  const today = new Date();
  const result = [];
  for (const offset of [2, 3]) {
    const date = addDays(today, offset);
    result.push(`${shortDay(date)} 09:00`, `${shortDay(date)} 15:00`);
  }
  return result;
}

function deliveryLabelOf(order) {
  return order.delivery === "express" ? "顺丰快递" : order.delivery === "pickup" ? "门店自提" : "酒店配送";
}

function orderStatusIsRentalPending(order) {
  return order.type === "rental" && ["paid", "shipped"].includes(order.statusCode);
}

/* ---------------------------------------------------------
   Data
   --------------------------------------------------------- */
let PRODUCTS = [];

let PHOTOGRAPHERS = [];

let MAKEUP_ARTISTS = [];

let POSTS = [];

let ORDERS = [];

/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */
const state = {
  screen: "home",
  tab: "home",
  productId: "white",
  photoId: "alan",
  orderId: "r1",
  galleryIndex: 0,
  size: "M",
  days: 3,
  delivery: "hotel",
  insurance: false,
  agreed: true,
  liked: {},
  likedPosts: {},
  homeStyle: "全部",
  rentStyle: "全部",
  photoStyle: "全部",
  communityTab: "推荐",
  orderFilter: "all",
  slot: "",
  city: "三亚",
};

let toastTimer = null;

/* ---------------------------------------------------------
   Browser / phone back button
   --------------------------------------------------------- */
function screenSnapshot() {
  return {
    screen: state.screen,
    tab: state.tab,
    productId: state.productId,
    photoId: state.photoId,
    orderId: state.orderId,
    galleryIndex: state.galleryIndex,
    size: state.size,
    days: state.days,
    delivery: state.delivery,
    insurance: state.insurance,
    agreed: state.agreed,
    homeStyle: state.homeStyle,
    rentStyle: state.rentStyle,
    photoStyle: state.photoStyle,
    communityTab: state.communityTab,
    orderFilter: state.orderFilter,
    slot: state.slot,
    city: state.city,
  };
}

function pushAppState() {
  window.history.pushState({ ct: true, snap: screenSnapshot() }, "", window.location.href);
}

function replaceAppState() {
  window.history.replaceState({ ct: true, snap: screenSnapshot() }, "", window.location.href);
}

function seedAppHistory(entries) {
  const list = entries && entries.length ? entries : [screenSnapshot()];
  window.history.replaceState({ ct: true, root: true, snap: list[0] }, "", window.location.href);
  for (let i = 1; i < list.length; i += 1) {
    window.history.pushState({ ct: true, snap: list[i] }, "", window.location.href);
  }
  if (list.length === 1) {
    window.history.pushState({ ct: true, guard: true, snap: list[0] }, "", window.location.href);
  }
}

function applySnapshot(snap) {
  if (!snap || !SCREENS[snap.screen]) return;
  closeSheet();
  Object.assign(state, snap);
  render();
}

window.addEventListener("popstate", (event) => {
  const overlay = $("#overlay");
  if (overlay && overlay.classList.contains("open")) {
    closeSheet();
    window.history.pushState({ ct: true, guard: true, snap: screenSnapshot() }, "", window.location.href);
    return;
  }
  const snap = event.state && event.state.snap;
  if (snap) {
    applySnapshot(snap);
    if (event.state.root) {
      /* 已在应用最底层：再补一条 guard，避免继续返回到站外页面 */
      window.history.pushState({ ct: true, guard: true, snap: screenSnapshot() }, "", window.location.href);
    }
    return;
  }
  /* 没有本应用状态时留在当前页面，不跳回上一个网站 */
  render();
  window.history.pushState({ ct: true, guard: true, snap: screenSnapshot() }, "", window.location.href);
});

/* ---------------------------------------------------------
   Icons
   --------------------------------------------------------- */
const ICONS = {
  home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5.2 9.8V20h13.6V9.8"/><path d="M9.5 20v-5.4h5V20"/>',
  hanger: '<path d="M12 7.2a2.2 2.2 0 1 1 2.2-2.2"/><path d="M12 7.2v1.4"/><path d="m12 8.6-8.1 5.3c-.8.5-.5 1.8.5 1.8h15.2c1 0 1.3-1.3.5-1.8L12 8.6Z"/>',
  camera: '<path d="M4 8.5h3l1.2-1.8h7.6L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.2"/>',
  heart: '<path d="M20.6 5.9a5 5 0 0 0-7.1 0L12 7.4l-1.5-1.5a5 5 0 0 0-7.1 7.1L12 21l8.6-8a5 5 0 0 0 0-7.1Z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.7-3.4 3.6-5.4 7.2-5.4s6.5 2 7.2 5.4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 7-2.5 7-2.5 7h17S18 16 18 9"/><path d="M10 20h4"/>',
  pin: '<path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  shield: '<path d="M12 3 20 6v5.2c0 5-3.4 8.2-8 9.8-4.6-1.6-8-4.8-8-9.8V6l8-3Z"/><path d="m8.5 12 2.4 2.4 4.6-5"/>',
  truck: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  arrowRight: '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>',
  share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.2M8.3 13.3l7.4 4.2"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 9.5 9.5 0 0 1-3.2-.5L4 21l1.7-4.3A8.2 8.2 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v3h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

function icon(name, size = 20, stroke = 1.8) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
const EMPTY_PRODUCT = {
  id: "",
  title: "商品加载中",
  price: 0,
  deposit: 0,
  rating: 0,
  reviews: 0,
  img: "white-dress",
  gallery: ["white-dress"],
  styles: [],
  sizes: ["M"],
  fit: "",
  model: "",
  merchant: "",
  includes: "",
  real: ["white-dress"],
  badge: "",
};
const EMPTY_PHOTOGRAPHER = {
  id: "",
  name: "摄影师",
  title: "",
  avatar: "model-1",
  cover: "hero-beach",
  rating: 0,
  orders: 0,
  price: 0,
  tags: [],
  works: ["hero-beach"],
  bio: "",
  package: { title: "拍摄套餐", desc: "", price: 0, deposit: 0, includes: [] },
};
const productById = (id) => PRODUCTS.find((p) => p.id === id) || PRODUCTS[0] || EMPTY_PRODUCT;
const photographerById = (id) => PHOTOGRAPHERS.find((p) => p.id === id) || PHOTOGRAPHERS[0] || EMPTY_PHOTOGRAPHER;
const dayPrice = (p, days) =>
  days === 3 ? p.price : days === 5 ? Math.round(p.price * 1.5) : Math.round(p.price * 1.9);
const deliveryFee = () => (state.delivery === "hotel" ? 15 : state.delivery === "express" ? 18 : 0);
const deliveryLabel = () =>
  state.delivery === "hotel" ? "酒店配送" : state.delivery === "express" ? "顺丰快递" : "门店自提";
const bookingTotal = (p) =>
  Math.max(0, dayPrice(p, state.days) + p.deposit + deliveryFee() + (state.insurance ? 9 : 0) - 20);
const formatMoney = (n) => `¥${n}`;

function toast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}

function handleActionError(error) {
  if (error?.status === 401) {
    clearSession();
    booting = false;
    state.screen = "login";
    render();
    toast("登录状态已失效，请重新登录");
    return;
  }
  toast(error?.message || "操作失败，请稍后再试");
}

/* ---------------------------------------------------------
   Navigation
   --------------------------------------------------------- */
function switchTab(tab) {
  closeSheet();
  if (!AUTH.token) {
    render();
    return;
  }
  if (state.screen === tab && state.tab === tab) {
    render();
    return;
  }
  state.tab = tab;
  state.screen = tab;
  pushAppState();
  render();
}

function go(screen, extra = {}) {
  closeSheet();
  state.screen = screen;
  Object.assign(state, extra);
  pushAppState();
  render();
}

function back() {
  closeSheet();
  window.history.back();
}

function openProduct(id) {
  const p = productById(id);
  const availableSizes = p.sizes.filter((size) => (p.stockBySize?.[size]?.available ?? 1) > 0);
  const size = availableSizes.includes("M") ? "M" : availableSizes[0] || p.sizes[0];
  go("product", {
    productId: p.id || id,
    galleryIndex: 0,
    size,
    days: 3,
    delivery: "hotel",
    insurance: false,
    agreed: true,
  });
}

/* ---------------------------------------------------------
   Shared UI
   --------------------------------------------------------- */
function tabbar(active) {
  const items = [
    { id: "home", label: "首页", icon: "home" },
    { id: "rent", label: "租衣", icon: "hanger" },
    { id: "photo", label: "摄影", icon: "camera" },
    { id: "community", label: "社区", icon: "heart" },
    { id: "profile", label: "我的", icon: "user" },
  ];
  return `<nav class="tabbar">${items
    .map(
      (it) => `<button class="tab ${active === it.id ? "active" : ""}" data-action="tab" data-tab="${it.id}">
        <span class="tab-icon">${icon(it.icon, 20, active === it.id ? 2.2 : 1.8)}</span>
        <span>${it.label}</span>
      </button>`
    )
    .join("")}</nav>`;
}

function pageHeader(title, right = "") {
  return `<div class="page-head">
    <button class="back" data-action="back" aria-label="返回">${icon("chevronLeft", 18)}</button>
    <h2>${title}</h2>
    <div class="right-slot">${right}</div>
  </div>`;
}

function productCard(p) {
  return `<div class="product-card" data-action="open-product" data-id="${esc(p.id)}" data-style="${esc(p.styles.join(","))}" data-search="${esc(`${p.title} ${p.styles.join(" ")}`)}">
    <div class="product-img">
      <img src="${esc(img(p.img))}" alt="${esc(p.title)}" loading="lazy" />
      <button class="fav ${state.liked[p.id] ? "active" : ""}" data-action="like-product" data-id="${esc(p.id)}" aria-label="收藏">${icon("heart", 15)}</button>
      ${p.badge ? `<span class="badge-top">${esc(p.badge)}</span>` : ""}
    </div>
    <div class="product-body">
      <p class="product-title">${esc(p.title)}</p>
      <div class="product-meta"><span class="stars">★★★★★</span>${p.rating} · ${p.reviews} 条</div>
      <div class="price-row"><span class="price">¥${p.price}<small>/3天</small></span></div>
      <div class="deposit">押金 ¥${p.deposit} · 可信用免押</div>
    </div>
  </div>`;
}

function orderCard(o) {
  const isPhoto = o.type === "photo";
  const actionButtons = isPhoto
    ? `<button class="mini-btn" data-action="photo-reschedule" data-id="${esc(o.id)}">改期</button><button class="mini-btn primary" data-action="toast" data-message="摄影师会在 10 分钟内回复">联系摄影师</button>`
    : o.status === "待发货"
      ? `<button class="mini-btn" data-action="order-refund" data-id="${esc(o.id)}">申请退款</button><button class="mini-btn primary" data-action="toast" data-message="商家会在 10 分钟内回复">联系商家</button>`
      : `<button class="mini-btn primary" data-action="toast" data-message="已为你找到同款可租日期">再次租赁</button>`;

  return `<div class="order-card" data-action="open-order" data-id="${esc(o.id)}">
    <div class="order-card-head"><span>${isPhoto ? "摄影订单" : "租衣订单"} · ${esc(o.orderNo)}</span><b>${esc(o.status)}</b></div>
    <div class="order-card-body">
      <img src="${esc(img(o.image))}" alt="${esc(o.title)}" loading="lazy" />
      <div class="info">
        <h3>${esc(o.title)}</h3>
        <p>${esc(o.date)}</p>
        <p>${esc(o.merchant)}</p>
        <div class="price">¥${o.paid}<small> ${isPhoto ? "已付定金" : "实付"}</small></div>
      </div>
    </div>
    <div class="order-card-foot">${actionButtons}</div>
  </div>`;
}

/* ---------------------------------------------------------
   Home
   --------------------------------------------------------- */
function homeScreen() {
  const heroProducts = PRODUCTS.slice(0, 4);
  const availablePieces = PRODUCTS.reduce((total, item) => total + (item.stockAvailable || 0), 0);
  return `<div class="screen">
    <div class="screen-scroll">
      <div class="home-top">
        <div class="home-head">
          <button class="loc" data-action="city-sheet">${icon("pin", 18)} ${state.city} ${icon("chevronDown", 13)}</button>
          <div class="head-actions">
            <button class="icon-btn" data-action="go-search" aria-label="搜索">${icon("search", 18)}</button>
            <button class="icon-btn" data-action="toast" data-message="暂时没有新消息" aria-label="消息">${icon("bell", 18)}</button>
          </div>
        </div>
        <div class="weather">
          <b>28° 晴</b><span class="dot"></span>海风 3 级<span class="dot"></span>适合白色 / 浅色
          <button class="link" data-action="go" data-screen="city">穿搭攻略 →</button>
        </div>
      </div>

      <div style="padding:0 20px">
        <div class="hero" data-action="open-product" data-id="white">
          <img src="${img("hero-beach")}" alt="三亚海边" />
          <span class="hero-float">今日可约 ${availablePieces} 件</span>
          <div class="hero-content">
            <div class="eyebrow">SANYA · 海岛限定</div>
            <h2>海风白裙计划</h2>
            <p>租一套白裙 + 2 小时跟拍<br />送到酒店，离店归还</p>
            <button class="hero-btn">¥1,199 起 · 查看套装 ${icon("arrowRight", 12)}</button>
          </div>
        </div>
      </div>

      <div class="section" style="margin:16px 0 0">
        <div class="quick-grid">
          <button class="quick" data-action="tab" data-tab="rent">
            <span class="q-icon">${icon("hanger", 19)}</span><span>租衣</span>
          </button>
          <button class="quick" data-action="go" data-screen="photo">
            <span class="q-icon">${icon("camera", 19)}</span><span>找摄影</span>
          </button>
          <button class="quick" data-action="go" data-screen="makeup">
            <span class="q-icon">${icon("sparkle", 19)}</span><span>找化妆</span>
          </button>
          <button class="quick" data-action="go" data-screen="city">
            <span class="q-icon">${icon("map", 19)}</span><span>城市</span>
          </button>
        </div>
      </div>

      <div class="section" style="padding:0">
        <div class="section-head" style="padding:0 20px">
          <h3>精选客片</h3>
          <button class="more" data-action="tab" data-tab="community">看社区 ${icon("arrowRight", 12)}</button>
        </div>
        <div class="story-row">
          <div class="story" data-action="open-product" data-id="white">
            <img src="${img("white-dress")}" alt="白裙客片" /><div class="story-info"><b>白裙 + 海风</b><span>三亚 · 阿岚作品</span></div>
          </div>
          <div class="story" data-action="open-product" data-id="floral">
            <img src="${img("floral-dress")}" alt="碎花客片" /><div class="story-info"><b>碎花和日落</b><span>后海村 · 小野作品</span></div>
          </div>
          <div class="story" data-action="open-product" data-id="blue">
            <img src="${img("blue-coat")}" alt="蓝白小巷" /><div class="story-info"><b>蓝白小巷</b><span>天涯镇 · 陈一作品</span></div>
          </div>
          <div class="story" data-action="open-product" data-id="desert">
            <img src="${img("desert-set")}" alt="沙丘套装" /><div class="story-info"><b>沙丘电影感</b><span>亚龙湾 · 阿岚作品</span></div>
          </div>
        </div>
      </div>

      <div class="section home-styles">
        <div class="section-head">
          <h3>按风格选</h3>
          <button class="more" data-action="tab" data-tab="rent">全部 ${icon("arrowRight", 12)}</button>
        </div>
        <div class="chips" id="home-chips">
          ${["全部", "海岛", "法式", "城市", "复古"]
            .map(
              (s) =>
                `<button class="chip ${state.homeStyle === s ? "active" : ""}" data-action="filter-home" data-style="${s}">${s}</button>`
            )
            .join("")}
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>热门可租</h3>
          <button class="more" data-action="tab" data-tab="rent">查看全部 ${icon("arrowRight", 12)}</button>
        </div>
        <div class="product-grid" id="home-grid">
          ${heroProducts.map(productCard).join("")}
        </div>
      </div>

      <div class="package">
        <span class="tag">闺蜜旅拍 · 2 人同行</span>
        <h4>租衣 + 妆造 + 摄影，¥1,199 起</h4>
        <p>白裙/碎花任选 · 2 小时跟拍 · 9 张精修 · 酒店送达</p>
        <button data-action="go" data-screen="photo">看看套餐 ${icon("arrowRight", 12)}</button>
      </div>
    </div>
    ${tabbar("home")}
  </div>`;
}

/* ---------------------------------------------------------
   Rent list
   --------------------------------------------------------- */
function rentScreen() {
  const stock = PRODUCTS.reduce((total, item) => total + (item.stockAvailable || 0), 0);
  const win = rentalWindow(3);
  return `<div class="screen">
    <div class="screen-scroll">
      <div class="list-head">
        <div class="list-title">
          <div>
            <h1>租衣</h1>
            <div class="sub">${esc(state.city)} · ${stock} 件可租 · 支持酒店送达</div>
          </div>
          <button class="icon-btn" data-action="city-sheet" aria-label="切换城市">${icon("pin", 18)}</button>
        </div>
        <div class="search-bar">
          ${icon("search", 16)}
          <input type="search" placeholder="搜白裙 / 碎花 / 法式..." data-role="search" />
        </div>
        <div class="date-bar">
          <button class="date-pill" data-action="toast" data-message="日期选择器将在下一版开放">${icon("calendar", 13)} ${rentalRangeLabel()} ${icon("chevronDown", 12)}</button>
          <span class="date-note">含物流缓冲 · ${shortDay(win.ship)} 发货</span>
        </div>
        <div class="chips" id="rent-chips">
          ${["全部", "海岛", "法式", "城市", "复古"]
            .map(
              (s) =>
                `<button class="chip ${state.rentStyle === s ? "active" : ""}" data-action="filter-rent" data-style="${s}">${s}</button>`
            )
            .join("")}
        </div>
        <div class="filter-row">
          <span>综合推荐</span>
          <button data-action="toast" data-message="筛选器将在下一版开放">筛选 ${icon("filter", 13)}</button>
        </div>
      </div>
      <div class="rent-grid-wrap">
        <div class="rent-count" id="rent-count">为你找到 ${PRODUCTS.length} 套 · 按可租日期排序</div>
        <div class="product-grid" id="rent-grid">${PRODUCTS.map(productCard).join("")}</div>
      </div>
    </div>
    ${tabbar("rent")}
  </div>`;
}

/* ---------------------------------------------------------
   Product detail
   --------------------------------------------------------- */
function productScreen() {
  const p = productById(state.productId);
  const price = dayPrice(p, state.days);
  const total = bookingTotal(p);
  return `<div class="screen has-bottom">
    <div class="screen-scroll">
      <div class="detail-hero">
        <img id="detail-img" src="${esc(img(p.gallery[state.galleryIndex] || p.gallery[0]))}" alt="${esc(p.title)}" />
        <div class="detail-top">
          <button class="glass-btn" data-action="back" aria-label="返回">${icon("chevronLeft", 18)}</button>
          <div class="detail-top-right">
            <button class="glass-btn" data-action="toast" data-message="分享链接已复制">${icon("share", 16)}</button>
            <button class="glass-btn ${state.liked[p.id] ? "active" : ""}" data-action="like-product" data-id="${esc(p.id)}" aria-label="收藏">${icon("heart", 16)}</button>
          </div>
        </div>
        <div class="detail-dots">
          ${p.gallery
            .map(
              (_, i) =>
                `<button class="dot ${i === state.galleryIndex ? "active" : ""}" data-action="gallery" data-index="${i}" aria-label="图片 ${i + 1}"></button>`
            )
            .join("")}
        </div>
      </div>

      <div class="detail-sheet">
        <h1>${esc(p.title)}</h1>
        <div class="detail-sub"><span class="stars">★★★★★</span>${p.rating} · ${p.reviews} 条真实评价 · ${esc(p.merchant)}</div>
        <div class="detail-price">
          <span class="price" data-role="detail-price">¥${price}<small>/${state.days}天</small></span>
          <span class="deposit-text">押金 ¥${p.deposit} · 可信用免押</span>
        </div>
        <div class="trust-row">
          <span class="trust">${icon("shield", 12)} 一客一洗一消毒</span>
          <span class="trust">${icon("check", 12)} 封签验货</span>
          <span class="trust">${icon("truck", 12)} 酒店送达</span>
        </div>

        <div class="selector">
          <div class="selector-head"><b>选尺码</b><span>${esc(p.fit)}</span></div>
          <div class="opt-row">
            ${p.sizes
              .map((s) => {
                const available = p.stockBySize?.[s]?.available;
                const soldOut = available !== undefined && available <= 0;
                return `<button class="opt ${state.size === s ? "active" : ""} ${soldOut ? "sold-out" : ""}" data-action="select-size" data-size="${esc(s)}" ${soldOut ? "disabled" : ""}>${esc(s)}<small>${soldOut ? "暂时租完" : available !== undefined ? `可租 ${available} 件` : "建议按体重选"}</small></button>`;
              })
              .join("")}
          </div>
        </div>

        <div class="selector">
          <div class="selector-head"><b>选租期</b><span>${rentalRangeLabel()}</span></div>
          <div class="opt-row">
            ${[3, 5, 7]
              .map(
                (d) =>
                  `<button class="opt ${state.days === d ? "active" : ""}" data-action="select-days" data-days="${d}">${d} 天<small>¥${dayPrice(p, d)}</small></button>`
              )
              .join("")}
          </div>
        </div>

        <div class="selector">
          <div class="selector-head"><b>配送方式</b><span>三亚全城可送</span></div>
          <div class="opt-row">
            <button class="opt ${state.delivery === "hotel" ? "active" : ""}" data-action="select-delivery" data-delivery="hotel">酒店配送<small>¥15 · 前台代收</small></button>
            <button class="opt ${state.delivery === "express" ? "active" : ""}" data-action="select-delivery" data-delivery="express">快递<small>¥18 · 顺丰</small></button>
            <button class="opt ${state.delivery === "pickup" ? "active" : ""}" data-action="select-delivery" data-delivery="pickup">门店自提<small>免费 · 10:00-21:00</small></button>
          </div>
        </div>

        <div class="model-card">
          <img src="${img("model-2")}" alt="模特试穿" />
          <div><b>模特参考 · ${esc(p.model || "168cm / 50kg · 穿 S")}</b><span>${esc(p.fit || "按日常尺码选择即可")}</span></div>
          <em class="size-tag">穿 ${esc(state.size)}</em>
        </div>

        <div class="section-head" style="margin-top:18px"><h3>真实客片</h3><span style="font-size:9px;color:var(--muted)">${p.reviews} 位女生穿过</span></div>
        <div class="real-look-row">
          ${p.real
            .map(
              (r, i) =>
                `<div class="real-look"><img src="${esc(img(r))}" alt="客片" loading="lazy" /><span>${i === 0 ? "三亚 · 亚龙湾" : i === 1 ? "后海村 · 日落" : "酒店阳台"}</span></div>`
            )
            .join("")}
        </div>

        <div class="rules">
          <div class="rule"><span>清洗消毒</span><span>一客一洗 · 封签 · 可查记录</span></div>
          <div class="rule"><span>押金退还</span><span>质检后 1-3 个工作日</span></div>
          <div class="rule"><span>损坏 / 逾期</span><span>明示标准 · 平台仲裁 ${icon("chevronRight", 12)}</span></div>
        </div>
      </div>
    </div>

    <div class="detail-bottom">
      <button class="mini-action ${state.liked[p.id] ? "active" : ""}" data-action="like-product" data-id="${esc(p.id)}">${icon("heart", 20)}<span>收藏</span></button>
      <button class="mini-action" data-action="toast" data-message="客服将在 1 分钟内回复">${icon("chat", 20)}<span>客服</span></button>
      <div class="rest-price"><span class="price" data-role="detail-total">¥${total}</span><span data-role="detail-deposit-note">含押金 ¥${p.deposit} · 可退</span></div>
      <button class="btn-primary" data-action="go-booking">立即租</button>
    </div>
  </div>`;
}

function refreshDetail() {
  const p = productById(state.productId);
  const price = dayPrice(p, state.days);
  const total = bookingTotal(p);
  const priceEl = $('[data-role="detail-price"]');
  const totalEl = $('[data-role="detail-total"]');
  const noteEl = $('[data-role="detail-deposit-note"]');
  if (priceEl) priceEl.innerHTML = `¥${price}<small>/${state.days}天</small>`;
  if (totalEl) totalEl.textContent = `¥${total}`;
  if (noteEl) noteEl.textContent = `含押金 ¥${p.deposit} · 可退`;
}

/* ---------------------------------------------------------
   Booking
   --------------------------------------------------------- */
function bookingScreen() {
  const p = productById(state.productId);
  const price = dayPrice(p, state.days);
  const fee = deliveryFee();
  const insurance = state.insurance ? 9 : 0;
  const total = Math.max(0, price + p.deposit + fee + insurance - 20);
  const win = rentalWindow(state.days);
  const address = AUTH.user?.address || {};
  const hasAddress = !!(address.name && address.text);
  return `<div class="screen has-bottom">
    <div class="screen-scroll">
      ${pageHeader("确认订单")}
      <div class="booking-wrap">
        <div class="booking-card">
          <h3>收货地址</h3>
          <div class="address-row">
            <div class="address-icon">${icon("pin", 17)}</div>
            <div>
              ${
                hasAddress
                  ? `<b>${esc(address.text)}</b>
                     <span>${esc(address.name)} · ${esc(address.phone)}<br />预计 ${shortDay(win.deliver)} 送达</span>`
                  : `<b>还没有收货地址</b><span>请填写酒店或民宿地址，前台可代收</span>`
              }
            </div>
            <button class="edit" data-action="edit-address">${hasAddress ? "修改" : "填写"}</button>
          </div>
        </div>

        <div class="booking-card">
          <h3>租期与物流</h3>
          <div class="date-timeline">
            <div class="date-node done"><i></i><b>${shortDay(win.ship)}</b><span>商家发货</span></div>
            <div class="date-line"></div>
            <div class="date-node done"><i></i><b>${shortDay(win.deliver)}</b><span>送达酒店</span></div>
            <div class="date-line"></div>
            <div class="date-node"><i></i><b>${shortDay(win.start)}</b><span>开始穿着</span></div>
            <div class="date-line"></div>
            <div class="date-node"><i></i><b>${shortDay(win.returnBy)}</b><span>归还截止</span></div>
          </div>
          <div style="margin-top:12px;font-size:8.5px;color:var(--muted);line-height:1.6">含物流缓冲：${shortDay(win.start)} 穿，${shortDay(win.end)} 结束，${shortDay(win.returnBy)} 前寄回或预约上门取件。</div>
        </div>

        <div class="booking-card">
          <h3>商品</h3>
          <div class="order-item-row">
            <img src="${esc(img(p.img))}" alt="${esc(p.title)}" />
            <div class="info">
              <b>${esc(p.title)}</b>
              <span>尺码 ${esc(state.size)} · ${state.days} 天 · ${deliveryLabel()}</span>
              <span>${esc(p.includes)}</span>
              <div class="p">¥${price}</div>
            </div>
          </div>
        </div>

        <div class="booking-card">
          <h3>费用明细</h3>
          <div class="fee-row"><span>租金（${state.days} 天）</span><span>¥${price}</span></div>
          <div class="fee-row"><span>押金（可退）</span><span>¥${p.deposit}</span></div>
          <div class="fee-row"><span>配送费</span><span>¥${fee}</span></div>
          <div class="fee-row" data-role="insurance-fee" style="${state.insurance ? "" : "display:none"}"><span>租赁安心险</span><span>¥9</span></div>
          <div class="fee-row"><span>新人券</span><span style="color:var(--coral-2)">-¥20</span></div>
          <div class="insurance-row">
            <button class="switch ${state.insurance ? "on" : ""}" data-action="toggle-insurance" aria-label="租赁安心险"></button>
            <span>租赁安心险 ¥9 · 损坏/丢失最高赔 ¥2,000</span>
          </div>
          <div class="fee-row total"><span>合计</span><b data-role="booking-total">¥${total}</b></div>
          <div style="margin-top:6px;font-size:7.5px;color:var(--muted)">押金 ¥${p.deposit} 将在归还质检后原路退回</div>
        </div>

        <div class="agree-row">
          <button class="check ${state.agreed ? "on" : ""}" data-action="toggle-agree" aria-label="同意协议">${icon("check", 10, 3)}</button>
          <span>我已阅读并同意 <a href="#" data-action="toast" data-message="协议详情将在下一版开放">《租赁协议》</a> 和 <a href="#" data-action="toast" data-message="规则详情将在下一版开放">《押金与损赔规则》</a></span>
        </div>
      </div>
    </div>

    <div class="booking-bottom">
      <div class="total"><span>合计（含押金 ¥${p.deposit}）</span><b data-role="booking-bottom-total">¥${total}</b></div>
      <button class="btn-primary" data-action="open-pay">提交订单</button>
    </div>
  </div>`;
}

function refreshBooking() {
  const p = productById(state.productId);
  const total = bookingTotal(p);
  const feeRow = $('[data-role="insurance-fee"]');
  const switchEl = $('[data-action="toggle-insurance"]');
  const totalEl = $('[data-role="booking-total"]');
  const bottomEl = $('[data-role="booking-bottom-total"]');
  if (feeRow) feeRow.style.display = state.insurance ? "flex" : "none";
  if (switchEl) switchEl.classList.toggle("on", state.insurance);
  if (totalEl) totalEl.textContent = `¥${total}`;
  if (bottomEl) bottomEl.textContent = `¥${total}`;
}

/* ---------------------------------------------------------
   Payment sheet
   --------------------------------------------------------- */
function openPaySheet() {
  if (!state.agreed) {
    toast("请先阅读并同意租赁协议");
    return;
  }
  const p = productById(state.productId);
  const total = bookingTotal(p);
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>确认支付</h3>
      <div class="pay-amount"><small>¥</small>${total}</div>
      <div class="pay-method">
        <span class="wx">微</span>
        <div><b>微信支付</b><span>零钱 / 银行卡</span></div>
        <span class="check-mark">${icon("check", 11, 3)}</span>
      </div>
      <div style="font-size:8.5px;color:var(--muted);line-height:1.6;margin-bottom:14px;text-align:center">含押金 ¥${p.deposit} · 归还质检后原路退回</div>
      <button class="btn-primary" data-action="confirm-pay">确认支付 ¥${total}</button>
    </div>`;
  overlay.classList.add("open");
}

function closeSheet() {
  const overlay = $("#overlay");
  overlay.classList.remove("open");
  setTimeout(() => {
    if (!overlay.classList.contains("open")) overlay.innerHTML = "";
  }, 300);
}

async function confirmPay() {
  if (orderSubmitting) return;
  if (!state.agreed) {
    toast("请先阅读并同意租赁协议");
    return;
  }
  const p = productById(state.productId);
  const address = AUTH.user?.address || {};
  if (!address.name || !address.phone || !address.text) {
    closeSheet();
    openAddressSheet();
    toast("请先填写收货地址");
    return;
  }
  orderSubmitting = true;
  closeSheet();
  toast("正在提交订单…");
  try {
    const data = await api("/orders/rental", {
      method: "POST",
      body: {
        productId: p.id,
        size: state.size,
        days: state.days,
        delivery: state.delivery,
        insurance: state.insurance,
        address,
      },
    });
    const order = data.order;
    ORDERS = [order, ...ORDERS.filter((item) => item.id !== order.id)];
    AUTH.stats.orders = (AUTH.stats.orders || 0) + 1;
    state.orderId = order.id;
    state.screen = "success";
    state.tab = "profile";
    const successSnap = screenSnapshot();
    const ordersSnap = { ...successSnap, screen: "orders", tab: "profile" };
    render();
    seedAppHistory([ordersSnap, successSnap]);
    setTimeout(() => toast("支付成功，商家已收到订单"), 180);
  } catch (error) {
    if (error.status === 401) {
      handleActionError(error);
      return;
    }
    if (error.data?.error === "address_required") {
      openAddressSheet();
      toast("请先补全收货地址");
      return;
    }
    toast(error.message);
    if (error.status === 409) {
      state.screen = "product";
      render();
    }
  } finally {
    orderSubmitting = false;
  }
}

function openPhotoPaySheet() {
  const p = photographerById(state.photoId);
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>支付定金 · 锁定档期</h3>
      <div class="pay-amount"><small>¥</small>${p.package.deposit}</div>
      <div class="pay-method">
        <span class="wx">微</span>
        <div><b>微信支付</b><span>尾款 ¥${p.package.price - p.package.deposit} 拍摄前支付</span></div>
        <span class="check-mark">${icon("check", 11, 3)}</span>
      </div>
      <div style="font-size:8.5px;color:var(--muted);line-height:1.6;margin-bottom:14px;text-align:center">${state.slot} · ${p.name} · 提前 48 小时可免费改期一次</div>
      <button class="btn-primary" data-action="confirm-photo-pay">确认支付 ¥${p.package.deposit}</button>
    </div>`;
  overlay.classList.add("open");
}

async function confirmPhotoPay() {
  if (orderSubmitting) return;
  orderSubmitting = true;
  closeSheet();
  toast("正在锁定档期…");
  try {
    const data = await api("/orders/photo", {
      method: "POST",
      body: { photographerId: state.photoId, slot: state.slot },
    });
    const order = data.order;
    ORDERS = [order, ...ORDERS.filter((item) => item.id !== order.id)];
    AUTH.stats.orders = (AUTH.stats.orders || 0) + 1;
    state.orderId = order.id;
    state.screen = "success";
    state.tab = "profile";
    const successSnap = screenSnapshot();
    const ordersSnap = { ...successSnap, screen: "orders", tab: "profile" };
    render();
    seedAppHistory([ordersSnap, successSnap]);
    setTimeout(() => toast("预约成功，摄影师将在 2 小时内确认"), 180);
  } catch (error) {
    handleActionError(error);
  } finally {
    orderSubmitting = false;
  }
}

/* ---------------------------------------------------------
   Success
   --------------------------------------------------------- */
function successScreen() {
  const o = ORDERS.find((x) => x.id === state.orderId) || ORDERS[0];
  if (!o) return homeScreen();
  const isPhoto = o.type === "photo";
  let deliveryCopy = "商家将在 24 小时内消毒打包";
  if (o.startDate) {
    const start = new Date(`${o.startDate}T00:00:00`);
    if (!Number.isNaN(start.getTime())) {
      deliveryCopy = `商家将在 24 小时内消毒打包<br/>预计 ${shortDay(addDays(start, -1))} 送达酒店前台`;
    }
  }
  return `<div class="screen">
    <div class="screen-scroll" style="padding-bottom:0">
      <div class="success-screen">
        <div class="success-mark">${icon("check", 34, 3)}</div>
        <h1>支付成功</h1>
        <p>${isPhoto ? "摄影师将在 2 小时内确认档期<br/>行前可随时沟通拍摄细节" : deliveryCopy}</p>
        <div class="success-card">
          <div class="success-card-row"><span>订单号</span><b>${esc(o.orderNo)}</b></div>
          <div class="success-card-row"><span>${isPhoto ? "服务" : "商品"}</span><b>${esc(o.title)}</b></div>
          <div class="success-card-row"><span>${isPhoto ? "已付定金" : "实付"}</span><b>¥${o.paid}</b></div>
          <div class="success-card-row"><span>${isPhoto ? "尾款" : "押金"}</span><b>${isPhoto ? `¥${o.balance}` : `¥${o.deposit} · 可退`}</b></div>
        </div>
        <div class="success-actions">
          <button class="btn-primary" data-action="view-order">查看订单</button>
          <button class="btn-ghost" data-action="tab" data-tab="home">返回首页</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------
   Orders
   --------------------------------------------------------- */
function filteredOrders() {
  return state.orderFilter === "all" ? ORDERS : ORDERS.filter((o) => o.type === state.orderFilter);
}

async function refreshOrders() {
  try {
    const data = await api("/orders");
    ORDERS = data.items || [];
    AUTH.stats.orders = ORDERS.length;
    render();
    toast("订单已刷新");
  } catch (error) {
    handleActionError(error);
  }
}

function ordersScreen() {
  return `<div class="screen">
    <div class="screen-scroll">
      ${pageHeader("我的订单", `<button class="icon-btn" data-action="refresh-orders" aria-label="刷新">${icon("clock", 18)}</button>`)}
      <div class="orders-head" style="padding-top:0">
        <div class="segment">
          ${[
            ["all", "全部"],
            ["rental", "租衣"],
            ["photo", "摄影"],
          ]
            .map(
              ([key, label]) =>
                `<button class="${state.orderFilter === key ? "active" : ""}" data-action="filter-orders" data-filter="${key}">${label}</button>`
            )
            .join("")}
        </div>
      </div>
      <div class="order-list" id="order-list">
        ${filteredOrders().map(orderCard).join("") || '<div class="empty">还没有订单<br/>去首页看看今天的可租款吧</div>'}
      </div>
    </div>
  </div>`;
}

function orderScreen() {
  const o = ORDERS.find((x) => x.id === state.orderId) || ORDERS[0];
  if (!o) return ordersScreen();
  const isPhoto = o.type === "photo";
  const start = o.startDate ? new Date(`${o.startDate}T00:00:00`) : null;
  const deliveryDate = start && !Number.isNaN(start.getTime()) ? shortDay(addDays(start, -1)) : "发货后";
  const canRefund = !isPhoto && ["paid", "shipped"].includes(o.statusCode);
  const canReturn = !isPhoto && ["shipped", "in_use"].includes(o.statusCode);
  const canReschedule = isPhoto && ["deposit_paid", "confirmed"].includes(o.statusCode);
  return `<div class="screen">
    <div class="screen-scroll">
      ${pageHeader(isPhoto ? "摄影订单" : "租衣订单")}
      <div class="status-card">
        <div class="status-eyebrow">ORDER STATUS</div>
        <h2>${esc(o.status)}</h2>
        <p>${esc(o.statusSub)}</p>
      </div>

      <div class="detail-info-card">
        <h3>订单进度</h3>
        <div class="status-timeline">
          ${(o.timeline || [])
            .map(
              (t) => `<div class="timeline-step ${esc(t.state || "todo")}">
                <span class="timeline-dot"></span>
                <div class="timeline-text"><b>${esc(t.label)}</b><span>${esc(t.time)}</span></div>
              </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="detail-info-card">
        <h3>${isPhoto ? "服务信息" : "物流信息"}</h3>
        ${
          isPhoto
            ? `<div class="info-line"><span>摄影师</span><b>${esc(o.merchant)}</b></div>
               <div class="info-line"><span>档期</span><b>${esc(o.date)}</b></div>
               <div class="info-line"><span>地点</span><b>亚龙湾海边</b></div>
               <div class="info-line"><span>含</span><b>9 张精修 · 全部底片</b></div>`
            : `<div class="info-line"><span>配送方式</span><b>${deliveryLabelOf(o)} · 酒店前台代收</b></div>
               <div class="info-line"><span>运单号</span><b>${o.statusCode === "paid" ? "发货后显示" : "SF1234 8890 6621"}</b></div>
               <div class="info-line"><span>预计送达</span><b>${deliveryDate} 14:00 前</b></div>
               <div class="info-line"><span>商家</span><b>${esc(o.merchant)}</b></div>`
        }
      </div>

      <div class="detail-info-card">
        <h3>${isPhoto ? "拍摄套餐" : "商品"}</h3>
        <div class="order-item-row">
          <img src="${esc(img(o.image))}" alt="${esc(o.title)}" />
          <div class="info">
            <b>${esc(o.title)}</b>
            <span>${esc(o.date)}</span>
            <span>${isPhoto ? "含服装建议 / 9 张精修" : `尺码 ${esc(o.size)} · 已消毒封签`}</span>
            <div class="p">¥${o.paid}${isPhoto ? " 定金" : ""}</div>
          </div>
        </div>
      </div>

      ${
        isPhoto
          ? `<div class="detail-info-card">
              <h3>费用</h3>
              <div class="info-line"><span>套餐价</span><b>¥${o.paid + o.balance}</b></div>
              <div class="info-line"><span>已付定金</span><b>¥${o.paid}</b></div>
              <div class="info-line"><span>拍摄前尾款</span><b>¥${o.balance}</b></div>
            </div>`
          : `<div class="detail-info-card">
              <h3>押金</h3>
              <div class="info-line"><span>押金金额</span><b>¥${o.deposit}</b></div>
              <div class="deposit-progress"><i></i></div>
              <div class="info-line"><span>状态</span><b>${o.depositStatus === "refunded" ? "已原路退回" : "质检后 1-3 个工作日原路退回"}</b></div>
            </div>`
      }

      <div class="order-actions">
        <button class="btn-ghost" data-action="toast" data-message="客服将在 1 分钟内回复">联系客服</button>
        ${
          canRefund
            ? `<button class="btn-ghost" data-action="order-refund" data-id="${esc(o.id)}">申请退款</button>`
            : ""
        }
        ${
          canReschedule
            ? `<button class="btn-primary" data-action="photo-reschedule" data-id="${esc(o.id)}">申请改期</button>`
            : canReturn
              ? `<button class="btn-primary" data-action="order-return" data-id="${esc(o.id)}">预约归还</button>`
              : `<button class="btn-primary" data-action="toast" data-message="已为你找到同款可租日期">再次租赁</button>`
        }
      </div>
    </div>
  </div>`;
}

async function requestOrderRefund(orderId) {
  if (!window.confirm("确认申请退款？客服会在 1 个工作日内处理。")) return;
  try {
    const data = await api(`/orders/${encodeURIComponent(orderId)}/refund`, {
      method: "POST",
      body: { reason: "行程变更" },
    });
    ORDERS = ORDERS.map((item) => (item.id === data.order.id ? data.order : item));
    render();
    toast("退款申请已提交");
  } catch (error) {
    handleActionError(error);
  }
}

async function requestOrderReturn(orderId) {
  if (!window.confirm("确认预约归还？骑手将在 2 小时内联系你。")) return;
  try {
    const data = await api(`/orders/${encodeURIComponent(orderId)}/return`, { method: "POST" });
    ORDERS = ORDERS.map((item) => (item.id === data.order.id ? data.order : item));
    render();
    toast("归还预约已提交");
  } catch (error) {
    handleActionError(error);
  }
}

function openRescheduleSheet(orderId) {
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>申请改期</h3>
      <p class="sheet-sub">提前 48 小时可免费改期一次。提交后由摄影师确认新档期。</p>
      <label class="sheet-field"><span>新的拍摄档期</span>
        <select id="reschedule-slot">${photoSlots().map((slot) => `<option value="${esc(slot)}">${esc(slot)}</option>`).join("")}</select>
      </label>
      <button class="btn-primary" data-action="submit-reschedule" data-id="${esc(orderId)}">提交改期申请</button>
    </div>`;
  overlay.classList.add("open");
}

async function submitReschedule(orderId) {
  const slot = $("#reschedule-slot")?.value || "";
  if (!slot) return toast("请选择新的档期");
  try {
    const data = await api(`/orders/${encodeURIComponent(orderId)}/reschedule`, {
      method: "POST",
      body: { slot },
    });
    ORDERS = ORDERS.map((item) => (item.id === data.order.id ? data.order : item));
    closeSheet();
    render();
    toast("改期申请已提交，等待摄影师确认");
  } catch (error) {
    handleActionError(error);
  }
}

/* ---------------------------------------------------------
   Photography
   --------------------------------------------------------- */
function photoScreen() {
  return `<div class="screen">
    <div class="screen-scroll">
      <div class="list-head">
        <div class="list-title">
          <div>
            <h1>找摄影</h1>
            <div class="sub">三亚 · 42 位摄影师 · 档期实时更新</div>
          </div>
          <button class="icon-btn" data-action="city-sheet" aria-label="切换城市">${icon("pin", 18)}</button>
        </div>
      </div>

      <div class="photo-hero">
        <img src="${img("photographer-2")}" alt="摄影师" />
        <div class="photo-hero-content">
          <div class="eyebrow">TRAVEL PORTRAIT</div>
          <h2>把旅途拍成电影</h2>
          <p>看作品 · 选档期 · 行前沟通 · 平台担保</p>
        </div>
      </div>

      <div class="chips" id="photo-chips" style="padding:0 20px 16px">
        ${["全部", "海岛", "新中式", "夜景", "胶片"]
          .map(
            (s) =>
              `<button class="chip ${state.photoStyle === s ? "active" : ""}" data-action="filter-photo" data-style="${s}">${s}</button>`
          )
          .join("")}
      </div>

      <div id="photo-list">
        ${PHOTOGRAPHERS.map(
          (p) => `<div class="photographer-card" data-action="open-photographer" data-id="${esc(p.id)}" data-tags="${esc(p.tags.join(","))}">
            <div class="photographer-cover">
              <img src="${esc(img(p.cover))}" alt="${esc(p.name)}作品" loading="lazy" />
              <span class="cover-tag">${esc(p.tags[0] || "旅拍")} · 三亚</span>
              <span class="cover-price">¥${p.price} 起</span>
            </div>
            <div class="photographer-info">
              <img src="${esc(img(p.avatar))}" alt="${esc(p.name)}" />
              <div class="who">
                <h3>${esc(p.name)}<span>${esc(p.title)}</span></h3>
                <p>${esc(p.tags.join(" · "))} · 已拍 ${p.orders} 组</p>
              </div>
              <div class="rating"><b>${p.rating}</b><span class="stars">★★★★★</span></div>
            </div>
            <div class="tag-row">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          </div>`
        ).join("")}
      </div>
      <div style="height:12px"></div>
    </div>
    ${tabbar("photo")}
  </div>`;
}

function photographerScreen() {
  const p = photographerById(state.photoId);
  return `<div class="screen has-bottom">
    <div class="screen-scroll">
      <div class="photo-detail-hero">
        <img src="${esc(img(p.cover))}" alt="${esc(p.name)}作品" />
        <div class="detail-top">
          <button class="glass-btn" data-action="back" aria-label="返回">${icon("chevronLeft", 18)}</button>
          <div class="detail-top-right">
            <button class="glass-btn" data-action="toast" data-message="分享链接已复制">${icon("share", 16)}</button>
          </div>
        </div>
        <div class="photo-profile">
          <img src="${esc(img(p.avatar))}" alt="${esc(p.name)}" />
          <div><h2>${esc(p.name)}</h2><p>${esc(p.title)} · 三亚</p></div>
          <div class="photo-rating"><b>${p.rating}</b><span>${p.orders} 组拍摄</span></div>
        </div>
      </div>

      <div class="photo-body">
        <p class="photo-bio">${esc(p.bio)}</p>

        <div class="section-head"><h3>作品集</h3><span style="font-size:9px;color:var(--muted)">近期客片</span></div>
        <div class="works-grid">
          ${p.works.map((w) => `<img src="${esc(img(w))}" alt="作品" loading="lazy" />`).join("")}
        </div>

        <div class="package-card">
          <div class="package-card-head">
            <div><h3>${esc(p.package.title)}</h3><p>${esc(p.package.desc)}</p></div>
            <span class="price">¥${p.package.price}</span>
          </div>
          <div class="includes">${p.package.includes.map((i) => `<span>${esc(i)}</span>`).join("")}</div>
          <div class="schedule-row">
            ${photoSlots()
              .map(
                (s) =>
                  `<button class="slot ${state.slot === s ? "active" : ""}" data-action="select-slot" data-slot="${s}">${s}</button>`
              )
              .join("")}
          </div>
        </div>

        <div class="rules">
          <div class="rule"><span>定金</span><span>30% · 拍摄前付尾款</span></div>
          <div class="rule"><span>改期</span><span>提前 48 小时免费一次</span></div>
          <div class="rule"><span>交付</span><span>7 天选片 · 15 天精修</span></div>
        </div>
      </div>
    </div>

    <div class="detail-bottom">
      <div class="rest-price"><span class="price">¥${p.package.price}</span><span>定金 ¥${p.package.deposit} · 锁定档期</span></div>
      <button class="btn-primary" data-action="open-photo-pay">付定金预约</button>
    </div>
  </div>`;
}

/* ---------------------------------------------------------
   City
   --------------------------------------------------------- */
function cityScreen() {
  const city = CITIES.find((item) => item.name === state.city) || CITIES.find((item) => item.status === "open") || {};
  return `<div class="screen">
    <div class="screen-scroll">
      ${pageHeader(city.name || "三亚")}
      <div class="city-hero">
        <img src="${img("hero-beach")}" alt="三亚海边" />
        <div class="city-hero-content">
          <h1>${esc(city.name || "三亚")}</h1>
          <p>${esc(city.weather || "28°C · 海风 3 级 · 适合白裙和浅色")}</p>
        </div>
      </div>

      <div class="city-stats">
        <div class="city-stat"><b>${city.spots ?? 12}</b><span>个旅拍机位</span></div>
        <div class="city-stat"><b>${city.pieces ?? PRODUCTS.length}</b><span>件可租衣服</span></div>
        <div class="city-stat"><b>${city.hotels ?? 8}</b><span>家合作酒店</span></div>
      </div>

      <div class="section" style="padding:0">
        <div class="section-head" style="padding:0 20px"><h3>必拍机位</h3><span style="font-size:9px;color:var(--muted)">按光线排序</span></div>
        <div class="spot-row">
          <div class="spot-card"><img src="${img("beach")}" alt="亚龙湾" /><div><b>亚龙湾 · 白沙滩</b><span>上午 8-10 点 · 逆光最柔</span></div></div>
          <div class="spot-card"><img src="${img("hero-beach")}" alt="后海村" /><div><b>后海村 · 冲浪店</b><span>下午 4-6 点 · 胶片感</span></div></div>
          <div class="spot-card"><img src="${img("amalfi")}" alt="天涯镇" /><div><b>天涯镇 · 蓝白小巷</b><span>上午 9 点 · 人少</span></div></div>
          <div class="spot-card"><img src="${img("beach-2")}" alt="椰梦长廊" /><div><b>椰梦长廊 · 日落</b><span>18:20 · 金色时刻</span></div></div>
        </div>
      </div>

      <div class="section" style="margin-top:22px">
        <div class="section-head"><h3>住这里，衣服送到前台</h3><button class="more" data-action="toast" data-message="更多酒店将在下一版开放">更多 ${icon("arrowRight", 12)}</button></div>
        <div class="hotel-card">
          <img src="${img("hotel")}" alt="酒店" />
          <div class="info"><b>亚龙湾云汀度假酒店</b><p>步行到沙滩 5 分钟 · 前台代收</p><span>住客免配送费 · 延迟退房</span></div>
        </div>
        <div class="hotel-card">
          <img src="${img("hotel-2")}" alt="民宿" />
          <div class="info"><b>后海 · 白房子民宿</b><p>步行到海边 3 分钟 · 冲浪友好</p><span>住客租衣 9 折 · 免费寄存</span></div>
        </div>
      </div>

      <div class="guide-card">
        <div class="guide-kicker">3 天 2 晚 · 穿搭路线</div>
        <h3>白裙、碎花和一件蓝风衣</h3>
        <p>按天气和拍摄时段排的轻量行程，不用带一箱衣服，也能每天出片。</p>
        <div class="guide-steps">
          <div class="guide-step"><i>1</i>Day 1 · 亚龙湾白裙 + 日落跟拍</div>
          <div class="guide-step"><i>2</i>Day 2 · 后海碎花 + 冲浪店咖啡</div>
          <div class="guide-step"><i>3</i>Day 3 · 天涯镇蓝风衣 + 返程</div>
        </div>
      </div>

      <div style="padding:0 20px 20px">
        <button class="btn-primary" style="width:100%" data-action="tab" data-tab="rent">按目的地选衣 ${icon("arrowRight", 14)}</button>
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------
   Makeup
   --------------------------------------------------------- */
function makeupScreen() {
  return `<div class="screen">
    <div class="screen-scroll">
      ${pageHeader("找化妆")}
      <div class="makeup-hero">
        <img src="${img("model-3")}" alt="妆造" />
        <div><h2>妆造跟着衣服走</h2><p>到店 / 上门 · 和租衣摄影打包更省心</p></div>
      </div>

      <div class="section-head" style="padding:0 20px"><h3>三亚人气妆造师</h3><span style="font-size:9px;color:var(--muted)">可约本周</span></div>
      ${MAKEUP_ARTISTS.map(
        (a) => `<div class="artist-card">
          <img src="${esc(img(a.avatar))}" alt="${esc(a.name)}" />
          <div class="info">
            <h3>${esc(a.name)}<span>${esc(a.title)}</span></h3>
            <p>${esc(a.desc)}</p>
            <div class="tags">${a.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
            <div class="bottom"><b>¥${a.price} 起</b><button data-action="toast" data-message="妆造预约将在下一版开放，可先联系客服">预约</button></div>
          </div>
        </div>`
      ).join("")}

      <div style="padding:0 20px 20px">
        <div class="guide-card" style="margin:0">
          <div class="guide-kicker">打包更省心</div>
          <h3>租衣 + 妆造 + 摄影</h3>
          <p>同一行程一次约好，妆造师按你的服装和拍摄场景出妆，省去反复沟通。</p>
          <div class="guide-steps">
            <div class="guide-step"><i>1</i>先选衣服，确认拍摄风格</div>
            <div class="guide-step"><i>2</i>再约妆造，上传参考图</div>
            <div class="guide-step"><i>3</i>摄影师按妆造和光线排档期</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------
   Community
   --------------------------------------------------------- */
function filteredPosts() {
  if (state.communityTab === "关注") return POSTS.filter((p) => p.user === AUTH.user?.nickname);
  if (state.communityTab === "同城") return POSTS.filter((p) => p.city.includes(state.city));
  return POSTS;
}

function communityScreen() {
  return `<div class="screen">
    <div class="screen-scroll">
      <div class="community-head">
        <div class="community-head-top">
          <h1>社区</h1>
          <button class="icon-btn" data-action="toast" data-message="搜索功能将在下一版开放" aria-label="搜索">${icon("search", 18)}</button>
        </div>
        <div class="community-tabs">
          ${["推荐", "同城", "关注"]
            .map(
              (t) =>
                `<button class="${state.communityTab === t ? "active" : ""}" data-action="community-tab" data-tab="${t}">${t}</button>`
            )
            .join("")}
        </div>
      </div>

      <div class="feed" id="feed">
        ${filteredPosts().map(postCard).join("") || '<div class="empty">这里还没有内容<br/>去推荐看看大家的客片吧</div>'}
      </div>
    </div>
    <button class="compose" data-action="toast" data-message="发布功能将在二期开放" aria-label="发布">${icon("plus", 22)}</button>
    ${tabbar("community")}
  </div>`;
}

function postCard(p) {
  const liked = !!(p.liked || state.likedPosts[p.id]);
  const product = p.product ? productById(p.product) : null;
  return `<article class="post">
    <div class="post-head">
      <img src="${esc(img(p.avatar))}" alt="${esc(p.user)}" />
      <div class="who"><b>${esc(p.user)}</b><span>${esc(p.city)} · ${esc(p.time)}</span></div>
      <button class="follow" data-action="toast" data-message="已关注 ${esc(p.user)}">关注</button>
    </div>
    <div class="post-images ${p.images.length === 1 ? "single" : ""}">
      ${p.images.map((i) => `<img src="${esc(img(i))}" alt="客片" loading="lazy" />`).join("")}
    </div>
    <div class="post-body">
      <p>${esc(p.text)}</p>
      <div class="post-tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      ${
        product
          ? `<div class="post-product" data-action="open-product" data-id="${product.id}">
              <img src="${esc(img(product.img))}" alt="${esc(product.title)}" />
              <span>同款可租 · ${esc(product.title)}</span>
              <b>¥${product.price}/3天</b>
            </div>`
          : ""
      }
      <div class="post-actions">
        <button class="${liked ? "liked" : ""}" data-action="like-post" data-id="${p.id}">${icon("heart", 15)} <span>${p.likes}</span></button>
        <button data-action="toast" data-message="评论功能将在下一版开放">${icon("chat", 15)} ${p.comments}</button>
        <button class="save" data-action="toast" data-message="已收藏这篇笔记">${icon("bookmark", 15)} 收藏</button>
      </div>
    </div>
  </article>`;
}

/* ---------------------------------------------------------
   Profile
   --------------------------------------------------------- */
function profileScreen() {
  const user = AUTH.user;
  if (!user) return homeScreen();
  const pendingShip = ORDERS.filter((o) => o.statusCode === "paid").length;
  const inUse = ORDERS.filter((o) => o.statusCode === "in_use").length;
  const returnPending = ORDERS.filter((o) => o.statusCode === "return_pending").length;
  const shortcuts = [
    ["待付款", "bag", 0],
    ["待发货", "truck", pendingShip],
    ["使用中", "clock", inUse],
    ["待归还", "calendar", returnPending],
    ["售后", "chat", 0],
  ];
  return `<div class="screen">
    <div class="screen-scroll">
      <div class="profile-head">
        <div class="profile-top">
          <h1>我的</h1>
          <button class="icon-btn" data-action="go-account" aria-label="账号与安全">${icon("settings", 18)}</button>
        </div>

        <div class="profile-user">
          <img src="${esc(img(user.avatar || "model-2"))}" alt="${esc(user.nickname)}" />
          <div>
            <h2>${esc(user.nickname)}</h2>
            <p>${esc(user.city || "三亚")} · ${user.hasPhone ? user.phoneMasked : "微信登录"}${user.hasWechat ? " · 微信已绑定" : ""}</p>
            <span class="profile-tag">${user.height || "—"}cm / ${user.weight || "—"}kg · 常穿 ${esc(user.size || "M")}</span>
          </div>
        </div>

        <div class="member-card">
          <div class="member-kicker">TRAVEL MEMBER</div>
          <h3>${esc(user.memberLevel || "旅行会员")} · 免押额度 ¥${(user.depositCredit || 0).toLocaleString("zh-CN")}</h3>
          <p>生日月 8 折 · 优先档期 · 专属客服</p>
          <button class="member-btn" data-action="toast" data-message="会员中心将在下一版开放">查看权益</button>
        </div>

        <div class="profile-stats">
          <div class="profile-stat"><b>${AUTH.stats.orders || 0}</b><span>订单</span></div>
          <div class="profile-stat"><b>${AUTH.stats.favorites || 0}</b><span>收藏</span></div>
          <div class="profile-stat"><b>¥${(user.depositCredit || 0).toLocaleString("zh-CN")}</b><span>免押额度</span></div>
        </div>

        <div class="order-shortcuts">
          ${shortcuts
            .map(
              ([label, ic, badge]) =>
                `<button class="shortcut" data-action="go" data-screen="orders">
                  <span class="s-icon">${icon(ic, 17)}${badge ? `<em>${badge}</em>` : ""}</span>${label}
                </button>`
            )
            .join("")}
        </div>

        <div class="menu-list">
          <button class="menu-item" data-action="go" data-screen="orders"><span class="m-icon">${icon("bag", 16)}</span>我的订单<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
          <button class="menu-item" data-action="edit-address"><span class="m-icon">${icon("pin", 16)}</span>收货地址<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
          <button class="menu-item" data-action="go-account"><span class="m-icon">${icon("shield", 16)}</span>账号与安全<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
          <button class="menu-item" data-action="toast" data-message="身材档案将在下一版开放"><span class="m-icon">${icon("user", 16)}</span>身材档案<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
          <button class="menu-item" data-action="toast" data-message="收藏夹将在下一版开放"><span class="m-icon">${icon("heart", 16)}</span>我的收藏<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
          <button class="menu-item" data-action="toast" data-message="客服将在 1 分钟内回复"><span class="m-icon">${icon("chat", 16)}</span>客服与帮助<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
          <button class="menu-item danger" data-action="logout"><span class="m-icon">${icon("close", 16)}</span>退出登录<span class="m-arrow">${icon("chevronRight", 14)}</span></button>
        </div>
      </div>
    </div>
    ${tabbar("profile")}
  </div>`;
}

/* ---------------------------------------------------------
   Auth screens
   --------------------------------------------------------- */
function loadingScreen() {
  return `<div class="screen auth-screen">
    <div class="auth-scroll">
      <div class="auth-loading">
        <span class="auth-mark">未</span>
        <h2>正在打开你的旅行衣橱</h2>
        <p>同步商品、订单与账号信息</p>
        <span class="auth-spinner"></span>
      </div>
    </div>
  </div>`;
}

function errorScreen() {
  return `<div class="screen auth-screen">
    <div class="auth-scroll">
      <div class="auth-loading">
        <span class="auth-mark">未</span>
        <h2>暂时连不上服务</h2>
        <p>${esc(bootError || "请确认后端已启动，并且手机与电脑在同一 Wi-Fi。")}</p>
        <div class="auth-loading-actions">
          <button class="btn-primary" data-action="retry-boot">重试</button>
          <button class="btn-ghost" data-action="logout">重新登录</button>
        </div>
      </div>
    </div>
  </div>`;
}

function loginScreen() {
  return `<div class="screen auth-screen">
    <div class="auth-scroll">
      <div class="auth-top">
        <div class="auth-brand"><span class="auth-mark">未</span><div><b>未命名项目</b><small>UNTITLED PROJECT · TRAVEL WARDROBE</small></div></div>
        <span class="auth-badge">三亚首发</span>
      </div>

      <div class="auth-hero">
        <p class="auth-eyebrow">SANYA · 旅行衣橱</p>
        <h1>先登录，<br />再把旅行穿在身上。</h1>
        <p>租衣、妆造、摄影一次约好。手机号或微信登录，账号与订单会保存在服务端。</p>
      </div>

      <div class="auth-card">
        <div class="auth-card-head"><b>手机号登录</b><span>本地演示 · 无需真实短信</span></div>
        <label class="auth-field">
          <span>手机号</span>
          <input id="login-phone" type="tel" inputmode="numeric" maxlength="11" value="${esc(loginState.phone)}" placeholder="请输入手机号" />
        </label>
        <div class="auth-code-row">
          <label class="auth-field">
            <span>验证码</span>
            <input id="login-code" type="text" inputmode="numeric" maxlength="6" value="${esc(loginState.code)}" placeholder="固定验证码 123456" />
          </label>
          <button class="auth-code-btn" data-action="send-login-code">获取验证码</button>
        </div>
        <p id="login-error" class="auth-error ${loginState.error ? "" : "hidden"}">${esc(loginState.error || "")}</p>
        <button class="auth-primary" data-action="phone-login">${loginState.busy ? "登录中…" : "登录 / 注册"}</button>

        <div class="auth-or"><span>或使用微信</span></div>
        <label class="auth-field">
          <span>微信模拟授权码</span>
          <input id="login-wechat" type="text" value="${esc(loginState.wechatCode)}" placeholder="wx-demo-3" />
        </label>
        <button class="auth-wechat" data-action="wechat-login">微信一键登录（本地模拟）</button>

        <p class="auth-note">默认手机号 <b>13800000001</b>，验证码 <b>123456</b>。微信授权码可填 <b>wx-demo-3</b> 体验未绑定手机号的账号。</p>
      </div>

      <div class="auth-foot">
        <a href="/admin" target="_blank" rel="noreferrer">运营后台 →</a>
        <span>未命名项目 · v1.0</span>
      </div>
    </div>
  </div>`;
}

function setLoginError(message) {
  loginState.error = message || "";
  const el = $("#login-error");
  if (el) {
    el.textContent = loginState.error;
    el.classList.toggle("hidden", !loginState.error);
  }
}

async function finishLogin(data, isNew) {
  setSession(data.token, data.user);
  loginState.error = "";
  booting = true;
  bootError = "";
  state.screen = "home";
  render();
  try {
    await loadBootstrapData();
    booting = false;
    render();
    seedAppHistory([screenSnapshot()]);
    if (isNew) toast(data.user.hasPhone ? "账号已创建，欢迎来到三亚" : "微信账号已创建，可稍后绑定手机号");
    else toast(`欢迎回来，${data.user.nickname}`);
  } catch (error) {
    booting = false;
    if (error.status === 401) {
      clearSession();
      state.screen = "login";
    } else {
      bootError = error.message;
    }
    render();
    seedAppHistory([screenSnapshot()]);
  }
}

async function sendLoginCode() {
  const phone = ($("#login-phone")?.value || "").trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    setLoginError("请输入正确的 11 位手机号");
    return;
  }
  loginState.phone = phone;
  setLoginError("");
  try {
    const data = await api("/auth/phone/send-code", { method: "POST", body: { phone } });
    loginState.devCode = data.devCode || "";
    loginState.code = data.devCode || "";
    const input = $("#login-code");
    if (input) input.value = loginState.code;
    toast(data.devCode ? `验证码 ${data.devCode}（本地演示）` : "验证码已发送");
  } catch (error) {
    setLoginError(error.message);
  }
}

async function doPhoneLogin() {
  if (loginState.busy) return;
  const phone = ($("#login-phone")?.value || "").trim();
  const code = ($("#login-code")?.value || "").trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    setLoginError("请输入正确的 11 位手机号");
    return;
  }
  if (!code) {
    setLoginError("请输入验证码，或点「获取验证码」");
    return;
  }
  loginState.phone = phone;
  loginState.code = code;
  loginState.busy = true;
  setLoginError("");
  const data = await Promise.resolve()
    .then(() => api("/auth/phone/login", { method: "POST", body: { phone, code } }))
    .catch((error) => {
      setLoginError(error.message);
      return null;
    });
  loginState.busy = false;
  if (!data) return;
  await finishLogin(data, data.isNew);
}

async function doWechatLogin() {
  if (loginState.busy) return;
  const code = ($("#login-wechat")?.value || loginState.wechatCode || "").trim();
  if (!code) {
    setLoginError("请输入微信模拟授权码");
    return;
  }
  loginState.wechatCode = code;
  loginState.busy = true;
  setLoginError("");
  const data = await Promise.resolve()
    .then(() => api("/auth/wechat/login", { method: "POST", body: { code } }))
    .catch((error) => {
      setLoginError(error.message);
      return null;
    });
  loginState.busy = false;
  if (!data) return;
  localStorage.setItem("ct_wx_code", code);
  await finishLogin(data, data.isNew);
}

async function doLogout() {
  if (!window.confirm("确认退出当前账号？")) return;
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    /* 本地 token 失效也继续退出 */
  }
  clearSession();
  bootError = "";
  state.screen = "login";
  render();
  seedAppHistory([screenSnapshot()]);
}

/* ---------------------------------------------------------
   Account & security
   --------------------------------------------------------- */
function accountScreen() {
  const user = AUTH.user;
  if (!user) return loginScreen();
  const identityCount = (user.hasPhone ? 1 : 0) + (user.hasWechat ? 1 : 0);
  return `<div class="screen">
    <div class="screen-scroll">
      ${pageHeader("账号与安全")}
      <div class="account-wrap">
        <div class="account-profile">
          <img src="${esc(img(user.avatar || "model-2"))}" alt="${esc(user.nickname)}" />
          <div class="account-profile-info">
            <h2>${esc(user.nickname)}</h2>
            <p>${esc(user.id)}</p>
            <span>${user.hasPhone ? `手机 ${user.phoneMasked}` : "微信账号"}${user.hasWechat ? " · 微信已绑定" : ""}</span>
          </div>
          <button class="account-edit" data-action="nickname-sheet">修改昵称</button>
        </div>

        <div class="account-card">
          <div class="account-card-head"><b>登录方式</b><span>一个账号最多绑定一个手机号、一个微信</span></div>
          <div class="identity-item">
            <span class="identity-icon">${icon("user", 17)}</span>
            <div class="identity-info"><b>手机号</b><span>${user.hasPhone ? user.phoneMasked : "未绑定"}</span></div>
            <button class="identity-action ${user.hasPhone ? "muted" : "primary"}" data-action="${user.hasPhone ? "unbind-identity" : "bind-phone"}" data-type="phone" ${user.hasPhone && identityCount <= 1 ? "disabled" : ""}>${user.hasPhone ? "解绑" : "绑定"}</button>
          </div>
          <div class="identity-item">
            <span class="identity-icon wechat">微</span>
            <div class="identity-info"><b>微信</b><span>${user.hasWechat ? user.wechatMasked : "未绑定"}</span></div>
            <button class="identity-action ${user.hasWechat ? "muted" : "primary"}" data-action="${user.hasWechat ? "unbind-identity" : "bind-wechat"}" data-type="wechat" ${user.hasWechat && identityCount <= 1 ? "disabled" : ""}>${user.hasWechat ? "解绑" : "绑定"}</button>
          </div>
          ${identityCount <= 1 ? `<p class="account-hint">至少保留一种登录方式，绑定另一种身份后才能解绑当前身份。</p>` : ""}
        </div>

        <div class="account-card">
          <div class="account-card-head"><b>账号规则</b><span>关于绑定与合并</span></div>
          <div class="account-rule"><i>1</i><span>手机号与微信可以分别登录；绑定后可用任一方式进入同一账号。</span></div>
          <div class="account-rule"><i>2</i><span>如果该手机号 / 微信已属于另一个账号，系统会要求先合并账号，不会重复创建。</span></div>
          <div class="account-rule"><i>3</i><span>合并时可选择保留当前或对方账号，订单、收藏和登录身份会一并迁移。</span></div>
        </div>

        <div class="account-demo">
          <b>本地联调提示</b>
          <p>用 <code>13800000001</code> 登录后绑定微信 <code>wx-demo-2</code>，会触发与「阿梨」的合并流程；微信 <code>wx-demo-3</code> 是未绑定手机号的测试账号。</p>
        </div>

        <button class="account-logout" data-action="logout">退出登录</button>
        <p class="account-footer">未命名项目 · 账号服务已连接本地后端</p>
      </div>
    </div>
  </div>`;
}

function openNicknameSheet() {
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>修改昵称</h3>
      <label class="sheet-field"><span>昵称</span><input id="nickname-input" value="${esc(AUTH.user?.nickname || "")}" maxlength="20" /></label>
      <button class="btn-primary" data-action="save-nickname">保存</button>
    </div>`;
  overlay.classList.add("open");
}

async function saveNickname() {
  const nickname = ($("#nickname-input")?.value || "").trim();
  if (!nickname) {
    toast("昵称不能为空");
    return;
  }
  try {
    const data = await api("/users/me", { method: "PATCH", body: { nickname } });
    AUTH.user = data.user;
    closeSheet();
    render();
    toast("昵称已更新");
  } catch (error) {
    handleActionError(error);
  }
}

function openAddressSheet() {
  const address = AUTH.user?.address || {};
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>收货地址</h3>
      <p class="sheet-sub">衣服会送到酒店 / 民宿前台，请填写可代收的地址。</p>
      <label class="sheet-field"><span>收货人</span><input id="address-name" value="${esc(address.name || "")}" maxlength="20" placeholder="姓名" /></label>
      <label class="sheet-field"><span>手机号</span><input id="address-phone" type="tel" inputmode="numeric" maxlength="11" value="${esc(address.phone || "")}" placeholder="11 位手机号" /></label>
      <label class="sheet-field"><span>详细地址</span><textarea id="address-text" maxlength="120" placeholder="例如：三亚亚龙湾云汀度假酒店 · 前台代收">${esc(address.text || "")}</textarea></label>
      <button class="btn-primary" data-action="save-address">保存地址</button>
    </div>`;
  overlay.classList.add("open");
}

async function saveAddress() {
  const addressName = ($("#address-name")?.value || "").trim();
  const addressPhone = ($("#address-phone")?.value || "").trim();
  const addressText = ($("#address-text")?.value || "").trim();
  if (!addressName) return toast("请填写收货人");
  if (!/^1[3-9]\d{9}$/.test(addressPhone)) return toast("请填写正确的手机号");
  if (!addressText) return toast("请填写详细地址");
  try {
    const data = await api("/users/me", {
      method: "PATCH",
      body: { addressName, addressPhone, addressText },
    });
    AUTH.user = data.user;
    closeSheet();
    render();
    toast("收货地址已保存");
  } catch (error) {
    handleActionError(error);
  }
}

function openBindPhoneSheet() {
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>绑定手机号</h3>
      <p class="sheet-sub">绑定后可用手机号或微信任意一种方式登录同一账号。</p>
      <label class="sheet-field"><span>手机号</span><input id="bind-phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入手机号" /></label>
      <div class="bind-code-row">
        <label class="sheet-field"><span>验证码</span><input id="bind-code" inputmode="numeric" maxlength="6" placeholder="固定验证码 123456" /></label>
        <button class="auth-code-btn" data-action="send-bind-code">获取验证码</button>
      </div>
      <p class="sheet-note">如果该手机号已属于其他账号，会进入账号合并确认。</p>
      <button class="btn-primary" data-action="submit-bind-phone">确认绑定</button>
    </div>`;
  overlay.classList.add("open");
}

async function sendBindCode() {
  const phone = ($("#bind-phone")?.value || "").trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) return toast("请输入正确的手机号");
  try {
    const data = await api("/auth/phone/send-code", { method: "POST", body: { phone } });
    const input = $("#bind-code");
    if (input) input.value = data.devCode || "";
    toast(data.devCode ? `验证码 ${data.devCode}（本地演示）` : "验证码已发送");
  } catch (error) {
    toast(error.message);
  }
}

async function submitBindPhone() {
  const phone = ($("#bind-phone")?.value || "").trim();
  const code = ($("#bind-code")?.value || "").trim();
  if (!phone || !code) return toast("请填写手机号和验证码");
  try {
    const data = await api("/auth/bind", { method: "POST", body: { type: "phone", phone, code } });
    AUTH.user = data.user;
    closeSheet();
    render();
    toast("手机号已绑定");
  } catch (error) {
    if (error.data?.mergeRequired) {
      closeSheet();
      openMergeSheet(error.data);
      return;
    }
    toast(error.message);
  }
}

function openBindWechatSheet() {
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>绑定微信</h3>
      <p class="sheet-sub">本地演示使用模拟授权码代替真实微信授权。正式接入时替换为 code2session。</p>
      <label class="sheet-field"><span>微信模拟授权码</span><input id="bind-wechat" value="${esc(deviceWechatCode())}" maxlength="64" /></label>
      <p class="sheet-note">如果该微信已属于其他账号，会进入账号合并确认。</p>
      <button class="btn-primary" data-action="submit-bind-wechat">确认绑定</button>
    </div>`;
  overlay.classList.add("open");
}

async function submitBindWechat() {
  const code = ($("#bind-wechat")?.value || "").trim();
  if (!code) return toast("请输入微信授权码");
  try {
    const data = await api("/auth/bind", { method: "POST", body: { type: "wechat", code } });
    AUTH.user = data.user;
    closeSheet();
    render();
    toast("微信已绑定");
  } catch (error) {
    if (error.data?.mergeRequired) {
      closeSheet();
      openMergeSheet(error.data);
      return;
    }
    toast(error.message);
  }
}

function openMergeSheet(conflict) {
  mergeConflict = conflict;
  const current = conflict.current || {};
  const target = conflict.target || {};
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet merge-sheet">
      <div class="sheet-handle"></div>
      <h3>需要合并账号</h3>
      <p class="sheet-sub">这个登录身份已经属于另一个账号。合并后，订单、收藏和登录方式会迁移到保留的账号，另一账号将被删除。</p>
      <div class="merge-compare">
        <div class="merge-account">
          <span class="merge-label">当前账号</span>
          <img src="${esc(img(current.avatar || "model-2"))}" alt="" />
          <b>${esc(current.nickname || "当前账号")}</b>
          <span>${esc(current.phoneMasked || current.wechatMasked || "")}</span>
          <em>${current.orderCount || 0} 个订单</em>
        </div>
        <div class="merge-vs">合并</div>
        <div class="merge-account">
          <span class="merge-label">身份所属账号</span>
          <img src="${esc(img(target.avatar || "model-2"))}" alt="" />
          <b>${esc(target.nickname || "对方账号")}</b>
          <span>${esc(target.phoneMasked || target.wechatMasked || "")}</span>
          <em>${target.orderCount || 0} 个订单</em>
        </div>
      </div>
      <button class="btn-primary" data-action="merge-keep" data-keep="current">保留当前账号（${esc(current.nickname || "")}）</button>
      <button class="btn-ghost merge-second" data-action="merge-keep" data-keep="target">保留对方账号（${esc(target.nickname || "")}）</button>
      <p class="sheet-note">保留哪个账号，资料和昵称就以哪个账号为准。合并后当前登录会话会刷新。</p>
    </div>`;
  overlay.classList.add("open");
}

async function confirmMerge(keep) {
  if (!mergeConflict) return;
  try {
    const data = await api("/auth/merge/confirm", {
      method: "POST",
      body: { ticketId: mergeConflict.ticketId, keep },
    });
    setSession(data.token, data.user);
    AUTH.user = data.user;
    mergeConflict = null;
    closeSheet();
    booting = true;
    render();
    try {
      await loadBootstrapData();
      state.screen = "account";
    } finally {
      booting = false;
      render();
    }
    toast("账号已合并，登录身份已更新");
  } catch (error) {
    booting = false;
    render();
    toast(error.message);
  }
}

function openUnbindSheet(type) {
  const label = type === "phone" ? "手机号" : "微信";
  const overlay = $("#overlay");
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>解绑${label}</h3>
      <p class="sheet-sub">解绑后该${label}不能用于登录。请确认你还保留另一种登录方式。</p>
      <button class="btn-primary danger-fill" data-action="confirm-unbind" data-type="${type}">确认解绑</button>
      <button class="btn-ghost merge-second" data-action="close-sheet">取消</button>
    </div>`;
  overlay.classList.add("open");
}

async function confirmUnbind(type) {
  try {
    const data = await api(`/auth/identities/${type}`, { method: "DELETE" });
    AUTH.user = data.user;
    closeSheet();
    render();
    toast("已解绑");
  } catch (error) {
    toast(error.message);
  }
}

/* ---------------------------------------------------------
   Overlays
   --------------------------------------------------------- */
function openCitySheet() {
  const overlay = $("#overlay");
  const list = CITIES.length
    ? CITIES
    : [{ name: "三亚", status: "open", weather: "28°C · 晴" }, { name: "大理", status: "soon" }];
  overlay.innerHTML = `<div class="overlay-backdrop" data-action="close-sheet"></div>
    <div class="sheet">
      <div class="sheet-handle"></div>
      <h3>选择目的地</h3>
      <div class="city-list">
        ${list
          .map(
            (city) =>
              `<button class="city-option ${city.name === state.city ? "active" : ""}" data-action="select-city" data-city="${esc(city.name)}" data-status="${city.status}">
                ${esc(city.name)}<span>${city.status === "open" ? `已开放 · ${esc(city.weather || "")}` : "即将开放"}</span>
              </button>`
          )
          .join("")}
      </div>
    </div>`;
  overlay.classList.add("open");
}

/* ---------------------------------------------------------
   Render
   --------------------------------------------------------- */
const SCREENS = {
  home: homeScreen,
  rent: rentScreen,
  product: productScreen,
  booking: bookingScreen,
  success: successScreen,
  orders: ordersScreen,
  order: orderScreen,
  photo: photoScreen,
  photographer: photographerScreen,
  city: cityScreen,
  makeup: makeupScreen,
  community: communityScreen,
  profile: profileScreen,
  account: accountScreen,
};

function render() {
  const app = $("#app");
  const statusbar = $("#statusbar");
  if (booting) {
    app.innerHTML = loadingScreen();
    if (statusbar) statusbar.classList.remove("on-image");
    return;
  }
  if (!AUTH.token) {
    app.innerHTML = loginScreen();
    if (statusbar) statusbar.classList.remove("on-image");
    return;
  }
  if (bootError) {
    app.innerHTML = errorScreen();
    if (statusbar) statusbar.classList.remove("on-image");
    return;
  }
  const screen = SCREENS[state.screen] || homeScreen;
  app.innerHTML = screen();
  if (statusbar) {
    statusbar.classList.toggle("on-image", state.screen === "product" || state.screen === "photographer");
  }
}

/* ---------------------------------------------------------
   Events
   --------------------------------------------------------- */
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  // Links inside agreement should not jump
  if (el.tagName === "A") e.preventDefault();

  if (action === "send-login-code") return sendLoginCode();
  if (action === "phone-login") return doPhoneLogin();
  if (action === "wechat-login") return doWechatLogin();
  if (action === "retry-boot") return bootApp();
  if (action === "logout") return doLogout();
  if (action === "go-account") return go("account");
  if (action === "refresh-orders") return refreshOrders();
  if (action === "order-refund") return requestOrderRefund(el.dataset.id);
  if (action === "order-return") return requestOrderReturn(el.dataset.id);
  if (action === "photo-reschedule") return openRescheduleSheet(el.dataset.id);
  if (action === "submit-reschedule") return submitReschedule(el.dataset.id);
  if (action === "nickname-sheet") return openNicknameSheet();
  if (action === "save-nickname") return saveNickname();
  if (action === "edit-address") return openAddressSheet();
  if (action === "save-address") return saveAddress();
  if (action === "bind-phone") return openBindPhoneSheet();
  if (action === "bind-wechat") return openBindWechatSheet();
  if (action === "send-bind-code") return sendBindCode();
  if (action === "submit-bind-phone") return submitBindPhone();
  if (action === "submit-bind-wechat") return submitBindWechat();
  if (action === "merge-keep") return confirmMerge(el.dataset.keep);
  if (action === "unbind-identity") return openUnbindSheet(el.dataset.type);
  if (action === "confirm-unbind") return confirmUnbind(el.dataset.type);

  switch (action) {
    case "tab":
      switchTab(el.dataset.tab);
      break;

    case "go":
      go(el.dataset.screen);
      break;

    case "back":
      back();
      break;

    case "go-search":
      switchTab("rent");
      setTimeout(() => $('[data-role="search"]')?.focus(), 60);
      break;

    case "open-product":
      openProduct(el.dataset.id);
      break;

    case "like-product": {
      const id = el.dataset.id;
      try {
        const data = await api(`/favorites/${encodeURIComponent(id)}/toggle`, { method: "POST" });
        state.liked[id] = data.liked;
        AUTH.stats.favorites = Math.max(0, (AUTH.stats.favorites || 0) + (data.liked ? 1 : -1));
        $$(`[data-action="like-product"][data-id="${id}"]`).forEach((btn) =>
          btn.classList.toggle("active", data.liked)
        );
        toast(data.liked ? "已收藏，行前记得回来看档期" : "已取消收藏");
      } catch (error) {
        handleActionError(error);
      }
      break;
    }

    case "gallery": {
      state.galleryIndex = Number(el.dataset.index);
      const p = productById(state.productId);
      const imgEl = $("#detail-img");
      if (imgEl) imgEl.src = img(p.gallery[state.galleryIndex]);
      $$(".detail-dots .dot").forEach((dot, i) =>
        dot.classList.toggle("active", i === state.galleryIndex)
      );
      break;
    }

    case "select-size":
      state.size = el.dataset.size;
      $$('[data-action="select-size"]').forEach((b) =>
        b.classList.toggle("active", b.dataset.size === state.size)
      );
      break;

    case "select-days":
      state.days = Number(el.dataset.days);
      $$('[data-action="select-days"]').forEach((b) =>
        b.classList.toggle("active", Number(b.dataset.days) === state.days)
      );
      refreshDetail();
      break;

    case "select-delivery":
      state.delivery = el.dataset.delivery;
      $$('[data-action="select-delivery"]').forEach((b) =>
        b.classList.toggle("active", b.dataset.delivery === state.delivery)
      );
      refreshDetail();
      break;

    case "go-booking":
      go("booking");
      break;

    case "toggle-insurance":
      state.insurance = !state.insurance;
      refreshBooking();
      break;

    case "toggle-agree":
      state.agreed = !state.agreed;
      el.classList.toggle("on", state.agreed);
      break;

    case "open-pay":
      openPaySheet();
      break;

    case "confirm-pay":
      confirmPay();
      break;

    case "close-sheet":
      closeSheet();
      break;

    case "view-order":
      state.screen = "order";
      replaceAppState();
      render();
      break;

    case "open-order":
      state.orderId = el.dataset.id;
      go("order");
      break;

    case "filter-orders": {
      state.orderFilter = el.dataset.filter;
      $$(".segment button").forEach((b) =>
        b.classList.toggle("active", b.dataset.filter === state.orderFilter)
      );
      const list = $("#order-list");
      if (list) {
        list.innerHTML =
          filteredOrders().map(orderCard).join("") ||
          '<div class="empty">还没有订单<br/>去首页看看今天的可租款吧</div>';
      }
      break;
    }

    case "open-photographer":
      state.photoId = el.dataset.id;
      state.slot = photoSlots()[0];
      go("photographer");
      break;

    case "select-slot":
      state.slot = el.dataset.slot;
      $$('[data-action="select-slot"]').forEach((b) =>
        b.classList.toggle("active", b.dataset.slot === state.slot)
      );
      break;

    case "open-photo-pay":
      openPhotoPaySheet();
      break;

    case "confirm-photo-pay":
      confirmPhotoPay();
      break;

    case "filter-home":
      state.homeStyle = el.dataset.style;
      $$("#home-chips .chip").forEach((c) =>
        c.classList.toggle("active", c.dataset.style === state.homeStyle)
      );
      renderHomeGrid();
      break;

    case "filter-rent":
      state.rentStyle = el.dataset.style;
      $$("#rent-chips .chip").forEach((c) =>
        c.classList.toggle("active", c.dataset.style === state.rentStyle)
      );
      renderRentGrid();
      break;

    case "filter-photo":
      state.photoStyle = el.dataset.style;
      $$("#photo-chips .chip").forEach((c) =>
        c.classList.toggle("active", c.dataset.style === state.photoStyle)
      );
      $$("#photo-list .photographer-card").forEach((card) => {
        const tags = card.dataset.tags.split(",");
        card.classList.toggle("hidden", state.photoStyle !== "全部" && !tags.includes(state.photoStyle));
      });
      break;

    case "community-tab":
      state.communityTab = el.dataset.tab;
      render();
      break;

    case "like-post": {
      const id = el.dataset.id;
      const post = POSTS.find((p) => p.id === id);
      try {
        const data = await api(`/posts/${encodeURIComponent(id)}/like`, { method: "POST" });
        state.likedPosts[id] = data.liked;
        if (post) {
          post.likes = data.likes;
          post.liked = data.liked;
        }
        $$(`[data-action="like-post"][data-id="${id}"]`).forEach((button) => {
          button.classList.toggle("liked", data.liked);
          const countEl = button.querySelector("span");
          if (countEl) countEl.textContent = data.likes;
        });
      } catch (error) {
        handleActionError(error);
      }
      break;
    }

    case "city-sheet":
      openCitySheet();
      break;

    case "select-city":
      if (el.dataset.status === "open") {
        state.city = el.dataset.city;
        closeSheet();
        render();
        toast(`已切换到${el.dataset.city}`);
      } else {
        toast(`${el.dataset.city} 正在筹备，首发先开放三亚`);
      }
      break;

    case "toast":
      toast(el.dataset.message || "功能正在开发中");
      break;

    default:
      break;
  }
});

document.addEventListener("input", (e) => {
  if (!e.target.matches('[data-role="search"]')) return;
  const q = e.target.value.trim().toLowerCase();
  const cards = $$("#rent-grid .product-card");
  cards.forEach((card) => {
    const text = (card.dataset.search || "").toLowerCase();
    card.classList.toggle("hidden", !!q && !text.includes(q));
  });
  const count = $("#rent-count");
  if (count) {
    const visible = cards.filter((card) => !card.classList.contains("hidden")).length;
    count.textContent = visible
      ? `为你找到 ${visible} 套 · 按可租日期排序`
      : "没有找到匹配的款式，换个关键词试试";
  }
});

/* ---------------------------------------------------------
   Home/rent grid filters (without full re-render)
   --------------------------------------------------------- */
function renderHomeGrid() {
  const list =
    state.homeStyle === "全部"
      ? PRODUCTS.slice(0, 4)
      : PRODUCTS.filter((p) => p.styles.includes(state.homeStyle)).slice(0, 4);
  const el = $("#home-grid");
  if (el) {
    el.innerHTML = list.length
      ? list.map(productCard).join("")
      : '<div class="empty" style="grid-column:1/-1">这个风格暂时没有可租款<br/>看看全部吧</div>';
  }
}

function renderRentGrid() {
  const list =
    state.rentStyle === "全部"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.styles.includes(state.rentStyle));
  const el = $("#rent-grid");
  if (el) el.innerHTML = list.map(productCard).join("");
  const count = $("#rent-count");
  if (count) count.textContent = `为你找到 ${list.length} 套 · 按可租日期排序`;
}

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
async function bootApp() {
  bootError = "";
  if (!AUTH.token) {
    booting = false;
    state.screen = "login";
    render();
    seedAppHistory([screenSnapshot()]);
    return;
  }
  booting = true;
  render();
  try {
    await loadBootstrapData();
    booting = false;
    if (state.screen === "login") state.screen = "home";
    if (!SCREENS[state.screen]) state.screen = "home";
    render();
    seedAppHistory([screenSnapshot()]);
  } catch (error) {
    booting = false;
    if (error.status === 401) {
      clearSession();
      state.screen = "login";
    } else {
      bootError = error.message || "无法连接服务";
    }
    render();
    seedAppHistory([screenSnapshot()]);
  }
}

bootApp();
