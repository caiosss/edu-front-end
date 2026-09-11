import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarCheck, Star } from "lucide-react-native";
import { goldGradient, goldPalette, shineGradient, xpGradient } from "../theme";
import type { CelebrationEvent } from "../types";
import { formatIsoDate } from "../utils/format";
import { hapticImpact, hapticSuccess } from "../utils/haptics";
import { AchievementIcon } from "./achievement-icon";
import { ConfettiBurst } from "./confetti-burst";
import { Sparkle } from "./sparkle";

type AchievementEvent = Extract<CelebrationEvent, { kind: "achievement" }>;

type AchievementUnlockedModalProps = {
  event: AchievementEvent;
  onDone: () => void;
};

const STAGE_WIDTH = 260;
const STAGE_HEIGHT = 176;
const MEDAL_SIZE = 128;
const BURST_POWER = [240, 520] as const;
const HEADER_GRADIENT = ["#2C7BE5", "#5F3DC4"] as const;

const SPARKLES = [
  { x: 42, y: 36, size: 16, delay: 500 },
  { x: 222, y: 30, size: 13, delay: 850 },
  { x: 236, y: 132, size: 17, delay: 650 },
  { x: 26, y: 140, size: 12, delay: 1050 },
  { x: 130, y: 6, size: 11, delay: 1250 },
];

export function AchievementUnlockedModal({ event, onDone }: AchievementUnlockedModalProps) {
  const insets = useSafeAreaInsets();
  const { conquista } = event;
  const unlockedDate = formatIsoDate(event.dataConquista);

  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);
  const flip = useSharedValue(0);
  const shine = useSharedValue(0);
  const closingRef = useRef(false);
  const [burstKey, setBurstKey] = useState(0);

  const close = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    backdrop.value = withTiming(0, { duration: 240 });
    card.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    setTimeout(onDone, 250);
  }, [backdrop, card, onDone]);

  // Roda uma vez por evento: o host remonta o componente pela `key` do evento.
  useEffect(() => {
    hapticImpact("medium");
    backdrop.value = withTiming(1, { duration: 280 });
    card.value = withSpring(1, { damping: 14, stiffness: 120 });
    flip.value = withDelay(180, withSpring(1, { damping: 11, stiffness: 55 }));
    shine.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withDelay(1100, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );

    const timers = [
      setTimeout(() => {
        setBurstKey(Date.now());
        hapticSuccess();
      }, 760),
      setTimeout(close, 9000),
    ];

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(shine);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.value * 1.5),
    transform: [{ translateY: (1 - card.value) * 80 }, { scale: 0.88 + 0.12 * card.value }],
  }));

  const medalStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${(1 - flip.value) * 540}deg` },
      { scale: 0.35 + 0.65 * flip.value },
    ],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -MEDAL_SIZE + shine.value * MEDAL_SIZE * 2 },
      { rotate: "20deg" },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={close}
          accessibilityLabel="Fechar"
        />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[
          styles.center,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={HEADER_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          />

          <View pointerEvents="none" style={styles.stage}>
            {SPARKLES.map((sparkle, index) => (
              <Sparkle key={index} {...sparkle} />
            ))}
            <Animated.View style={[styles.medalShadow, medalStyle]}>
              <LinearGradient
                colors={goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.medal}
              >
                <View style={styles.medalInner}>
                  <AchievementIcon icone={conquista.icone} size={48} color="#FFFFFF" />
                </View>
                <Animated.View style={[styles.shine, shineStyle]}>
                  <LinearGradient
                    colors={shineGradient}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            <ConfettiBurst
              burstKey={burstKey}
              origin={{ x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 }}
              count={46}
              colors={goldPalette}
              spread={360}
              power={BURST_POWER}
              gravity={520}
              duration={1800}
            />
          </View>

          <Animated.Text entering={FadeInDown.delay(480).duration(320)} style={styles.eyebrow}>
            Conquista desbloqueada
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(600).springify().damping(13)}
            style={styles.title}
          >
            {conquista.titulo}
          </Animated.Text>
          {conquista.descricao ? (
            <Animated.Text
              entering={FadeInDown.delay(720).duration(320)}
              style={styles.description}
            >
              {conquista.descricao}
            </Animated.Text>
          ) : null}

          <Animated.View entering={FadeInDown.delay(840).duration(320)} style={styles.chips}>
            <View style={styles.chip}>
              <Star size={13} color="#E8890C" fill="#F5B942" />
              <Text style={styles.chipText}>{conquista.requisitoXp} XP</Text>
            </View>
            {unlockedDate ? (
              <View style={styles.chip}>
                <CalendarCheck size={13} color="#2C7BE5" />
                <Text style={styles.chipText}>{unlockedDate}</Text>
              </View>
            ) : null}
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(980).springify().damping(13)}
            style={styles.buttonWrapper}
          >
            <Pressable onPress={close} accessibilityRole="button" style={styles.buttonShadow}>
              <LinearGradient
                colors={xpGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Incrível!</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(8, 20, 36, 0.82)",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 22,
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    elevation: 18,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 118,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  stage: {
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  medalShadow: {
    borderRadius: MEDAL_SIZE / 2,
    shadowColor: "#F5B942",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 12,
  },
  medal: {
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
    borderRadius: MEDAL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  medalInner: {
    width: MEDAL_SIZE - 30,
    height: MEDAL_SIZE - 30,
    borderRadius: (MEDAL_SIZE - 30) / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 137, 12, 0.35)",
  },
  shine: {
    position: "absolute",
    top: -20,
    bottom: -20,
    width: 46,
  },
  eyebrow: {
    color: "#6741D9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#12314C",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    color: "#48627A",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#F1F6FC",
  },
  chipText: {
    color: "#35506B",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonWrapper: {
    alignSelf: "stretch",
    marginTop: 10,
  },
  buttonShadow: {
    borderRadius: 999,
    shadowColor: "#2C7BE5",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
