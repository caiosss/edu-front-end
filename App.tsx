import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import LoginScreen from "./app/src/screens/login-screen";
import RegisterScreen from "./app/src/screens/register-screen";

type AppScreen = "login" | "register";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {currentScreen === "login" ? (
        <LoginScreen onNavigateToRegister={() => setCurrentScreen("register")} />
      ) : (
        <RegisterScreen onNavigateToLogin={() => setCurrentScreen("login")} />
      )}
    </GestureHandlerRootView>
  );
}
