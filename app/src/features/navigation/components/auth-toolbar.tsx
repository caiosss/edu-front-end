import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { AuthenticatedRoute, AuthenticatedRouteKey } from "../../../router/authenticated-routes";

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

function ToolbarItem({ route, isActive, onPress }: ToolbarItemProps) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressScale.value, { duration: 140 }) }],
  }));

  const Icon = route.icon;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = 0.95;
      }}
      onPressOut={() => {
        pressScale.value = 1;
      }}
      style={[styles.item, isActive ? styles.itemActive : undefined, animatedStyle]}
      android_ripple={{ color: "rgba(44, 123, 229, 0.16)", borderless: false }}
    >
      <Icon size={18} color={isActive ? "#2C7BE5" : "#5D7389"} />
      <Text style={[styles.label, isActive ? styles.labelActive : undefined]}>{route.label}</Text>
    </AnimatedPressable>
  );
}

export function AuthToolbar({
  routes,
  currentRouteKey,
  onSelectRoute,
}: AuthToolbarProps) {
  return (
    <View style={styles.container}>
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
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  itemActive: {
    backgroundColor: "#E6F1FF",
  },
  label: {
    color: "#5D7389",
    fontSize: 12,
    fontWeight: "600",
  },
  labelActive: {
    color: "#2C7BE5",
    fontWeight: "700",
  },
});

