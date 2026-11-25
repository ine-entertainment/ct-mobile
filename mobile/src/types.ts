export type IdentityType = "phone" | "wechat";
export type DeliveryKey = "hotel" | "express" | "pickup";
export type OrderFilter = "all" | "rental" | "photo";

export interface Identity {
  id: string;
  type: IdentityType;
  typeLabel: string;
  valueMasked?: string;
  value?: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserAddress {
  name: string;
  phone: string;
  text: string;
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  realName: string;
  gender: string;
  height: number | null;
  weight: number | null;
  size: string;
  city: string;
  memberLevel: string;
  depositCredit: number;
  status: string;
  address: UserAddress;
  addressName: string;
  addressPhone: string;
  addressText: string;
  phoneMasked: string;
  wechatMasked: string;
  hasPhone: boolean;
  hasWechat: boolean;
  identities: Identity[];
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  orders: number;
  favorites: number;
  unread: number;
}

export interface SkuStock {
  total: number;
  available: number;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  deposit: number;
  rating: number;
  reviews: number;
  img: string;
  gallery: string[];
  styles: string[];
  badge: string;
  sizes: string[];
  fit: string;
  model: string;
  merchant: string;
  includes: string;
  real: string[];
  city: string;
  status: string;
  stockBySize?: Record<string, SkuStock>;
  stockAvailable?: number;
  stockTotal?: number;
}

export interface PhotographerPackage {
  title: string;
  desc: string;
  price: number;
  deposit: number;
  includes: string[];
}

export interface Photographer {
  id: string;
  name: string;
  title: string;
  avatar: string;
  cover: string;
  rating: number;
  orders: number;
  ordersCount: number;
  price: number;
  tags: string[];
  works: string[];
  bio: string;
  package: PhotographerPackage;
  status: string;
}

export interface MakeupArtist {
  id: string;
  name: string;
  title: string;
  avatar: string;
  desc: string;
  tags: string[];
  price: number;
  status: string;
}

export interface Post {
  id: string;
  user: string;
  userName?: string;
  avatar: string;
  city: string;
  text: string;
  images: string[];
  tags: string[];
  product?: string | null;
  productId?: string | null;
  likes: number;
  comments: number;
  liked?: boolean;
  time: string;
  createdAt: string;
}

export interface OrderTimelineStep {
  label: string;
  time: string;
  state: "done" | "current" | "todo";
}

export interface Order {
  id: string;
  orderNo: string;
  type: "rental" | "photo";
  typeLabel: string;
  status: string;
  statusCode: string;
  statusSub: string;
  title: string;
  image: string;
  date: string;
  merchant: string;
  paid: number;
  deposit: number;
  balance: number;
  size: string;
  days: number;
  delivery: string;
  deliveryLabel?: string;
  insurance: boolean;
  address: UserAddress;
  timeline: OrderTimelineStep[];
  slot: string;
  productId: string | null;
  photographerId: string | null;
  startDate: string;
  endDate: string;
  adminNote?: string;
  depositStatus: string | null;
  depositRefundedAmount: number;
  userId?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  name: string;
  status: "open" | "soon";
  weather: string;
  spots?: number;
  products?: number;
  pieces?: number;
  hotels?: number;
}

export interface AuthSession {
  token: string;
  user: User;
  isNew?: boolean;
}

export interface BindConflictAccount {
  id: string;
  nickname: string;
  avatar: string;
  phoneMasked: string;
  wechatMasked: string;
  createdAt: string;
  orderCount: number;
}

export interface BindConflict {
  error: "identity_conflict";
  message: string;
  ticketId: string;
  ticketExpiresAt: string;
  current: BindConflictAccount;
  target: BindConflictAccount;
}

export interface DashboardStats {
  users: number;
  products: number;
  orders: number;
  revenue: number;
}

export interface RentalOrderInput {
  productId: string;
  size: string;
  days: number;
  delivery: DeliveryKey;
  insurance: boolean;
  address: UserAddress;
}

export interface PhotoOrderInput {
  photographerId: string;
  slot: string;
}
