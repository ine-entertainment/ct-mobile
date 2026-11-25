import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError, configureClient, isBindConflict } from "../api/client";
import { DEFAULT_API_BASE, normalizeApiBase, STORAGE_KEYS } from "../config";
import {
  BindConflict,
  City,
  IdentityType,
  MakeupArtist,
  Order,
  PhotoOrderInput,
  Post,
  Product,
  RentalOrderInput,
  Stats,
  User,
} from "../types";

type BindOutcome =
  | { kind: "success"; user: User }
  | { kind: "conflict"; conflict: BindConflict };

interface AppContextValue {
  ready: boolean;
  bootError: string | null;
  apiBase: string;
  token: string | null;
  user: User | null;
  stats: Stats;
  products: Product[];
  photographers: import("../types").Photographer[];
  makeup: MakeupArtist[];
  posts: Post[];
  orders: Order[];
  cities: City[];
  favorites: Record<string, boolean>;
  signInPhone: (phone: string, code: string) => Promise<boolean>;
  signInWechat: (code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  changeApiBase: (base: string) => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<User>;
  refreshUser: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  fetchOrder: (id: string) => Promise<Order>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  togglePostLike: (postId: string) => Promise<{ liked: boolean; likes: number }>;
  createRental: (input: RentalOrderInput) => Promise<Order>;
  createPhoto: (input: PhotoOrderInput) => Promise<Order>;
  refundOrder: (id: string) => Promise<Order>;
  returnOrder: (id: string) => Promise<Order>;
  reschedulePhoto: (id: string, slot: string) => Promise<Order>;
  bindPhone: (phone: string, code: string) => Promise<BindOutcome>;
  bindWechat: (code: string) => Promise<BindOutcome>;
  mergeAccounts: (ticketId: string, keep: "current" | "target") => Promise<void>;
  unbindIdentity: (type: IdentityType) => Promise<void>;
}

const emptyStats: Stats = { orders: 0, favorites: 0, unread: 0 };
const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

function upsertOrder(list: Order[], order: Order) {
  return [order, ...list.filter((item) => item.id !== order.id)];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [products, setProducts] = useState<Product[]>([]);
  const [photographers, setPhotographers] = useState<import("../types").Photographer[]>([]);
  const [makeup, setMakeup] = useState<MakeupArtist[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const loadEverything = useCallback(async () => {
    const [me, productData, photographerData, makeupData, postData, orderData, cityData, favoriteData] =
      await Promise.all([
        api.me(),
        api.products(),
        api.photographers(),
        api.makeup(),
        api.posts(),
        api.orders(),
        api.cities(),
        api.favorites(),
      ]);
    setUser(me.user);
    setStats(me.stats);
    setProducts(productData.items || []);
    setPhotographers(photographerData.items || []);
    setMakeup(makeupData.items || []);
    setPosts(postData.items || []);
    setOrders(orderData.items || []);
    setCities(cityData.items || []);
    setFavorites(
      Object.fromEntries((favoriteData.items || []).map((product) => [product.id, true]))
    );
    setBootError(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let storedBase = DEFAULT_API_BASE;
      try {
        const savedBase = await AsyncStorage.getItem(STORAGE_KEYS.apiBase);
        if (savedBase) storedBase = normalizeApiBase(savedBase);
      } catch {
        storedBase = DEFAULT_API_BASE;
      }
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
      if (!mounted) return;
      setApiBase(storedBase);
      setToken(storedToken);
      configureClient(storedBase, storedToken || "");
      if (storedToken) {
        try {
          await loadEverything();
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await AsyncStorage.removeItem(STORAGE_KEYS.token);
            setToken(null);
            setUser(null);
            configureClient(storedBase, "");
          } else {
            setBootError(error instanceof Error ? error.message : "启动失败");
          }
        }
      }
      if (mounted) setReady(true);
    })().catch(() => setReady(true));
    return () => {
      mounted = false;
    };
  }, [loadEverything]);

  const signInPhone = useCallback(
    async (phone: string, code: string) => {
      const result = await api.loginPhone(phone, code);
      await AsyncStorage.setItem(STORAGE_KEYS.token, result.token);
      configureClient(apiBase, result.token);
      setToken(result.token);
      setUser(result.user);
      await loadEverything();
      return !!result.isNew;
    },
    [apiBase, loadEverything]
  );

  const signInWechat = useCallback(
    async (code: string) => {
      const result = await api.loginWechat(code);
      await AsyncStorage.setItem(STORAGE_KEYS.token, result.token);
      configureClient(apiBase, result.token);
      setToken(result.token);
      setUser(result.user);
      await loadEverything();
      return !!result.isNew;
    },
    [apiBase, loadEverything]
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* token may already be invalid */
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.token);
    configureClient(apiBase, "");
    setToken(null);
    setUser(null);
    setStats(emptyStats);
    setProducts([]);
    setPhotographers([]);
    setMakeup([]);
    setPosts([]);
    setOrders([]);
    setCities([]);
    setFavorites({});
  }, [apiBase]);

  const retryBootstrap = useCallback(async () => {
    if (!token) return;
    setBootError(null);
    configureClient(apiBase, token);
    try {
      await loadEverything();
    } catch (error) {
      setBootError(error instanceof Error ? error.message : "连接失败");
      throw error;
    }
  }, [apiBase, loadEverything, token]);

  const changeApiBase = useCallback(
    async (value: string) => {
      const next = normalizeApiBase(value);
      await AsyncStorage.setItem(STORAGE_KEYS.apiBase, next);
      setApiBase(next);
      configureClient(next, token || "");
      if (token) {
        await loadEverything();
      } else {
        await api.health();
      }
    },
    [loadEverything, token]
  );

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    const result = await api.updateProfile(patch);
    setUser(result.user);
    return result.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await api.me();
    setUser(result.user);
    setStats(result.stats);
  }, []);

  const refreshOrders = useCallback(async () => {
    const result = await api.orders();
    setOrders(result.items || []);
    setStats((current) => ({ ...current, orders: result.items?.length || 0 }));
  }, []);

  const fetchOrder = useCallback(async (id: string) => {
    const result = await api.order(id);
    setOrders((current) => upsertOrder(current, result.order));
    return result.order;
  }, []);

  const toggleFavorite = useCallback(async (productId: string) => {
    const result = await api.toggleFavorite(productId);
    setFavorites((current) => {
      const next = { ...current };
      if (result.liked) next[productId] = true;
      else delete next[productId];
      return next;
    });
    setStats((current) => ({
      ...current,
      favorites: Math.max(0, current.favorites + (result.liked ? 1 : -1)),
    }));
    return result.liked;
  }, []);

  const togglePostLike = useCallback(async (postId: string) => {
    const result = await api.togglePostLike(postId);
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, likes: result.likes, liked: result.liked } : post
      )
    );
    return { liked: result.liked, likes: result.likes };
  }, []);

  const createRental = useCallback(async (input: RentalOrderInput) => {
    const result = await api.createRental(input);
    setOrders((current) => upsertOrder(current, result.order));
    setStats((current) => ({ ...current, orders: current.orders + 1 }));
    return result.order;
  }, []);

  const createPhoto = useCallback(async (input: PhotoOrderInput) => {
    const result = await api.createPhoto(input);
    setOrders((current) => upsertOrder(current, result.order));
    setStats((current) => ({ ...current, orders: current.orders + 1 }));
    return result.order;
  }, []);

  const refundOrder = useCallback(async (id: string) => {
    const result = await api.refundOrder(id);
    setOrders((current) => upsertOrder(current, result.order));
    return result.order;
  }, []);

  const returnOrder = useCallback(async (id: string) => {
    const result = await api.returnOrder(id);
    setOrders((current) => upsertOrder(current, result.order));
    return result.order;
  }, []);

  const reschedulePhoto = useCallback(async (id: string, slot: string) => {
    const result = await api.reschedulePhoto(id, slot);
    setOrders((current) => upsertOrder(current, result.order));
    return result.order;
  }, []);

  const bindPhone = useCallback(async (phone: string, code: string): Promise<BindOutcome> => {
    try {
      const result = await api.bindPhone(phone, code);
      setUser(result.user);
      return { kind: "success", user: result.user };
    } catch (error) {
      if (isBindConflict(error)) {
        return { kind: "conflict", conflict: error.data };
      }
      throw error;
    }
  }, []);

  const bindWechat = useCallback(async (code: string): Promise<BindOutcome> => {
    try {
      const result = await api.bindWechat(code);
      setUser(result.user);
      return { kind: "success", user: result.user };
    } catch (error) {
      if (isBindConflict(error)) {
        return { kind: "conflict", conflict: error.data };
      }
      throw error;
    }
  }, []);

  const mergeAccounts = useCallback(
    async (ticketId: string, keep: "current" | "target") => {
      const result = await api.merge(ticketId, keep);
      await AsyncStorage.setItem(STORAGE_KEYS.token, result.token);
      configureClient(apiBase, result.token);
      setToken(result.token);
      setUser(result.user);
      await loadEverything();
    },
    [apiBase, loadEverything]
  );

  const unbindIdentity = useCallback(async (type: IdentityType) => {
    const result = await api.unbind(type);
    setUser(result.user);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      bootError,
      apiBase,
      token,
      user,
      stats,
      products,
      photographers,
      makeup,
      posts,
      orders,
      cities,
      favorites,
      signInPhone,
      signInWechat,
      signOut,
      retryBootstrap,
      changeApiBase,
      updateProfile,
      refreshUser,
      refreshOrders,
      fetchOrder,
      toggleFavorite,
      togglePostLike,
      createRental,
      createPhoto,
      refundOrder,
      returnOrder,
      reschedulePhoto,
      bindPhone,
      bindWechat,
      mergeAccounts,
      unbindIdentity,
    }),
    [
      ready,
      bootError,
      apiBase,
      token,
      user,
      stats,
      products,
      photographers,
      makeup,
      posts,
      orders,
      cities,
      favorites,
      signInPhone,
      signInWechat,
      signOut,
      retryBootstrap,
      changeApiBase,
      updateProfile,
      refreshUser,
      refreshOrders,
      fetchOrder,
      toggleFavorite,
      togglePostLike,
      createRental,
      createPhoto,
      refundOrder,
      returnOrder,
      reschedulePhoto,
      bindPhone,
      bindWechat,
      mergeAccounts,
      unbindIdentity,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
