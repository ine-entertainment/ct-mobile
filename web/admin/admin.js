/* =========================================================
   未命名项目 · 运营后台
   Vanilla JS · 与 /api/admin 对接
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const TOKEN_KEY = "ct_admin_token";
const LOGIN_KEY = "ct_admin_name";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  admin: null,
  view: "dashboard",
  orders: { page: 1, pageSize: 12, q: "", status: "", type: "" },
  photos: { page: 1, pageSize: 12, q: "", status: "" },
  users: { page: 1, pageSize: 15, q: "", status: "" },
  deposits: { page: 1, pageSize: 15, q: "", status: "" },
  logs: { page: 1, pageSize: 20, q: "", entity: "" },
  products: { q: "" },
  cache: {
    orders: [],
    users: [],
    products: [],
    deposits: [],
    photographers: [],
    makeup: [],
    posts: [],
    admins: [],
  },
};

const NAV_META = {
  dashboard: { title: "仪表盘", eyebrow: "OVERVIEW" },
  orders: { title: "订单管理", eyebrow: "TRANSACTIONS" },
  deposits: { title: "押金管理", eyebrow: "DEPOSITS" },
  photos: { title: "摄影预约", eyebrow: "PHOTOGRAPHY" },
  products: { title: "商品与库存", eyebrow: "CATALOG" },
  photographers: { title: "摄影师", eyebrow: "SUPPLY" },
  makeup: { title: "妆造师", eyebrow: "SUPPLY" },
  posts: { title: "社区内容", eyebrow: "COMMUNITY" },
  users: { title: "用户管理", eyebrow: "CUSTOMERS" },
  logs: { title: "操作日志", eyebrow: "AUDIT" },
  admins: { title: "管理员", eyebrow: "ACCESS" },
};

const STATUS_TONE = {
  paid: "amber",
  shipped: "blue",
  in_use: "blue",
  return_pending: "coral",
  completed: "green",
  cancelled: "gray",
  refund_requested: "red",
  refunded: "gray",
  deposit_paid: "amber",
  confirmed: "blue",
  shooting: "blue",
  selecting: "amber",
  delivering: "amber",
  active: "green",
  offline: "gray",
  published: "green",
  hidden: "gray",
  held: "amber",
  deducted: "red",
  disabled: "red",
};

const RENTAL_STATUS = [
  ["paid", "待发货"],
  ["shipped", "已发货"],
  ["in_use", "使用中"],
  ["return_pending", "待归还"],
  ["completed", "已完成"],
  ["refund_requested", "退款处理中"],
  ["refunded", "已退款"],
  ["cancelled", "已取消"],
];
const PHOTO_STATUS = [
  ["deposit_paid", "待确认"],
  ["confirmed", "待服务"],
  ["shooting", "拍摄中"],
  ["selecting", "待选片"],
  ["delivering", "修片中"],
  ["completed", "已完成"],
  ["cancelled", "已取消"],
];

const ICON_PATHS = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  shield: '<path d="M12 3 20 6v5.2c0 5-3.4 8.2-8 9.8-4.6-1.6-8-4.8-8-9.8V6l8-3Z"/><path d="m8.5 12 2.4 2.4 4.6-5"/>',
  camera: '<path d="M4 8.5h3l1.2-1.8h7.6L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.2"/>',
  hanger: '<path d="M12 7.2a2.2 2.2 0 1 1 2.2-2.2"/><path d="M12 7.2v1.4"/><path d="m12 8.6-8.1 5.3c-.8.5-.5 1.8.5 1.8h15.2c1 0 1.3-1.3.5-1.8L12 8.6Z"/>',
  aperture: '<circle cx="12" cy="12" r="9"/><path d="m8.5 3.8 3.5 6M20.2 8.5h-7M18.3 18.5l-3.5-6M5.7 15.5h7M7.7 5.5l3.5 6"/>',
  sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  heart: '<path d="M20.6 5.9a5 5 0 0 0-7.1 0L12 7.4l-1.5-1.5a5 5 0 0 0-7.1 7.1L12 21l8.6-8a5 5 0 0 0 0-7.1Z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M16 5.4a3 3 0 0 1 0 5.8M17.5 14.6c1.8.4 3 1.9 3.4 4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".8" fill="currentColor"/><circle cx="4" cy="12" r=".8" fill="currentColor"/><circle cx="4" cy="18" r=".8" fill="currentColor"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2 2M14 9l2 2"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 13h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17v.5"/>',
  arrowUp: '<path d="M12 20V4M6 10l6-6 6 6"/>',
  box: '<path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
};

function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

function paintIcons() {
  $$("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 16);
  });
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function imageUrl(name) {
  const value = String(name || "");
  if (!value) return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("/") || value.startsWith("data:")) return value;
  return `/assets/img/${encodeURIComponent(value)}.jpg`;
}

function money(value) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function fmtDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return esc(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function fmtDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return esc(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function badge(code, label, tone) {
  const cls = tone || STATUS_TONE[code] || "gray";
  return `<span class="badge ${cls}">${esc(label || code || "—")}</span>`;
}

let toastTimer = null;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------------------------------------------------
   API
   --------------------------------------------------------- */
async function rawApi(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api/admin${path}`, {
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
    if (response.status === 401) {
      forceLogout();
    }
    const error = new Error(data.message || `请求失败（${response.status}）`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function forceLogout() {
  state.token = "";
  state.admin = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LOGIN_KEY);
  showLogin();
}

async function logout() {
  try {
    if (state.token) await rawApi("/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  forceLogout();
}

/* ---------------------------------------------------------
   Login / boot
   --------------------------------------------------------- */
function showLogin() {
  $("#appView").classList.add("hidden");
  $("#loginView").classList.remove("hidden");
  $("#loginError").classList.add("hidden");
  setTimeout(() => $("#loginForm input[name=username]")?.focus(), 60);
}

function showApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#adminName").textContent = state.admin?.name || "管理员";
  $("#adminRole").textContent = state.admin?.role === "super" ? "超级管理员" : "运营";
  $("#adminAvatar").textContent = (state.admin?.name || "管").slice(0, 1);
  paintIcons();
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#loginBtn");
  const errorEl = $("#loginError");
  errorEl.classList.add("hidden");
  button.disabled = true;
  button.textContent = "登录中…";
  try {
    const data = await rawApi("/auth/login", {
      method: "POST",
      body: {
        username: form.username.value.trim(),
        password: form.password.value,
      },
    });
    state.token = data.token;
    state.admin = data.admin;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(LOGIN_KEY, data.admin?.name || "");
    showApp();
    navigate("dashboard");
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "进入后台";
  }
});

async function boot() {
  if (!state.token) {
    showLogin();
    return;
  }
  try {
    const data = await rawApi("/auth/me");
    state.admin = data.admin;
    showApp();
    navigate("dashboard");
  } catch {
    showLogin();
  }
}

/* ---------------------------------------------------------
   Navigation
   --------------------------------------------------------- */
function setPageMeta(view) {
  const meta = NAV_META[view] || NAV_META.dashboard;
  $("#pageTitle").textContent = meta.title;
  $("#pageEyebrow").textContent = meta.eyebrow;
  $$("#sideNav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function closeMobileMenu() {
  $("#sidebar").classList.remove("open");
  $(".mobile-overlay")?.remove();
}

function openMobileMenu() {
  $("#sidebar").classList.add("open");
  if (!$(".mobile-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "mobile-overlay";
    overlay.addEventListener("click", closeMobileMenu);
    $("#appView").appendChild(overlay);
  }
}

function navigate(view) {
  if (!NAV_META[view]) view = "dashboard";
  state.view = view;
  closeMobileMenu();
  setPageMeta(view);
  const loaders = {
    dashboard: loadDashboard,
    orders: loadOrders,
    deposits: loadDeposits,
    photos: loadPhotos,
    products: loadProducts,
    photographers: loadPhotographers,
    makeup: loadMakeup,
    posts: loadPosts,
    users: loadUsers,
    logs: loadLogs,
    admins: loadAdmins,
  };
  (loaders[view] || loadDashboard)();
}

function loadingView() {
  $("#view").innerHTML = `<div class="panel"><div class="loading">正在读取数据…</div></div>`;
}

function viewHead(title, description, actions = "") {
  return `<div class="view-head">
    <div><h2>${esc(title)}</h2><p>${description}</p></div>
    <div class="view-actions">${actions}</div>
  </div>`;
}

/* ---------------------------------------------------------
   Dashboard
   --------------------------------------------------------- */
async function loadDashboard() {
  loadingView();
  const data = await rawApi("/dashboard");
  const { stats } = data;

  const trendMap = new Map(data.trend.map((row) => [row.day, row]));
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86400000);
    const key = date.toISOString().slice(0, 10);
    const parts = key.split("-");
    days.push({
      key,
      label: `${Number(parts[1])}/${Number(parts[2])}`,
      orders: trendMap.get(key)?.orders || 0,
      revenue: trendMap.get(key)?.revenue || 0,
    });
  }
  const maxOrders = Math.max(1, ...days.map((day) => day.orders));

  const statCards = [
    { label: "用户总数", value: stats.users, hint: `今日新增 ${stats.usersToday}`, icon: "users" },
    { label: "订单总数", value: stats.orders, hint: `租衣 ${stats.rentalOrders} · 摄影 ${stats.photoOrders}`, icon: "bag" },
    { label: "累计实收", value: money(stats.revenue), hint: `今日 ${money(stats.revenueToday)}`, icon: "wallet", accent: true },
    { label: "冻结押金", value: money(stats.depositsHeld), hint: `${stats.depositsHeldCount} 笔待退`, icon: "shield" },
    { label: "待处理", value: stats.pending, hint: "待发货 / 待确认 / 退款", icon: "clock" },
    { label: "在租商品", value: stats.products, hint: "状态为上架", icon: "hanger" },
  ];

  $("#view").innerHTML = `
    ${viewHead("把今天的生意看清楚。", "订单、押金、供给和用户都在同一套数据里。", `<button class="btn dark small" data-action="refresh">刷新数据</button>`)}
    <div class="stat-grid">
      ${statCards
        .map(
          (card) => `<div class="stat-card ${card.accent ? "accent" : ""}">
            <div class="label"><span>${card.label}</span><span class="mini">${icon(card.icon, 13)}</span></div>
            <b>${esc(card.value)}</b>
            <small>${esc(card.hint)}</small>
          </div>`
        )
        .join("")}
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><div><h3>近 7 天订单</h3><p>按下单时间统计，包含租衣与摄影</p></div><span class="eyebrow">LAST 7 DAYS</span></div>
        <div class="chart">
          ${days
            .map(
              (day, index) => `<div class="chart-col ${index === days.length - 1 ? "today" : ""}">
                <span class="chart-value">${day.orders || ""}</span>
                <div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(3, Math.round((day.orders / maxOrders) * 132))}px"></div></div>
                <span class="chart-label">${day.label}</span>
              </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><div><h3>今天先处理这些</h3><p>运营优先级</p></div></div>
        <div class="panel-body">
          <div class="todo-list">
            <div class="todo-item"><span class="dot"></span><div><b>待发货租衣订单 ${stats.pending} 笔</b><p>优先确认尺码库存与酒店配送时间，超时前发出。</p></div></div>
            <div class="todo-item"><span class="dot"></span><div><b>冻结押金 ${money(stats.depositsHeld)}</b><p>去押金管理完成质检退押，避免用户等待。</p></div></div>
            <div class="todo-item"><span class="dot"></span><div><b>库存预警 ${data.lowStock.length} 个尺码</b><p>可租数量 ≤ 1，及时补货或下架对应尺码。</p></div></div>
            <div class="todo-item"><span class="dot"></span><div><b>摄影预约待确认</b><p>去摄影预约页面确认档期，2 小时内响应。</p></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><div><h3>最近订单</h3><p>点击查看订单详情与状态流转</p></div><button class="btn ghost small" data-action="nav" data-view="orders">全部订单</button></div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>订单</th><th>用户</th><th>金额</th><th>状态</th><th>时间</th><th></th></tr></thead>
            <tbody>
              ${
                data.recentOrders
                  .map(
                    (order) => `<tr>
                      <td><div class="cell-main"><img class="thumb" src="${imageUrl(order.image)}" alt="" /><div><b>${esc(order.title)}</b><span>${esc(order.orderNo)}</span></div></div></td>
                      <td>${esc(order.userName || "—")}</td>
                      <td class="num">${money(order.paid)}</td>
                      <td>${badge(order.statusCode, order.status)}</td>
                      <td class="muted">${fmtDateTime(order.createdAt)}</td>
                      <td class="actions"><button class="btn ghost small" data-action="open-order" data-id="${esc(order.id)}">查看</button></td>
                    </tr>`
                  )
                  .join("") || `<tr><td colspan="6"><div class="empty">还没有订单</div></td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><div><h3>库存预警</h3><p>上架商品中可租 ≤ 1 的尺码</p></div></div>
        <div class="panel-body">
          <div class="mini-list">
            ${
              data.lowStock
                .map(
                  (item) => `<div class="mini-row">
                    <div class="grow"><b>${esc(item.title)}</b><span>尺码 ${esc(item.size)} · 可租 ${item.stock_available} / ${item.stock_total}</span></div>
                    <span class="badge ${item.stock_available === 0 ? "red" : "amber"}">${item.stock_available === 0 ? "已租满" : "紧张"}</span>
                  </div>`
                )
                .join("") || `<div class="detail-note">库存充足，暂无预警。</div>`
            }
          </div>
        </div>
        <div class="panel-head" style="border-top:1px solid var(--line);padding-top:16px"><div><h3>订单状态分布</h3></div></div>
        <div class="panel-body">
          <div class="status-grid">
            ${
              data.statusBreakdown
                .map(
                  (row) => `<span class="status-chip">${esc(row.label)} <b>${row.n}</b></span>`
                )
                .join("") || `<span class="muted">暂无数据</span>`
            }
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><div><h3>热租商品</h3><p>按租衣订单数排序</p></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>商品</th><th>订单数</th><th>实收</th></tr></thead>
          <tbody>
            ${
              data.topProducts
                .map(
                  (item) => `<tr>
                    <td><div class="cell-main"><img class="thumb" src="${imageUrl(item.image)}" alt="" /><div><b>${esc(item.title)}</b><span>${esc(item.id)}</span></div></div></td>
                    <td class="num">${item.orders}</td>
                    <td class="num">${money(item.revenue)}</td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="3"><div class="empty">暂无租衣订单</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---------------------------------------------------------
   Orders
   --------------------------------------------------------- */
function statusOptionsHtml(type = "", selected = "") {
  const opt = ([value, label]) =>
    `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
  const rental = RENTAL_STATUS.map(opt).join("");
  const photo = PHOTO_STATUS.map(opt).join("");
  if (type === "rental") return rental;
  if (type === "photo") return photo;
  return `<optgroup label="租衣">${rental}</optgroup><optgroup label="摄影">${photo}</optgroup>`;
}

function orderFilterBar(target, data) {
  const isPhoto = target === "photos";
  return `<form class="filter-bar" data-filter="${target}">
    <input type="search" name="q" placeholder="搜订单号 / 用户 / 商品" value="${esc(data.q)}" />
    <select name="status">
      <option value="">全部状态</option>
      ${statusOptionsHtml(isPhoto ? "photo" : data.type, data.status)}
    </select>
    ${
      isPhoto
        ? ""
        : `<select name="type">
            <option value="">全部类型</option>
            <option value="rental" ${data.type === "rental" ? "selected" : ""}>租衣订单</option>
            <option value="photo" ${data.type === "photo" ? "selected" : ""}>摄影订单</option>
          </select>`
    }
    <button class="btn dark small" type="submit">筛选</button>
    <button class="btn ghost small" type="reset">重置</button>
    <span class="spacer"></span>
    <span class="topbar-note">共 ${data.total ?? 0} 条</span>
  </form>`;
}

function pager(target, pageData) {
  if (!pageData) return "";
  const { page, totalPages, total } = pageData;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return `<div class="pagination">
    <span>第 ${page} / ${totalPages} 页 · 共 ${total} 条</span>
    <div class="pages">
      <button data-action="page" data-target="${target}" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>上一页</button>
      ${pages.map((p) => `<button class="${p === page ? "active" : ""}" data-action="page" data-target="${target}" data-page="${p}">${p}</button>`).join("")}
      <button data-action="page" data-target="${target}" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>下一页</button>
    </div>
  </div>`;
}

async function loadOrders() {
  const data = state.orders;
  loadingView();
  const params = new URLSearchParams({ page: data.page, pageSize: data.pageSize });
  if (data.q) params.set("q", data.q);
  if (data.status) params.set("status", data.status);
  if (data.type) params.set("type", data.type);
  const result = await rawApi(`/orders?${params}`);
  state.cache.orders = result.items;
  data.total = result.total;
  $("#view").innerHTML = `
    ${viewHead("订单管理", "租衣与摄影订单在同一张表里，状态变化会同步到用户端。", `<button class="btn ghost small" data-action="refresh">刷新</button>`)}
    <div class="panel">
      ${orderFilterBar("orders", { ...data, total: result.total })}
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>订单</th><th>用户</th><th>类型</th><th>实付</th><th>状态</th><th>下单时间</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (order) => `<tr>
                    <td><div class="cell-main"><img class="thumb" src="${imageUrl(order.image)}" alt="" /><div><b>${esc(order.title)}</b><span>${esc(order.orderNo)}</span></div></div></td>
                    <td>${esc(order.userName || "—")}</td>
                    <td>${order.type === "photo" ? "摄影" : "租衣"}</td>
                    <td class="num">${money(order.paid)}</td>
                    <td>${badge(order.statusCode, order.status)}</td>
                    <td class="muted">${fmtDateTime(order.createdAt)}</td>
                    <td class="actions"><button class="btn ghost small" data-action="open-order" data-id="${esc(order.id)}">详情</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="7"><div class="empty"><b>没有匹配的订单</b>换个筛选条件试试。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${pager("orders", result)}
    </div>
  `;
}

async function loadPhotos() {
  const data = state.photos;
  loadingView();
  const params = new URLSearchParams({ page: data.page, pageSize: data.pageSize, type: "photo" });
  if (data.q) params.set("q", data.q);
  if (data.status) params.set("status", data.status);
  const result = await rawApi(`/orders?${params}`);
  state.cache.orders = result.items;
  data.total = result.total;
  $("#view").innerHTML = `
    ${viewHead("摄影预约", "查看档期、确认预约、推进选片与交付。", `<button class="btn ghost small" data-action="refresh">刷新</button>`)}
    <div class="panel">
      ${orderFilterBar("photos", { ...data, total: result.total })}
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>预约</th><th>用户</th><th>档期</th><th>定金 / 尾款</th><th>状态</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (order) => `<tr>
                    <td><div class="cell-main"><img class="thumb" src="${imageUrl(order.image)}" alt="" /><div><b>${esc(order.title)}</b><span>${esc(order.orderNo)}</span></div></div></td>
                    <td>${esc(order.userName || "—")}</td>
                    <td>${esc(order.date || "—")}</td>
                    <td class="num">${money(order.paid)} / ${money(order.balance)}</td>
                    <td>${badge(order.statusCode, order.status)}</td>
                    <td class="actions"><button class="btn ghost small" data-action="open-order" data-id="${esc(order.id)}">详情</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="6"><div class="empty"><b>没有摄影预约</b>用户在前台付定金后会出现在这里。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${pager("photos", result)}
    </div>
  `;
}

async function openOrderDrawer(orderId) {
  openDrawer({
    title: "订单详情",
    eyebrow: "ORDER",
    subtitle: "读取中…",
    body: `<div class="loading">正在读取订单…</div>`,
    footer: `<button class="btn ghost" data-action="close-drawer">关闭</button>`,
  });
  let data;
  try {
    data = await rawApi(`/orders/${encodeURIComponent(orderId)}`);
  } catch (error) {
    toast(error.message);
    closeDrawer();
    return;
  }
  const order = data.order;
  const deposit = data.deposit;
  const isPhoto = order.type === "photo";
  const final = ["completed", "cancelled", "refunded"].includes(order.statusCode);
  const timeline = (order.timeline || [])
    .map(
      (step) => `<div class="timeline-item ${step.state || "todo"}">
        <span class="timeline-dot"></span>
        <div><b>${esc(step.label)}</b><span>${esc(step.time || "")}</span></div>
      </div>`
    )
    .join("");

  const body = `
    <div class="info-grid">
      <div><span>订单号</span><b>${esc(order.orderNo)}</b></div>
      <div><span>订单状态</span><b>${badge(order.statusCode, order.status)}</b></div>
      <div><span>用户</span><b>${esc(data.user?.nickname || "—")} · ${esc(data.user?.phoneMasked || data.user?.phone || "")}</b></div>
      <div><span>下单时间</span><b>${fmtDateTime(order.createdAt)}</b></div>
      <div><span>${isPhoto ? "服务" : "商品"}</span><b>${esc(order.title)}</b></div>
      <div><span>商家 / 摄影师</span><b>${esc(order.merchant)}</b></div>
      <div><span>实付</span><b>${money(order.paid)}${isPhoto ? `（尾款 ${money(order.balance)}）` : ""}</b></div>
      <div><span>${isPhoto ? "定金" : "押金"}</span><b>${money(order.deposit)}${deposit ? ` · ${deposit.statusLabel}` : ""}</b></div>
      ${
        isPhoto
          ? `<div><span>档期</span><b>${esc(order.slot || order.date)}</b></div>`
          : `<div><span>租期</span><b>${esc(order.date)}</b></div>
             <div><span>尺码 / 配送</span><b>${esc(order.size)} · ${esc(order.deliveryLabel || order.delivery)}</b></div>
             <div><span>收货地址</span><b>${esc(order.address?.name)} ${esc(order.address?.phone)} · ${esc(order.address?.text)}</b></div>`
      }
    </div>
    <div class="detail-note" style="margin-top:12px">${esc(order.statusSub || order.adminNote || "暂无状态说明")}</div>

    <div class="section-title">订单进度</div>
    <div class="timeline">${timeline || `<span class="muted">暂无进度</span>`}</div>

    ${
      final
        ? `<div class="section-title">状态操作</div><div class="detail-note">订单已进入最终状态（${esc(order.status)}），不能再修改。</div>`
        : `<form id="drawerForm" data-form="order-status" data-id="${esc(order.id)}">
            <div class="section-title">推进状态</div>
            <div class="form-grid">
              <label class="field"><span>目标状态</span><select name="status">${data.statusOptions
                .map((opt) => `<option value="${opt.value}" ${opt.value === order.statusCode ? "selected" : ""}>${esc(opt.label)}</option>`)
                .join("")}</select></label>
              <label class="field full"><span>状态说明（留空自动生成）</span><input name="statusSub" placeholder="例如：顺丰 SF1234 已发出" /></label>
              <label class="field full"><span>内部备注</span><textarea name="adminNote" placeholder="仅后台可见">${esc(order.adminNote || "")}</textarea></label>
            </div>
          </form>`
    }

    ${
      deposit && deposit.status === "held"
        ? `<form id="depositForm" data-form="deposit-refund" data-id="${esc(deposit.id)}">
            <div class="section-title">押金处理</div>
            <div class="detail-note" style="margin-bottom:12px">当前冻结 ${money(deposit.amount)}。质检通过可全额退回；有扣损时填写实际退回金额。</div>
            <div class="form-grid">
              <label class="field"><span>实际退回金额</span><input name="amount" type="number" min="0" max="${deposit.amount}" value="${deposit.amount}" /></label>
              <label class="field"><span>处理说明</span><input name="note" placeholder="质检通过 / 污损扣款" /></label>
            </div>
            <button class="btn soft small" type="submit" form="depositForm">确认退押金</button>
          </form>`
        : ""
    }
  `;

  openDrawer({
    title: order.orderNo,
    eyebrow: isPhoto ? "PHOTO ORDER" : "RENTAL ORDER",
    subtitle: `${order.userName || data.user?.nickname || ""} · ${order.status}`,
    body,
    footer: final
      ? `<button class="btn ghost" data-action="close-drawer">关闭</button>`
      : `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">保存状态</button>`,
  });
}

/* ---------------------------------------------------------
   Users
   --------------------------------------------------------- */
async function loadUsers() {
  const data = state.users;
  loadingView();
  const params = new URLSearchParams({ page: data.page, pageSize: data.pageSize });
  if (data.q) params.set("q", data.q);
  if (data.status) params.set("status", data.status);
  const result = await rawApi(`/users?${params}`);
  state.cache.users = result.items;
  data.total = result.total;
  $("#view").innerHTML = `
    ${viewHead("用户管理", "手机号与微信身份分开记录；同一账号最多一个手机号、一个微信。", `<button class="btn ghost small" data-action="refresh">刷新</button>`)}
    <div class="panel">
      <form class="filter-bar" data-filter="users">
        <input type="search" name="q" placeholder="搜昵称 / 用户 ID / 手机号 / 微信" value="${esc(data.q)}" />
        <select name="status">
          <option value="">全部状态</option>
          <option value="active" ${data.status === "active" ? "selected" : ""}>正常</option>
          <option value="disabled" ${data.status === "disabled" ? "selected" : ""}>已停用</option>
        </select>
        <button class="btn dark small" type="submit">筛选</button>
        <button class="btn ghost small" type="reset">重置</button>
        <span class="spacer"></span><span class="topbar-note">共 ${result.total} 位用户</span>
      </form>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>用户</th><th>登录身份</th><th>订单</th><th>累计实付</th><th>状态</th><th>注册时间</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (user) => `<tr>
                    <td><div class="cell-main"><img class="thumb round" src="${imageUrl(user.avatar)}" alt="" /><div><b>${esc(user.nickname)}</b><span>${esc(user.id)}</span></div></div></td>
                    <td><div class="tag-row">${user.hasPhone ? `<span class="tag">手机 ${esc(user.phoneMasked)}</span>` : ""}${user.hasWechat ? `<span class="tag">微信 ${esc(user.wechatMasked)}</span>` : ""}</div></td>
                    <td class="num">${user.orderCount || 0}</td>
                    <td class="num">${money(user.spend)}</td>
                    <td>${badge(user.status, user.status === "active" ? "正常" : "已停用")}</td>
                    <td class="muted">${fmtDate(user.createdAt)}</td>
                    <td class="actions"><button class="btn ghost small" data-action="open-user" data-id="${esc(user.id)}">详情</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="7"><div class="empty"><b>没有匹配用户</b>换个关键词试试。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${pager("users", result)}
    </div>
  `;
}

async function openUserDrawer(userId) {
  openDrawer({ title: "用户详情", eyebrow: "CUSTOMER", subtitle: "读取中…", body: `<div class="loading">正在读取用户…</div>` });
  let data;
  try {
    data = await rawApi(`/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    toast(error.message);
    closeDrawer();
    return;
  }
  const user = data.user;
  const identities = user.identities
    .map(
      (identity) => `<div class="identity-row">
        <span class="letter">${identity.type === "phone" ? "手" : "微"}</span>
        <div class="grow"><b>${esc(identity.typeLabel)} · ${esc(identity.value || identity.valueMasked)}</b><span>最近登录 ${fmtDateTime(identity.lastLoginAt)}</span></div>
        <button class="btn ghost small danger-text" data-action="unbind-identity" data-user="${esc(user.id)}" data-identity="${esc(identity.id)}">解绑</button>
      </div>`
    )
    .join("");
  const orders = data.orders
    .map(
      (order) => `<div class="mini-row">
        <img src="${imageUrl(order.image)}" alt="" />
        <div class="grow"><b>${esc(order.title)}</b><span>${esc(order.orderNo)} · ${badge(order.statusCode, order.status)}</span></div>
        <em>${money(order.paid)}</em>
      </div>`
    )
    .join("");

  const body = `
    <div class="info-grid">
      <div><span>昵称</span><b>${esc(user.nickname)}</b></div>
      <div><span>用户 ID</span><b>${esc(user.id)}</b></div>
      <div><span>注册时间</span><b>${fmtDate(user.createdAt)}</b></div>
      <div><span>累计实付</span><b>${money(user.spend)} · ${user.orderCount} 单</b></div>
      <div><span>会员等级</span><b>${esc(user.memberLevel)}</b></div>
      <div><span>免押额度</span><b>${money(user.depositCredit)}</b></div>
      <div><span>常用尺码</span><b>${esc(user.size || "—")} · ${esc(user.height || "—")}cm / ${esc(user.weight || "—")}kg</b></div>
      <div><span>地址</span><b>${esc(user.addressText || "未填写")}</b></div>
    </div>

    <form id="drawerForm" data-form="user" data-id="${esc(user.id)}">
      <div class="section-title">编辑资料</div>
      <div class="form-grid">
        <label class="field"><span>昵称</span><input name="nickname" value="${esc(user.nickname)}" required /></label>
        <label class="field"><span>账号状态</span><select name="status">
          <option value="active" ${user.status === "active" ? "selected" : ""}>正常</option>
          <option value="disabled" ${user.status === "disabled" ? "selected" : ""}>停用</option>
        </select></label>
        <label class="field"><span>会员等级</span><input name="memberLevel" value="${esc(user.memberLevel)}" /></label>
        <label class="field"><span>免押额度</span><input name="depositCredit" type="number" min="0" value="${user.depositCredit}" /></label>
        <label class="field"><span>常穿尺码</span><input name="size" value="${esc(user.size)}" /></label>
        <label class="field"><span>城市</span><input name="city" value="${esc(user.city)}" /></label>
        <label class="field full"><span>收货地址</span><input name="addressText" value="${esc(user.addressText)}" /></label>
      </div>
    </form>

    <div class="section-title">登录身份</div>
    <div>${identities || `<div class="detail-note">暂无登录身份</div>`}</div>
    <p class="topbar-note" style="margin:8px 0 0">解绑后该身份不能用于登录。用户仍需保留至少一种登录方式。</p>

    <div class="section-title">最近订单</div>
    <div class="mini-list">${orders || `<div class="detail-note">该用户还没有订单。</div>`}</div>

    ${
      data.deposits?.length
        ? `<div class="section-title">押金记录</div>${data.deposits
            .map(
              (deposit) => `<div class="identity-row"><div class="grow"><b>${money(deposit.amount)} · ${esc(deposit.statusLabel)}</b><span>${esc(deposit.orderId)} · 退回 ${money(deposit.refundedAmount)}</span></div></div>`
            )
            .join("")}`
        : ""
    }
  `;

  openDrawer({
    title: user.nickname,
    eyebrow: "CUSTOMER",
    subtitle: `${user.id} · ${user.hasPhone ? user.phoneMasked : "仅微信"}`,
    body,
    footer: `<button class="btn ghost" data-action="close-drawer">关闭</button><button class="btn primary" type="submit" form="drawerForm">保存资料</button>`,
  });
}

/* ---------------------------------------------------------
   Products
   --------------------------------------------------------- */
function stockFields(product) {
  const sizes = product?.sizes?.length ? product.sizes : ["S", "M", "L"];
  return sizes
    .map((size) => {
      const sku = product?.skus?.find((item) => item.size === size);
      return `<label class="field"><span>尺码 ${esc(size)} 库存</span><input type="number" min="0" data-stock-size="${esc(size)}" value="${sku ? sku.stockTotal : 5}" /></label>`;
    })
    .join("");
}

async function loadProducts() {
  loadingView();
  const params = new URLSearchParams();
  if (state.products.q) params.set("q", state.products.q);
  const result = await rawApi(`/products?${params}`);
  state.cache.products = result.items;
  $("#view").innerHTML = `
    ${viewHead("商品与库存", "前台展示、租金、押金和每个尺码的可租数量都在这里维护。", `<button class="btn primary" data-action="new-product">新增商品</button>`)}
    <div class="panel">
      <form class="filter-bar" data-filter="products">
        <input type="search" name="q" placeholder="搜商品名 / 商家 / ID" value="${esc(state.products.q)}" />
        <button class="btn dark small" type="submit">筛选</button>
        <button class="btn ghost small" type="reset">重置</button>
        <span class="spacer"></span><span class="topbar-note">共 ${result.items.length} 件商品</span>
      </form>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>商品</th><th>租金 / 押金</th><th>库存</th><th>风格</th><th>状态</th><th>排序</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (product) => `<tr>
                    <td><div class="cell-main"><img class="thumb" src="${imageUrl(product.img)}" alt="" /><div><b>${esc(product.title)}</b><span>${esc(product.id)} · ${esc(product.merchant)}</span></div></div></td>
                    <td class="num">${money(product.price)} / ${money(product.deposit)}</td>
                    <td><div class="tag-row">${product.skus
                      .map((sku) => `<span class="tag">${esc(sku.size)} ${sku.stockAvailable}/${sku.stockTotal}</span>`)
                      .join("")}</div></td>
                    <td>${esc(product.styles?.join(" · ") || "—")}</td>
                    <td>${badge(product.status, product.status === "active" ? "上架" : "下架")}</td>
                    <td class="num">${product.sortOrder}</td>
                    <td class="actions"><button class="btn ghost small" data-action="edit-product" data-id="${esc(product.id)}">编辑</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="7"><div class="empty"><b>没有商品</b>点击右上角新增。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openProductDrawer(productId) {
  const product = productId ? state.cache.products.find((item) => item.id === productId) : null;
  const p = product || {};
  const editing = !!product;
  const body = `
    <form id="drawerForm" data-form="product" data-id="${editing ? esc(p.id) : ""}">
      <div class="section-title">基础信息</div>
      <div class="form-grid">
        <label class="field"><span>商品 ID</span><input name="id" value="${esc(p.id || "")}" ${editing ? "readonly" : ""} placeholder="留空自动生成，如 white" /><small>前台详情、收藏与订单会引用该 ID。</small></label>
        <label class="field"><span>状态</span><select name="status">
          <option value="active" ${p.status !== "offline" ? "selected" : ""}>上架</option>
          <option value="offline" ${p.status === "offline" ? "selected" : ""}>下架</option>
        </select></label>
        <label class="field full"><span>商品名称</span><input name="title" value="${esc(p.title || "")}" required /></label>
        <label class="field"><span>3 天租金（元）</span><input name="price" type="number" min="0" value="${p.price ?? 129}" /></label>
        <label class="field"><span>押金（元）</span><input name="deposit" type="number" min="0" value="${p.deposit ?? 500}" /></label>
        <label class="field"><span>评分</span><input name="rating" type="number" min="0" max="5" step="0.1" value="${p.rating ?? 4.8}" /></label>
        <label class="field"><span>评价数</span><input name="reviews" type="number" min="0" value="${p.reviews ?? 0}" /></label>
        <label class="field full"><span>主图文件名 / URL</span><input name="img" value="${esc(p.img || "white-dress")}" required /><small>本地图片放 public/assets/img，填文件名（不带 .jpg）即可。</small></label>
      </div>

      <div class="section-title">展示与尺码</div>
      <div class="form-grid">
        <label class="field full"><span>相册图（逗号分隔）</span><input name="gallery" value="${esc((p.gallery || []).join(", "))}" /></label>
        <label class="field full"><span>真实客片（逗号分隔）</span><input name="real" value="${esc((p.real || []).join(", "))}" /></label>
        <label class="field"><span>风格标签</span><input name="styles" value="${esc((p.styles || []).join(", "))}" placeholder="海岛, 法式" /></label>
        <label class="field"><span>顶标</span><input name="badge" value="${esc(p.badge || "")}" placeholder="本周人气 TOP1" /></label>
        <label class="field"><span>尺码（逗号分隔）</span><input name="sizes" value="${esc((p.sizes || ["S", "M", "L"]).join(", "))}" /></label>
        <label class="field"><span>排序</span><input name="sortOrder" type="number" value="${p.sortOrder ?? 0}" /></label>
        <label class="field"><span>版型</span><input name="fit" value="${esc(p.fit || "")}" /></label>
        <label class="field"><span>模特参考</span><input name="model" value="${esc(p.model || "")}" /></label>
        <label class="field"><span>商家</span><input name="merchant" value="${esc(p.merchant || "")}" /></label>
        <label class="field"><span>包含</span><input name="includes" value="${esc(p.includes || "")}" /></label>
        <label class="field"><span>城市</span><input name="city" value="${esc(p.city || "三亚")}" /></label>
      </div>

      <div class="section-title">分尺码库存</div>
      <div class="form-grid">${stockFields(product)}</div>
      <p class="topbar-note" style="margin:8px 0 0">库存总数不能低于已租出未归还的数量。保存后前台实时生效。</p>
    </form>
  `;
  openDrawer({
    title: editing ? "编辑商品" : "新增商品",
    eyebrow: "CATALOG",
    subtitle: editing ? p.title : "新建一件可租商品",
    body,
    footer: `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">保存商品</button>`,
  });
}

/* ---------------------------------------------------------
   Deposits
   --------------------------------------------------------- */
async function loadDeposits() {
  const data = state.deposits;
  loadingView();
  const params = new URLSearchParams({ page: data.page, pageSize: data.pageSize });
  if (data.q) params.set("q", data.q);
  if (data.status) params.set("status", data.status);
  const result = await rawApi(`/deposits?${params}`);
  state.cache.deposits = result.items;
  data.total = result.total;
  $("#view").innerHTML = `
    ${viewHead("押金管理", "归还质检后及时退押；有损赔时记录实际退回金额。", `<button class="btn ghost small" data-action="refresh">刷新</button>`)}
    <div class="panel">
      <div class="summary-strip">
        <div><span>冻结中</span><b>${money(result.summary.held)}</b></div>
        <div><span>已退回</span><b>${money(result.summary.refunded)}</b></div>
        <div><span>部分退回</span><b>${money(result.summary.deductedRefunded)}</b></div>
        <div><span>扣损金额</span><b>${money(result.summary.deducted)}</b></div>
      </div>
      <form class="filter-bar" data-filter="deposits">
        <input type="search" name="q" placeholder="搜订单号 / 用户" value="${esc(data.q)}" />
        <select name="status">
          <option value="">全部状态</option>
          <option value="held" ${data.status === "held" ? "selected" : ""}>冻结中</option>
          <option value="refunded" ${data.status === "refunded" ? "selected" : ""}>已退回</option>
          <option value="deducted" ${data.status === "deducted" ? "selected" : ""}>部分扣除</option>
        </select>
        <button class="btn dark small" type="submit">筛选</button>
        <button class="btn ghost small" type="reset">重置</button>
        <span class="spacer"></span><span class="topbar-note">共 ${result.total} 笔</span>
      </form>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>订单 / 用户</th><th>押金</th><th>状态</th><th>已退回</th><th>创建时间</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (deposit) => `<tr>
                    <td><div><b>${esc(deposit.orderNo || deposit.orderId)}</b><span class="muted" style="display:block;font-size:9.5px;margin-top:2px">${esc(deposit.userName)} ${esc(deposit.userPhone)}</span></div></td>
                    <td class="num">${money(deposit.amount)}</td>
                    <td>${badge(deposit.status, deposit.statusLabel)}</td>
                    <td class="num">${money(deposit.refundedAmount)}</td>
                    <td class="muted">${fmtDateTime(deposit.createdAt)}</td>
                    <td class="actions">${
                      deposit.status === "held"
                        ? `<button class="btn soft small" data-action="refund-deposit" data-id="${esc(deposit.id)}">退押金</button>`
                        : `<span class="topbar-note">${esc(deposit.note || "已处理")}</span>`
                    }</td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="6"><div class="empty"><b>没有押金记录</b>租衣订单支付后会生成冻结押金。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${pager("deposits", result)}
    </div>
  `;
}

function openDepositDrawer(depositId) {
  const deposit = state.cache.deposits.find((item) => item.id === depositId);
  if (!deposit) return;
  openDrawer({
    title: "退还押金",
    eyebrow: "DEPOSIT",
    subtitle: `${deposit.orderNo || deposit.orderId} · ${deposit.userName}`,
    body: `
      <div class="info-grid">
        <div><span>押金金额</span><b>${money(deposit.amount)}</b></div>
        <div><span>当前状态</span><b>${badge(deposit.status, deposit.statusLabel)}</b></div>
        <div><span>用户</span><b>${esc(deposit.userName)} ${esc(deposit.userPhone)}</b></div>
        <div><span>订单</span><b>${esc(deposit.orderNo || deposit.orderId)}</b></div>
      </div>
      <form id="drawerForm" data-form="deposit-refund" data-id="${esc(deposit.id)}">
        <div class="section-title">退款信息</div>
        <div class="form-grid">
          <label class="field"><span>实际退回金额</span><input name="amount" type="number" min="0" max="${deposit.amount}" value="${deposit.amount}" required /><small>小于押金金额时，按“部分扣除”记录。</small></label>
          <label class="field"><span>处理说明</span><input name="note" placeholder="质检通过 / 污损扣款说明" /></label>
        </div>
      </form>
    `,
    footer: `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">确认退押</button>`,
  });
}

/* ---------------------------------------------------------
   Photographers / makeup / posts
   --------------------------------------------------------- */
async function loadPhotographers() {
  loadingView();
  const result = await rawApi("/photographers");
  state.cache.photographers = result.items;
  $("#view").innerHTML = `
    ${viewHead("摄影师", "前台展示的摄影师、套餐、档期与接单统计。", `<button class="btn primary" data-action="new-photographer">新增摄影师</button>`)}
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>摄影师</th><th>套餐</th><th>价格 / 定金</th><th>标签</th><th>状态</th><th>排序</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (item) => `<tr>
                    <td><div class="cell-main"><img class="thumb round" src="${imageUrl(item.avatar)}" alt="" /><div><b>${esc(item.name)}</b><span>${esc(item.title)} · 已拍 ${item.ordersCount} 组</span></div></div></td>
                    <td><b style="font-size:11.5px">${esc(item.package.title)}</b><span class="muted" style="display:block;font-size:9.5px;margin-top:2px">${esc(item.package.desc)}</span></td>
                    <td class="num">${money(item.package.price)} / ${money(item.package.deposit)}</td>
                    <td><div class="tag-row">${item.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div></td>
                    <td>${badge(item.status, item.status === "active" ? "接单中" : "已下架")}</td>
                    <td class="num">${item.sortOrder}</td>
                    <td class="actions"><button class="btn ghost small" data-action="edit-photographer" data-id="${esc(item.id)}">编辑</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="7"><div class="empty">还没有摄影师。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openPhotographerDrawer(id) {
  const item = id ? state.cache.photographers.find((row) => row.id === id) : null;
  const p = item || {};
  const editing = !!item;
  openDrawer({
    title: editing ? "编辑摄影师" : "新增摄影师",
    eyebrow: "PHOTOGRAPHER",
    subtitle: editing ? p.name : "配置作品、套餐与档期",
    body: `
      <form id="drawerForm" data-form="photographer" data-id="${editing ? esc(p.id) : ""}">
        <div class="section-title">基础资料</div>
        <div class="form-grid">
          <label class="field"><span>摄影师 ID</span><input name="id" value="${esc(p.id || "")}" ${editing ? "readonly" : ""} placeholder="留空自动生成" /></label>
          <label class="field"><span>状态</span><select name="status">
            <option value="active" ${p.status !== "offline" ? "selected" : ""}>接单中</option>
            <option value="offline" ${p.status === "offline" ? "selected" : ""}>下架</option>
          </select></label>
          <label class="field"><span>昵称</span><input name="name" value="${esc(p.name || "")}" required /></label>
          <label class="field"><span>头衔 / 风格</span><input name="title" value="${esc(p.title || "")}" placeholder="海岛情绪片 / 胶片感" /></label>
          <label class="field"><span>头像文件名</span><input name="avatar" value="${esc(p.avatar || "model-1")}" /></label>
          <label class="field"><span>封面作品文件名</span><input name="cover" value="${esc(p.cover || "hero-beach")}" /></label>
          <label class="field"><span>评分</span><input name="rating" type="number" min="0" max="5" step="0.1" value="${p.rating ?? 4.9}" /></label>
          <label class="field"><span>已拍组数</span><input name="ordersCount" type="number" min="0" value="${p.ordersCount ?? 0}" /></label>
          <label class="field"><span>展示起价</span><input name="price" type="number" min="0" value="${p.price ?? 699}" /></label>
          <label class="field"><span>排序</span><input name="sortOrder" type="number" value="${p.sortOrder ?? 0}" /></label>
          <label class="field full"><span>简介</span><textarea name="bio">${esc(p.bio || "")}</textarea></label>
          <label class="field full"><span>标签（逗号分隔）</span><input name="tags" value="${esc((p.tags || []).join(", "))}" /></label>
          <label class="field full"><span>作品文件名（逗号分隔）</span><input name="works" value="${esc((p.works || []).join(", "))}" /></label>
        </div>
        <div class="section-title">套餐</div>
        <div class="form-grid">
          <label class="field full"><span>套餐名称</span><input name="packageTitle" value="${esc(p.package?.title || "")}" /></label>
          <label class="field full"><span>套餐说明</span><input name="packageDesc" value="${esc(p.package?.desc || "")}" /></label>
          <label class="field"><span>套餐价</span><input name="packagePrice" type="number" min="0" value="${p.package?.price ?? 899}" /></label>
          <label class="field"><span>定金</span><input name="packageDeposit" type="number" min="0" value="${p.package?.deposit ?? 269}" /></label>
          <label class="field full"><span>包含（逗号分隔）</span><input name="packageIncludes" value="${esc((p.package?.includes || []).join(", "))}" /></label>
        </div>
      </form>
    `,
    footer: `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">保存摄影师</button>`,
  });
}

async function loadMakeup() {
  loadingView();
  const result = await rawApi("/makeup");
  state.cache.makeup = result.items;
  $("#view").innerHTML = `
    ${viewHead("妆造师", "到店 / 上门妆造供给，可按风格和价格维护。", `<button class="btn primary" data-action="new-makeup">新增妆造师</button>`)}
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>妆造师</th><th>擅长</th><th>标签</th><th>价格</th><th>状态</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (item) => `<tr>
                    <td><div class="cell-main"><img class="thumb round" src="${imageUrl(item.avatar)}" alt="" /><div><b>${esc(item.name)}</b><span>${esc(item.title)}</span></div></div></td>
                    <td class="muted" style="max-width:280px">${esc(item.desc)}</td>
                    <td><div class="tag-row">${item.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join("")}</div></td>
                    <td class="num">${money(item.price)} 起</td>
                    <td>${badge(item.status, item.status === "active" ? "可约" : "下架")}</td>
                    <td class="actions"><button class="btn ghost small" data-action="edit-makeup" data-id="${esc(item.id)}">编辑</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="6"><div class="empty">还没有妆造师。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openMakeupDrawer(id) {
  const item = id ? state.cache.makeup.find((row) => row.id === id) : null;
  const a = item || {};
  const editing = !!item;
  openDrawer({
    title: editing ? "编辑妆造师" : "新增妆造师",
    eyebrow: "MAKEUP",
    subtitle: editing ? a.name : "维护前台可约妆造供给",
    body: `
      <form id="drawerForm" data-form="makeup" data-id="${editing ? esc(a.id) : ""}">
        <div class="form-grid">
          <label class="field"><span>ID</span><input name="id" value="${esc(a.id || "")}" ${editing ? "readonly" : ""} placeholder="留空自动生成" /></label>
          <label class="field"><span>状态</span><select name="status">
            <option value="active" ${a.status !== "offline" ? "selected" : ""}>可约</option>
            <option value="offline" ${a.status === "offline" ? "selected" : ""}>下架</option>
          </select></label>
          <label class="field"><span>昵称</span><input name="name" value="${esc(a.name || "")}" required /></label>
          <label class="field"><span>头衔</span><input name="title" value="${esc(a.title || "")}" /></label>
          <label class="field"><span>头像文件名</span><input name="avatar" value="${esc(a.avatar || "model-1")}" /></label>
          <label class="field"><span>起价</span><input name="price" type="number" min="0" value="${a.price ?? 299}" /></label>
          <label class="field"><span>排序</span><input name="sortOrder" type="number" value="${a.sortOrder ?? 0}" /></label>
          <label class="field full"><span>介绍</span><textarea name="desc">${esc(a.desc || "")}</textarea></label>
          <label class="field full"><span>标签（逗号分隔）</span><input name="tags" value="${esc((a.tags || []).join(", "))}" /></label>
        </div>
      </form>
    `,
    footer: `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">保存妆造师</button>`,
  });
}

async function loadPosts() {
  loadingView();
  const result = await rawApi("/posts");
  state.cache.posts = result.items;
  $("#view").innerHTML = `
    ${viewHead("社区内容", "客片、穿搭笔记与同款商品挂链；下架内容不会出现在前台。", `<button class="btn primary" data-action="new-post">新增内容</button>`)}
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>内容</th><th>发布人</th><th>关联商品</th><th>互动</th><th>状态</th><th>时间</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (post) => `<tr>
                    <td><div class="cell-main">${post.images[0] ? `<img class="thumb" src="${imageUrl(post.images[0])}" alt="" />` : ""}<div><b>${esc(post.text).slice(0, 40)}${post.text.length > 40 ? "…" : ""}</b><span>${esc(post.tags.join(" "))}</span></div></div></td>
                    <td>${esc(post.user)}<span class="muted" style="display:block;font-size:9.5px">${esc(post.city)}</span></td>
                    <td>${esc(post.product || "—")}</td>
                    <td class="num">${post.likes} 赞 · ${post.comments} 评</td>
                    <td>${badge(post.status, post.status === "published" ? "已发布" : "已隐藏")}</td>
                    <td class="muted">${fmtDateTime(post.createdAt)}</td>
                    <td class="actions">
                      <button class="btn ghost small" data-action="edit-post" data-id="${esc(post.id)}">编辑</button>
                      <button class="btn ghost small" data-action="toggle-post" data-id="${esc(post.id)}" data-status="${post.status === "published" ? "hidden" : "published"}">${post.status === "published" ? "隐藏" : "发布"}</button>
                    </td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="7"><div class="empty">还没有社区内容。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openPostDrawer(id) {
  const item = id ? state.cache.posts.find((row) => row.id === id) : null;
  const p = item || {};
  const editing = !!item;
  openDrawer({
    title: editing ? "编辑社区内容" : "新增社区内容",
    eyebrow: "COMMUNITY",
    subtitle: editing ? p.user : "发布一条可挂商品的内容",
    body: `
      <form id="drawerForm" data-form="post" data-id="${editing ? esc(p.id) : ""}">
        <div class="form-grid">
          <label class="field"><span>发布人</span><input name="userName" value="${esc(p.user || "林小鹿")}" required /></label>
          <label class="field"><span>头像文件名</span><input name="avatar" value="${esc(p.avatar || "model-2")}" /></label>
          <label class="field"><span>城市</span><input name="city" value="${esc(p.city || "三亚")}" /></label>
          <label class="field"><span>状态</span><select name="status">
            <option value="published" ${p.status !== "hidden" ? "selected" : ""}>已发布</option>
            <option value="hidden" ${p.status === "hidden" ? "selected" : ""}>隐藏</option>
          </select></label>
          <label class="field full"><span>正文</span><textarea name="text" required>${esc(p.text || "")}</textarea></label>
          <label class="field full"><span>图片文件名（逗号分隔）</span><input name="images" value="${esc((p.images || []).join(", "))}" /></label>
          <label class="field full"><span>话题（逗号分隔）</span><input name="tags" value="${esc((p.tags || []).join(", "))}" /></label>
          <label class="field"><span>关联商品 ID</span><input name="productId" value="${esc(p.product || "")}" placeholder="white" /></label>
          <label class="field"><span>点赞数</span><input name="likes" type="number" min="0" value="${p.likes ?? 0}" /></label>
          <label class="field"><span>评论数</span><input name="comments" type="number" min="0" value="${p.comments ?? 0}" /></label>
        </div>
      </form>
    `,
    footer: `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">保存内容</button>`,
  });
}

/* ---------------------------------------------------------
   Logs / admins
   --------------------------------------------------------- */
async function loadLogs() {
  const data = state.logs;
  loadingView();
  const params = new URLSearchParams({ page: data.page, pageSize: data.pageSize });
  if (data.q) params.set("q", data.q);
  if (data.entity) params.set("entity", data.entity);
  const result = await rawApi(`/logs?${params}`);
  data.total = result.total;
  $("#view").innerHTML = `
    ${viewHead("操作日志", "后台关键操作留痕，便于定位库存、订单与账号变更。", `<button class="btn ghost small" data-action="refresh">刷新</button>`)}
    <div class="panel">
      <form class="filter-bar" data-filter="logs">
        <input type="search" name="q" placeholder="搜操作人 / 动作 / 对象" value="${esc(data.q)}" />
        <select name="entity">
          <option value="">全部对象</option>
          ${["order", "product", "user", "deposit", "photographer", "makeup", "post", "admin"].map(
            (entity) => `<option value="${entity}" ${data.entity === entity ? "selected" : ""}>${entity}</option>`
          ).join("")}
        </select>
        <button class="btn dark small" type="submit">筛选</button>
        <button class="btn ghost small" type="reset">重置</button>
        <span class="spacer"></span><span class="topbar-note">共 ${result.total} 条</span>
      </form>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>详情</th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (log) => `<tr>
                    <td class="muted">${fmtDateTime(log.created_at)}</td>
                    <td>${esc(log.admin_name || "系统")}</td>
                    <td><span class="badge blue">${esc(log.action)}</span></td>
                    <td>${esc(log.entity)}<span class="muted" style="display:block;font-size:9.5px">${esc(log.entity_id)}</span></td>
                    <td class="muted" style="max-width:360px;font-size:10.5px">${esc(log.detail)}</td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="5"><div class="empty">暂无日志。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
      ${pager("logs", result)}
    </div>
  `;
}

async function loadAdmins() {
  if (state.admin?.role !== "super") {
    $("#view").innerHTML = `
      ${viewHead("管理员", "管理员账号与用户账号相互独立。", "")}
      <div class="panel"><div class="empty"><b>仅超级管理员可管理账号</b>当前登录账号为运营角色。</div></div>
    `;
    return;
  }
  loadingView();
  const result = await rawApi("/admins");
  state.cache.admins = result.items;
  $("#view").innerHTML = `
    ${viewHead("管理员", "后台账号与权限。运营角色不能管理其他管理员。", `<button class="btn primary" data-action="new-admin">新增管理员</button>`)}
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>管理员</th><th>账号</th><th>角色</th><th>状态</th><th>最近登录</th><th>创建时间</th><th></th></tr></thead>
          <tbody>
            ${
              result.items
                .map(
                  (admin) => `<tr>
                    <td><b>${esc(admin.name)}</b></td>
                    <td class="muted">${esc(admin.username)}</td>
                    <td>${badge(admin.role, admin.roleLabel, admin.role === "super" ? "coral" : "blue")}</td>
                    <td>${badge(admin.status, admin.status === "active" ? "正常" : "已停用")}</td>
                    <td class="muted">${fmtDateTime(admin.lastLoginAt)}</td>
                    <td class="muted">${fmtDate(admin.createdAt)}</td>
                    <td class="actions"><button class="btn ghost small" data-action="edit-admin" data-id="${esc(admin.id)}">编辑</button></td>
                  </tr>`
                )
                .join("") || `<tr><td colspan="7"><div class="empty">暂无管理员。</div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openAdminDrawer(id) {
  const item = id ? state.cache.admins.find((row) => row.id === id) : null;
  const a = item || {};
  const editing = !!item;
  openDrawer({
    title: editing ? "编辑管理员" : "新增管理员",
    eyebrow: "ACCESS",
    subtitle: editing ? a.username : "创建一个后台账号",
    body: `
      <form id="drawerForm" data-form="admin" data-id="${editing ? esc(a.id) : ""}">
        <div class="form-grid">
          <label class="field"><span>登录账号</span><input name="username" value="${esc(a.username || "")}" ${editing ? "readonly" : ""} placeholder="3-40 位字母数字" required /></label>
          <label class="field"><span>显示名称</span><input name="name" value="${esc(a.name || "")}" required /></label>
          <label class="field"><span>角色</span><select name="role">
            <option value="ops" ${a.role !== "super" ? "selected" : ""}>运营</option>
            <option value="super" ${a.role === "super" ? "selected" : ""}>超级管理员</option>
          </select></label>
          <label class="field"><span>状态</span><select name="status">
            <option value="active" ${a.status !== "disabled" ? "selected" : ""}>正常</option>
            <option value="disabled" ${a.status === "disabled" ? "selected" : ""}>停用</option>
          </select></label>
          <label class="field full"><span>${editing ? "重置密码（留空不改）" : "密码"}</span><input name="password" type="password" ${editing ? "" : "required"} placeholder="至少 6 位" /></label>
        </div>
      </form>
    `,
    footer: `<button class="btn ghost" data-action="close-drawer">取消</button><button class="btn primary" type="submit" form="drawerForm">保存管理员</button>`,
  });
}

/* ---------------------------------------------------------
   Drawer
   --------------------------------------------------------- */
function openDrawer({ title, eyebrow = "", subtitle = "", body = "", footer = "" }) {
  $("#drawerRoot").innerHTML = `
    <div class="drawer-backdrop" data-action="close-drawer"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="drawer-head">
        <div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
        <button class="drawer-close" data-action="close-drawer" aria-label="关闭">×</button>
      </div>
      <div class="drawer-body">${body}</div>
      <div class="drawer-foot">${footer || `<button class="btn ghost" data-action="close-drawer">关闭</button>`}</div>
    </aside>
  `;
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("#drawerRoot").innerHTML = "";
  document.body.style.overflow = "";
}

/* ---------------------------------------------------------
   Form submissions
   --------------------------------------------------------- */
async function handleFormSubmit(form) {
  const type = form.dataset.form;
  const id = form.dataset.id;
  const fd = Object.fromEntries(new FormData(form).entries());
  const btn = form.querySelector("button[type=submit]") || document.querySelector(`button[form="${form.id}"]`);
  if (btn) {
    btn.disabled = true;
    btn.dataset.label = btn.textContent;
    btn.textContent = "保存中…";
  }
  try {
    if (type === "product") {
      const payload = {
        id: fd.id?.trim(),
        title: fd.title,
        price: Number(fd.price || 0),
        deposit: Number(fd.deposit || 0),
        rating: Number(fd.rating || 0),
        reviews: Number(fd.reviews || 0),
        img: fd.img,
        gallery: fd.gallery,
        styles: fd.styles,
        badge: fd.badge,
        sizes: fd.sizes,
        fit: fd.fit,
        model: fd.model,
        merchant: fd.merchant,
        includes: fd.includes,
        real: fd.real,
        city: fd.city,
        sortOrder: Number(fd.sortOrder || 0),
        status: fd.status,
        stockBySize: {},
      };
      $$("[data-stock-size]", form).forEach((input) => {
        payload.stockBySize[input.dataset.stockSize] = Number(input.value || 0);
      });
      if (id) await rawApi(`/products/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      else await rawApi("/products", { method: "POST", body: payload });
      toast("商品已保存");
    } else if (type === "user") {
      await rawApi(`/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: {
          nickname: fd.nickname,
          status: fd.status,
          memberLevel: fd.memberLevel,
          depositCredit: Number(fd.depositCredit || 0),
          size: fd.size,
          city: fd.city,
          addressText: fd.addressText,
        },
      });
      toast("用户资料已更新");
    } else if (type === "order-status") {
      await rawApi(`/orders/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status: fd.status, statusSub: fd.statusSub, adminNote: fd.adminNote },
      });
      toast("订单状态已更新，用户端同步生效");
    } else if (type === "deposit-refund") {
      await rawApi(`/deposits/${encodeURIComponent(id)}/refund`, {
        method: "POST",
        body: { amount: Number(fd.amount || 0), note: fd.note },
      });
      toast("押金处理完成");
    } else if (type === "photographer") {
      const payload = {
        id: fd.id?.trim(),
        name: fd.name,
        title: fd.title,
        avatar: fd.avatar,
        cover: fd.cover,
        rating: Number(fd.rating || 0),
        ordersCount: Number(fd.ordersCount || 0),
        price: Number(fd.price || 0),
        tags: fd.tags,
        works: fd.works,
        bio: fd.bio,
        packageTitle: fd.packageTitle,
        packageDesc: fd.packageDesc,
        packagePrice: Number(fd.packagePrice || 0),
        packageDeposit: Number(fd.packageDeposit || 0),
        packageIncludes: fd.packageIncludes,
        status: fd.status,
        sortOrder: Number(fd.sortOrder || 0),
      };
      if (id) await rawApi(`/photographers/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      else await rawApi("/photographers", { method: "POST", body: payload });
      toast("摄影师已保存");
    } else if (type === "makeup") {
      const payload = {
        id: fd.id?.trim(),
        name: fd.name,
        title: fd.title,
        avatar: fd.avatar,
        desc: fd.desc,
        tags: fd.tags,
        price: Number(fd.price || 0),
        status: fd.status,
        sortOrder: Number(fd.sortOrder || 0),
      };
      if (id) await rawApi(`/makeup/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      else await rawApi("/makeup", { method: "POST", body: payload });
      toast("妆造师已保存");
    } else if (type === "post") {
      const payload = {
        userName: fd.userName,
        avatar: fd.avatar,
        city: fd.city,
        text: fd.text,
        images: fd.images,
        tags: fd.tags,
        productId: fd.productId,
        likes: Number(fd.likes || 0),
        comments: Number(fd.comments || 0),
        status: fd.status,
      };
      if (id) await rawApi(`/posts/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      else await rawApi("/posts", { method: "POST", body: payload });
      toast("社区内容已保存");
    } else if (type === "admin") {
      const payload = {
        username: fd.username,
        name: fd.name,
        role: fd.role,
        status: fd.status,
        password: fd.password || undefined,
      };
      if (id) await rawApi(`/admins/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
      else await rawApi("/admins", { method: "POST", body: payload });
      toast("管理员已保存");
    }
    closeDrawer();
    navigate(state.view);
  } catch (error) {
    toast(error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.label || "保存";
    }
  }
}

/* ---------------------------------------------------------
   Events
   --------------------------------------------------------- */
document.addEventListener("click", async (event) => {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;

  if (action === "nav") {
    navigate(el.dataset.view);
    return;
  }
  if (action === "toggle-menu") {
    if ($("#sidebar").classList.contains("open")) closeMobileMenu();
    else openMobileMenu();
    return;
  }
  if (action === "refresh") {
    navigate(state.view);
    return;
  }
  if (action === "logout") {
    await logout();
    return;
  }
  if (action === "close-drawer") {
    closeDrawer();
    return;
  }
  if (action === "page") {
    const target = el.dataset.target;
    const page = Number(el.dataset.page);
    if (!state[target] || page < 1) return;
    state[target].page = page;
    const loaders = { orders: loadOrders, photos: loadPhotos, users: loadUsers, deposits: loadDeposits, logs: loadLogs };
    (loaders[target] || loadOrders)();
    return;
  }
  if (action === "open-order") {
    openOrderDrawer(el.dataset.id);
    return;
  }
  if (action === "open-user") {
    openUserDrawer(el.dataset.id);
    return;
  }
  if (action === "refund-deposit") {
    openDepositDrawer(el.dataset.id);
    return;
  }
  if (action === "new-product") {
    openProductDrawer(null);
    return;
  }
  if (action === "edit-product") {
    openProductDrawer(el.dataset.id);
    return;
  }
  if (action === "new-photographer") {
    openPhotographerDrawer(null);
    return;
  }
  if (action === "edit-photographer") {
    openPhotographerDrawer(el.dataset.id);
    return;
  }
  if (action === "new-makeup") {
    openMakeupDrawer(null);
    return;
  }
  if (action === "edit-makeup") {
    openMakeupDrawer(el.dataset.id);
    return;
  }
  if (action === "new-post") {
    openPostDrawer(null);
    return;
  }
  if (action === "edit-post") {
    openPostDrawer(el.dataset.id);
    return;
  }
  if (action === "toggle-post") {
    try {
      await rawApi(`/posts/${encodeURIComponent(el.dataset.id)}`, {
        method: "PATCH",
        body: { status: el.dataset.status },
      });
      toast("内容状态已更新");
      navigate("posts");
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  if (action === "new-admin") {
    openAdminDrawer(null);
    return;
  }
  if (action === "edit-admin") {
    openAdminDrawer(el.dataset.id);
    return;
  }
  if (action === "unbind-identity") {
    const user = el.dataset.user;
    const identity = el.dataset.identity;
    if (!window.confirm("确认解绑这个登录身份？解绑后该身份不能用于登录。")) return;
    try {
      await rawApi(`/users/${encodeURIComponent(user)}/identities/${encodeURIComponent(identity)}`, {
        method: "DELETE",
      });
      toast("身份已解绑");
      openUserDrawer(user);
    } catch (error) {
      toast(error.message);
    }
  }
});

document.addEventListener("submit", async (event) => {
  const filter = event.target.closest("form[data-filter]");
  if (filter) {
    event.preventDefault();
    const target = filter.dataset.filter;
    const fd = Object.fromEntries(new FormData(filter).entries());
    if (target === "products") {
      state.products.q = fd.q || "";
      loadProducts();
      return;
    }
    if (state[target]) {
      state[target].page = 1;
      state[target].q = fd.q || "";
      state[target].status = fd.status || "";
      if (fd.type !== undefined) state[target].type = fd.type || "";
      if (fd.entity !== undefined) state[target].entity = fd.entity || "";
      const loaders = {
        orders: loadOrders,
        photos: loadPhotos,
        users: loadUsers,
        deposits: loadDeposits,
        logs: loadLogs,
      };
      (loaders[target] || loadOrders)();
    }
    return;
  }

  const form = event.target.closest("form[data-form]");
  if (form) {
    event.preventDefault();
    await handleFormSubmit(form);
  }
});

document.addEventListener("reset", (event) => {
  const filter = event.target.closest("form[data-filter]");
  if (!filter) return;
  setTimeout(() => {
    filter.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, 0);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
    closeMobileMenu();
  }
});

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
boot();
