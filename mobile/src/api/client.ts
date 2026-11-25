import { DEFAULT_API_BASE, serverOrigin } from "../config";
import {
  AuthSession,
  BindConflict,
  City,
  MakeupArtist,
  Order,
  PhotoOrderInput,
  Post,
  Product,
  RentalOrderInput,
  Stats,
  User,
  IdentityType,
  DeliveryKey,
} from "../types";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  data: Record<string, unknown>;

  constructor(message: string, status = 0, code = "network_error", data: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

let apiBase = DEFAULT_API_BASE;
let authToken = "";

export function configureClient(base: string, token: string) {
  apiBase = base.replace(/\/+$/, "");
  authToken = token;
}

export function getApiBase() {
  return apiBase;
}

export function resolveImage(name?: string | null) {
  const value = String(name || "");
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:")) {
    return value.startsWith("/") ? `${serverOrigin(apiBase)}${value}` : value;
  }
  return `${serverOrigin(apiBase)}/assets/img/${encodeURIComponent(value)}.jpg`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 16000);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "请求超时，请检查手机与服务器是否在同一网络"
        : "无法连接服务器，请检查网络或服务地址";
    throw new ApiError(message, 0, "network_error");
  }
  clearTimeout(timer);

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : `请求失败（${response.status}）`;
    const code = typeof data.error === "string" ? data.error : "request_failed";
    throw new ApiError(message, response.status, code, data);
  }

  return data as T;
}

export interface PhoneLoginResult extends AuthSession {
  isNew: boolean;
}

export interface BindSuccess {
  ok: true;
  merged: false;
  user: User;
}

export interface MergeResult {
  ok: true;
  merged: true;
  token: string;
  user: User;
}

export const api = {
  health() {
    return request<{ ok: boolean; users: number }>("/health", { timeoutMs: 6000 });
  },

  sendCode(phone: string) {
    return request<{ ok: boolean; devCode?: string; expiresIn: number; message?: string }>(
      "/auth/phone/send-code",
      { method: "POST", body: { phone } }
    );
  },

  loginPhone(phone: string, code: string) {
    return request<PhoneLoginResult>("/auth/phone/login", {
      method: "POST",
      body: { phone, code },
    });
  },

  loginWechat(code: string) {
    return request<PhoneLoginResult>("/auth/wechat/login", {
      method: "POST",
      body: { code },
    });
  },

  me() {
    return request<{ user: User; stats: Stats }>("/auth/me");
  },

  logout() {
    return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
  },

  bindPhone(phone: string, code: string) {
    return request<BindSuccess>("/auth/bind", {
      method: "POST",
      body: { type: "phone", phone, code },
    });
  },

  bindWechat(code: string) {
    return request<BindSuccess>("/auth/bind", {
      method: "POST",
      body: { type: "wechat", code },
    });
  },

  merge(ticketId: string, keep: "current" | "target") {
    return request<MergeResult>("/auth/merge/confirm", {
      method: "POST",
      body: { ticketId, keep },
    });
  },

  unbind(type: IdentityType) {
    return request<{ ok: boolean; user: User }>(`/auth/identities/${type}`, { method: "DELETE" });
  },

  updateProfile(patch: Record<string, unknown>) {
    return request<{ ok: boolean; user: User }>("/users/me", { method: "PATCH", body: patch });
  },

  products() {
    return request<{ items: Product[] }>("/products");
  },

  product(id: string) {
    return request<{ product: Product }>(`/products/${encodeURIComponent(id)}`);
  },

  photographers() {
    return request<{ items: import("../types").Photographer[] }>("/photographers");
  },

  photographer(id: string) {
    return request<{ photographer: import("../types").Photographer }>(
      `/photographers/${encodeURIComponent(id)}`
    );
  },

  makeup() {
    return request<{ items: MakeupArtist[] }>("/makeup");
  },

  posts() {
    return request<{ items: Post[] }>("/posts");
  },

  cities() {
    return request<{ items: City[] }>("/cities");
  },

  favorites() {
    return request<{ items: Product[] }>("/favorites");
  },

  toggleFavorite(productId: string) {
    return request<{ ok: boolean; liked: boolean }>(
      `/favorites/${encodeURIComponent(productId)}/toggle`,
      { method: "POST" }
    );
  },

  togglePostLike(postId: string) {
    return request<{ ok: boolean; liked: boolean; likes: number }>(
      `/posts/${encodeURIComponent(postId)}/like`,
      { method: "POST" }
    );
  },

  orders(type?: "rental" | "photo") {
    return request<{ items: Order[] }>(`/orders${type ? `?type=${type}` : ""}`);
  },

  order(id: string) {
    return request<{ order: Order }>(`/orders/${encodeURIComponent(id)}`);
  },

  createRental(input: RentalOrderInput) {
    return request<{ ok: boolean; order: Order }>("/orders/rental", {
      method: "POST",
      body: input,
    });
  },

  createPhoto(input: PhotoOrderInput) {
    return request<{ ok: boolean; order: Order }>("/orders/photo", {
      method: "POST",
      body: input,
    });
  },

  refundOrder(id: string, reason = "行程变更") {
    return request<{ ok: boolean; order: Order }>(`/orders/${encodeURIComponent(id)}/refund`, {
      method: "POST",
      body: { reason },
    });
  },

  returnOrder(id: string) {
    return request<{ ok: boolean; order: Order }>(`/orders/${encodeURIComponent(id)}/return`, {
      method: "POST",
    });
  },

  reschedulePhoto(id: string, slot: string) {
    return request<{ ok: boolean; order: Order }>(
      `/orders/${encodeURIComponent(id)}/reschedule`,
      { method: "POST", body: { slot } }
    );
  },
};

export function isBindConflict(error: unknown): error is ApiError & { data: BindConflict } {
  return error instanceof ApiError && error.status === 409 && error.data?.error === "identity_conflict";
}

export function deliveryLabel(key: DeliveryKey | string) {
  if (key === "express") return "顺丰快递";
  if (key === "pickup") return "门店自提";
  return "酒店配送";
}
