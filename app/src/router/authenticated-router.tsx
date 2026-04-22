import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AuthToolbar } from "../features/navigation/components/auth-toolbar";
import {
  authenticatedRoutes,
  type AuthenticatedRouteKey,
} from "./authenticated-routes";

export function AuthenticatedRouter() {
  const [currentRouteKey, setCurrentRouteKey] =
    useState<AuthenticatedRouteKey>("inicio");

  const activeRoute = useMemo(
    () =>
      authenticatedRoutes.find((route) => route.key === currentRouteKey) ??
      authenticatedRoutes[0],
    [currentRouteKey]
  );

  const ActiveScreen = activeRoute.component;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "right", "left", "bottom"]}>
      <View style={styles.contentArea}>
        <Animated.View
          key={activeRoute.key}
          entering={FadeIn.duration(190)}
          exiting={FadeOut.duration(140)}
          style={styles.screenContainer}
        >
          <ActiveScreen />
        </Animated.View>
      </View>

      <AuthToolbar
        routes={authenticatedRoutes}
        currentRouteKey={activeRoute.key}
        onSelectRoute={setCurrentRouteKey}
      />
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
