import { useState } from "react";
import LoginScreen from "../screens/login-screen";
import RegisterScreen from "../screens/register-screen";

type UnauthenticatedRoute = "login" | "register";

export function UnauthenticatedRouter() {
  const [currentRoute, setCurrentRoute] = useState<UnauthenticatedRoute>("login");

  if (currentRoute === "register") {
    return <RegisterScreen onNavigateToLogin={() => setCurrentRoute("login")} />;
  }

  return <LoginScreen onNavigateToRegister={() => setCurrentRoute("register")} />;
}

