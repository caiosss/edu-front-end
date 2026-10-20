import { useEffect } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import { Logo } from "../components/ui";
import { TermsGate } from "../features/terms/components/terms-gate";
import { useAuth } from "../hooks/useAuth";
import { tokenValido } from "../services/session-storage";
import { useAuthStore } from "../store/auth-store";
import { AuthenticatedRouter } from "./authenticated-router";
import { UnauthenticatedRouter } from "./unauthenticated-router";

export function AppRouter() {
  const { isAuthenticated } = useAuth();
  const hydrated = useAuthStore((state) => state.hydrated);

  // A sessao guardada evita pedir o login a cada abertura; so um token vencido manda de volta.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  // O app pode ficar dias em segundo plano: ao voltar, um token vencido encerra a sessao.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (estado) => {
      const { token, clearToken } = useAuthStore.getState();
      if (estado === "active" && token && !tokenValido(token)) {
        clearToken();
      }
    });

    return () => subscription.remove();
  }, []);

  if (!hydrated) {
    return (
      <View style={styles.splash}>
        <Logo width={160} />
        <ActivityIndicator color="#2C7BE5" />
      </View>
    );
  }

  if (isAuthenticated) {
    return (
      <TermsGate>
        <AuthenticatedRouter />
      </TermsGate>
    );
  }

  return <UnauthenticatedRouter />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    backgroundColor: "#EAF2FA",
  },
});
