import type { ComponentType } from "react";
import {
  Brain,
  House,
  Medal,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import GamesScreen from "../screens/games-screen";
import HomeScreen from "../screens/home-screen";
import ProfileScreen from "../screens/profile-screen";
import ProgressScreen from "../screens/progress-screen";

export type AuthenticatedRouteKey = "inicio" | "progresso" | "treino" | "perfil";

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
    key: "treino",
    label: "Treinar",
    icon: Brain,
    component: GamesScreen,
  },
  {
    key: "perfil",
    label: "Perfil",
    icon: UserRound,
    component: ProfileScreen,
  },
];
