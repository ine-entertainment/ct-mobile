import Constants from "expo-constants";

const configured =
  (Constants.expoConfig?.extra?.apiBase as string | undefined) || "http://192.168.50.84:3000/api";

export const DEFAULT_API_BASE = configured;
export const APP_NAME = "未命名项目";
export const APP_VERSION = "1.0.0";

export const STORAGE_KEYS = {
  token: "ct_native_token",
  apiBase: "ct_native_api_base",
  wechatCode: "ct_native_wechat_code",
};

export function normalizeApiBase(value: string): string {
  let next = String(value || "").trim();
  if (!/^https?:\/\//i.test(next)) {
    throw new Error("服务地址需要以 http:// 或 https:// 开头");
  }
  next = next.replace(/\/+$/, "");
  if (!/\/api$/i.test(next)) next += "/api";
  return next;
}

export function serverOrigin(apiBase: string): string {
  return apiBase.replace(/\/api\/?$/i, "");
}
