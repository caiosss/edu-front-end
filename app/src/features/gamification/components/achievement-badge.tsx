import { useEffect } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Lock } from "lucide-react-native";
import { goldGradient } from "../theme";
import type { Conquista } from "../types";
import { formatIsoDate } from "../utils/format";
import { AchievementIcon } from "./achievement-icon";

type AchievementBadgeProps = {
  conquista: Conquista;
  unlocked: boolean;
  dataConquista: string | null;
  xpTotal: number | null;
  index: number;
  isNext?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AchievementBadge({
  conquista,
  unlocked,
  dataConquista,
  xpTotal,
  index,
  isNext = false,
  style,
}: AchievementBadgeProps) {
  const float = useSharedValue(0);
  const nextPulse = useSharedValue(0);

  useEffect(() => {
    if (unlocked) {
      float.value = withDelay(
        index * 140,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          false
        )
      );
    }

    if (isNext) {
      nextPulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
        -1,
        false
      );
    }

    return () => {
      cancelAnimation(float);
      cancelAnimation(nextPulse);
    };
  }, [float, index, isNext, nextPulse, unlocked]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * float.value }],
  }));

  const nextBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(nextPulse.value, [0, 1], ["#B7D6F7", "#2C7BE5"]),
  }));

  const missingXp = xpTotal === null ? null : Math.max(0, conquista.requisitoXp - xpTotal);
  const unlockedDate = formatIsoDate(dataConquista);

  const footerLabel = unlocked
    ? unlockedDate
      ? `Conquistada em ${unlockedDate}`
      : "Conquistada"
    : missingXp !== null && missingXp > 0
      ? `Faltam ${missingXp} XP`
      : `${conquista.requisitoXp} XP`;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 12) * 70)
        .springify()
        .damping(14)}
      style={[
        styles.tile,
        unlocked ? styles.tileUnlocked : styles.tileLocked,
        isNext ? styles.tileNext : null,
        isNext ? nextBorderStyle : null,
        style,
      ]}
    >
      {isNext ? (
        <View style={styles.nextRibbon}>
          <Text style={styles.nextRibbonText}>Próxima</Text>
        </View>
      ) : null}

      <Animated.View style={medalStyle}>
        {unlocked ? (
          <LinearGradient
            colors={goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.medal}
          >
            <AchievementIcon icone={conquista.icone} size={26} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={[styles.medal, styles.medalLocked]}>
            <View style={styles.lockedIcon}>
              <AchievementIcon icone={conquista.icone} size={24} color="#8A9BAD" />
            </View>
            <View style={styles.lockBadge}>
              <Lock size={10} color="#FFFFFF" />
            </View>
          </View>
        )}
      </Animated.View>

      <Text numberOfLines={2} style={[styles.title, unlocked ? null : styles.titleLocked]}>
        {conquista.titulo}
      </Text>

      {conquista.descricao ? (
        <Text numberOfLines={2} style={styles.description}>
          {conquista.descricao}
        </Text>
      ) : null}

      <View style={[styles.footerChip, unlocked ? styles.footerChipUnlocked : null]}>
        <Text style={[styles.footerText, unlocked ? styles.footerTextUnlocked : null]}>
          {footerLabel}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
    gap: 6,
  },
  tileUnlocked: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FFE8A3",
    shadowColor: "#E8890C",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  tileLocked: {
    backgroundColor: "#F4F8FC",
    borderColor: "#E1EAF3",
  },
  tileNext: {
    backgroundColor: "#F0F7FF",
  },
  nextRibbon: {
    position: "absolute",
    top: -9,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#2C7BE5",
  },
  nextRibbonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  medal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  medalLocked: {
    backgroundColor: "#E3EAF2",
  },
  lockedIcon: {
    opacity: 0.6,
  },
  lockBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#F4F8FC",
    backgroundColor: "#7D94AB",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#12314C",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  titleLocked: {
    color: "#4F6982",
  },
  description: {
    color: "#5B738A",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  footerChip: {
    marginTop: 2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#E3EAF2",
  },
  footerChipUnlocked: {
    backgroundColor: "#FFE8A3",
  },
  footerText: {
    color: "#4F6982",
    fontSize: 10,
    fontWeight: "700",
  },
  footerTextUnlocked: {
    color: "#8A4B00",
  },
});
