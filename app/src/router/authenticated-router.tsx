import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { CelebrationHost } from "../features/gamification/components/celebration-host";
import { AuthToolbar } from "../features/navigation/components/auth-toolbar";
import AddCaregiverScreen from "../screens/add-caregiver-screen";
import ProfileScreen from "../screens/profile-screen";
import {
  authenticatedRoutes,
  type AuthenticatedRouteKey,
} from "./authenticated-routes";

type AuthenticatedOverlayRoute = "add-caregiver" | null;

export function AuthenticatedRouter() {
  const [currentRouteKey, setCurrentRouteKey] =
    useState<AuthenticatedRouteKey>("inicio");
  const [overlayRoute, setOverlayRoute] = useState<AuthenticatedOverlayRoute>(null);

  const activeRoute = useMemo(
    () =>
      authenticatedRoutes.find((route) => route.key === currentRouteKey) ??
      authenticatedRoutes[0],
    [currentRouteKey]
  );

  // O botao voltar do Android fecha a sobreposicao ou volta ao Inicio, em vez de fechar o app.
  // Registrado uma unica vez: as telas registram depois e tem prioridade (rodadas, subtelas).
  const navigationStateRef = useRef({ currentRouteKey, overlayRoute });
  navigationStateRef.current = { currentRouteKey, overlayRoute };

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const { currentRouteKey: routeKey, overlayRoute: overlay } = navigationStateRef.current;

      if (overlay !== null) {
        setOverlayRoute(null);
        return true;
      }

      if (routeKey !== "inicio") {
        setCurrentRouteKey("inicio");
        return true;
      }

      return false;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const ActiveScreen = activeRoute.component;
  const isOverlayVisible = overlayRoute !== null;

  const contentKey = isOverlayVisible
    ? `${activeRoute.key}-${overlayRoute}`
    : activeRoute.key;

  const renderContent = () => {
    if (overlayRoute === "add-caregiver") {
      return <AddCaregiverScreen onNavigateBack={() => setOverlayRoute(null)} />;
    }

    if (activeRoute.key === "perfil") {
      return (
        <ProfileScreen
          onNavigateToAddCaregiver={() => setOverlayRoute("add-caregiver")}
        />
      );
    }

    return <ActiveScreen />;
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "left", "bottom"]}>
        <View style={styles.contentArea}>
          <Animated.View
            key={contentKey}
            entering={FadeIn.duration(190)}
            exiting={FadeOut.duration(140)}
            style={styles.screenContainer}
          >
            {renderContent()}
          </Animated.View>
        </View>

        {!isOverlayVisible ? (
          <AuthToolbar
            routes={authenticatedRoutes}
            currentRouteKey={activeRoute.key}
            onSelectRoute={setCurrentRouteKey}
          />
        ) : null}
      </SafeAreaView>

      {/* Fora da SafeAreaView para os modais cobrirem a tela inteira, inclusive a toolbar. */}
      <CelebrationHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EAF2FA",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#EAF2FA",
  },
  contentArea: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});
