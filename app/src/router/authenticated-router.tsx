import { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { CelebrationHost } from "../features/gamification/components/celebration-host";
import { ConsentTermModal } from "../features/caregivers/components/consent-term-modal";
import { AuthToolbar } from "../features/navigation/components/auth-toolbar";
import { PushPermissionPrompt } from "../features/notifications/components/push-permission-prompt";
import { useAuth } from "../hooks/useAuth";
import { layout } from "../theme";
import { usePushNotifications } from "../hooks/use-push-notifications";
import AddCaregiverScreen from "../screens/add-caregiver-screen";
import CaregiversScreen from "../screens/caregivers-screen";
import ProfileScreen from "../screens/profile-screen";
import {
  authenticatedRoutes,
  type AuthenticatedRouteKey,
} from "./authenticated-routes";

type AuthenticatedOverlayRoute = "caregivers" | "add-caregiver" | null;

export function AuthenticatedRouter() {
  const [currentRouteKey, setCurrentRouteKey] =
    useState<AuthenticatedRouteKey>("inicio");
  const [overlayRoute, setOverlayRoute] = useState<AuthenticatedOverlayRoute>(null);
  const { tipoUsuario } = useAuth();

  // Tocar num lembrete leva ao Inicio, onde estao as doses e missoes do dia.
  const push = usePushNotifications({
    onAbrirNotificacao: () => {
      setOverlayRoute(null);
      setCurrentRouteKey("inicio");
    },
  });

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
        // O convite e aberto a partir da lista de cuidadores: voltar leva a ela.
        setOverlayRoute(overlay === "add-caregiver" ? "caregivers" : null);
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
      return <AddCaregiverScreen onNavigateBack={() => setOverlayRoute("caregivers")} />;
    }

    if (overlayRoute === "caregivers") {
      return (
        <CaregiversScreen
          onNavigateBack={() => setOverlayRoute(null)}
          onNavigateToInvite={() => setOverlayRoute("add-caregiver")}
        />
      );
    }

    if (activeRoute.key === "perfil") {
      return <ProfileScreen onNavigateToCaregivers={() => setOverlayRoute("caregivers")} />;
    }

    return <ActiveScreen />;
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "left", "bottom"]}>
        <View style={styles.contentColumn}>
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
        </View>
      </SafeAreaView>

      {/* Fora da SafeAreaView para os modais cobrirem a tela inteira, inclusive a toolbar. */}
      <CelebrationHost />
      <PushPermissionPrompt
        visible={push.convitePendente}
        isCaregiver={tipoUsuario === "CUIDADOR"}
        onAccept={push.aceitarConvite}
        onDecline={push.recusarConvite}
      />
      <ConsentTermModal
        visible={push.termoPendente}
        term={push.termo}
        isLoading={push.carregandoTermo}
        isSubmitting={push.salvandoTermo}
        errorMessage={push.erroTermo}
        onAccept={() => void push.aceitarTermo()}
        onDecline={push.recusarTermo}
      />
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
  contentColumn: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  contentArea: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
});
