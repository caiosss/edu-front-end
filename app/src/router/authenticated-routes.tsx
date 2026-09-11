import type { ComponentType } from "react";
import {
  House,
  Store,
  Medal,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import HomeScreen from "../screens/home-screen";
import StoreScreen from "../screens/store-screen";
import ProgressScreen from "../screens/progress-screen";
import ProfileScreen from "../screens/profile-screen";

export type AuthenticatedRouteKey = "inicio" | "loja" | "progresso" | "perfil";

export type AuthenticatedRoute = {
  key: AuthenticatedRouteKey;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
};

export const authenticatedRoutes: AuthenticatedRoute[] = [
  {
    key: "inicio",
    label: "Início",
    icon: House,
    component: HomeScreen,
  },
  {
    key: "progresso",
    label: "Progresso",
    icon: Medal,
    component: ProgressScreen,
  },
  {
    key: "perfil",
    label: "Perfil",
    icon: UserRound,
    component: ProfileScreen,
  },
];
