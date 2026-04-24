import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
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
  );
}

const styles = StyleSheet.create({
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
