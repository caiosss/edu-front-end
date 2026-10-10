import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { AuthenticatedRoute, AuthenticatedRouteKey } from "../../../router/authenticated-routes";
import { colors } from "../../../theme";

type AuthToolbarProps = {
  routes: AuthenticatedRoute[];
  currentRouteKey: AuthenticatedRouteKey;
  onSelectRoute: (routeKey: AuthenticatedRouteKey) => void;
};

type ToolbarItemProps = {
  route: AuthenticatedRoute;
  isActive: boolean;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Rotulos das abas crescem com a fonte do sistema so ate aqui, para caberem as quatro lado a lado. */
const TAB_LABEL_MAX_FONT_SCALE = 1.3;

function ToolbarItem({ route, isActive, onPress }: ToolbarItemProps) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressScale.value, { duration: 140 }) }],
  }));

  const Icon = route.icon;
  const color = isActive ? colors.primary : colors.textSecondary;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = 0.95;
      }}
      onPressOut={() => {
        pressScale.value = 1;
      }}
      accessibilityRole="tab"
      accessibilityLabel={route.label}
      accessibilityState={{ selected: isActive }}
      style={[styles.item, isActive ? styles.itemActive : undefined, animatedStyle]}
      android_ripple={{ color: "rgba(17, 85, 170, 0.16)", borderless: false }}
    >
      <Icon size={26} color={color} strokeWidth={isActive ? 2.4 : 2} />
      <Text
        style={[styles.label, isActive ? styles.labelActive : undefined]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={TAB_LABEL_MAX_FONT_SCALE}
      >
        {route.label}
      </Text>
    </AnimatedPressable>
  );
}

export function AuthToolbar({
  routes,
  currentRouteKey,
  onSelectRoute,
}: AuthToolbarProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {routes.map((route) => (
        <ToolbarItem
          key={route.key}
          route={route}
          isActive={currentRouteKey === route.key}
          onPress={() => onSelectRoute(route.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 20,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#D3DFEA",
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
    elevation: 4,
  },
  item: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "800",
  },
});
