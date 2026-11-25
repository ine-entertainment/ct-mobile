import { router } from "expo-router";

const tabPaths: Record<string, string> = {
  Home: "/home",
  Rent: "/rent",
  Photo: "/photo",
  Community: "/community",
  Profile: "/profile",
};

type ParamBag = Record<string, unknown> | undefined;

function routePath(name: string, params?: ParamBag): string {
  switch (name) {
    case "Home":
    case "Rent":
    case "Photo":
    case "Community":
    case "Profile":
      return tabPaths[name];
    case "Product":
      return `/product/${params?.productId}`;
    case "Booking":
      return `/booking?productId=${encodeURIComponent(String(params?.productId))}&size=${encodeURIComponent(
        String(params?.size)
      )}&days=${encodeURIComponent(String(params?.days))}&delivery=${encodeURIComponent(
        String(params?.delivery)
      )}&insurance=${encodeURIComponent(String(params?.insurance))}`;
    case "Success":
      return `/success/${params?.orderId}`;
    case "Orders":
      return params?.filter ? `/orders?filter=${encodeURIComponent(String(params.filter))}` : "/orders";
    case "OrderDetail":
      return `/orders/${params?.orderId}`;
    case "Photographer":
      return `/photographer/${params?.photographerId}${
        params?.slot ? `?slot=${encodeURIComponent(String(params.slot))}` : ""
      }`;
    case "City":
      return "/city";
    case "Makeup":
      return "/makeup";
    case "Account":
      return "/account";
    case "Main":
      return tabPaths[String(params?.screen || "Home")] || "/home";
    default:
      return "/home";
  }
}

export function useAppNavigation() {
  return {
    navigate(name: string, params?: ParamBag) {
      const path = routePath(name, params);
      if (name === "Main" || ["Home", "Rent", "Photo", "Community", "Profile"].includes(name)) {
        router.navigate(path as never);
      } else {
        router.push(path as never);
      }
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace("/home" as never);
    },
    reset({ routes }: { index?: number; routes: { name: string; params?: ParamBag }[] }) {
      const tail = routes.filter((route) => route.name !== "Main");
      if (router.canDismiss()) router.dismissAll();
      if (tail.length === 0) {
        const main = routes.find((route) => route.name === "Main");
        router.navigate(routePath("Main", main?.params) as never);
        return;
      }
      for (const route of tail) {
        router.push(routePath(route.name, route.params) as never);
      }
    },
  };
}
