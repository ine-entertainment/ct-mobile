import { DeliveryKey } from "../types";

export function shortDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function rentalWindow(days: number, from = new Date()) {
  const ship = addDays(from, 1);
  const deliver = addDays(from, 2);
  const start = addDays(from, 3);
  const end = addDays(start, Math.max(0, days - 1));
  const returnBy = addDays(end, 1);
  return { ship, deliver, start, end, returnBy };
}

export function rentalRangeLabel(days: number) {
  const { start, end } = rentalWindow(days);
  return `${shortDay(start)} - ${shortDay(end)}`;
}

export function photoSlots() {
  const from = new Date();
  const slots: string[] = [];
  for (const offset of [2, 3]) {
    const date = addDays(from, offset);
    slots.push(`${shortDay(date)} 09:00`, `${shortDay(date)} 15:00`);
  }
  return slots;
}

export function dayPrice(price: number, days: number) {
  if (days === 5) return Math.round(price * 1.5);
  if (days === 7) return Math.round(price * 1.9);
  return price;
}

export function deliveryInfo(key: DeliveryKey) {
  if (key === "express") return { fee: 18, label: "顺丰快递" };
  if (key === "pickup") return { fee: 0, label: "门店自提" };
  return { fee: 15, label: "酒店配送" };
}

export function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function maskPhone(phone: string) {
  if (!phone || phone.length < 7) return phone || "";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function bottomPad(hasTabBar = false) {
  return hasTabBar ? 104 : 34;
}
