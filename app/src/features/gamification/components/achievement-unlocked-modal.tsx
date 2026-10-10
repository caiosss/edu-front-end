import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarCheck } from "lucide-react-native";
import { goldGradient, goldPalette, shineGradient, xpGradient } from "../theme";
import type { CelebrationEvent } from "../types";
import { formatDateBr } from "../utils/format";
import { hapticSuccess } from "../utils/haptics";
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
/** Tempo na tela antes de fechar sozinho; o botao fecha antes. */
const VISIBLE_MS = 12000;
const HEADER_GRADIENT = ["#2C7BE5", "#5F3DC4"] as const;

const SPARKLES = [
  { x: 42, y: 36, size: 16, delay: 500 },
  { x: 236, y: 132, size: 17, delay: 650 },
  { x: 130, y: 6, size: 11, delay: 900 },
];

export function AchievementUnlockedModal({ event, onDone }: AchievementUnlockedModalProps) {
  const insets = useSafeAreaInsets();
  const { conquista, outras } = event;
  const unlockedDate = formatDateBr(conquista.desbloqueadaEm);
  const othersLabel =
    outras > 0
      ? `Você também ganhou mais ${outras} ${outras === 1 ? "conquista" : "conquistas"}. Veja todas em Progresso.`
      : null;

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
    hapticSuccess();
    AccessibilityInfo.announceForAccessibility(
      `Conquista desbloqueada: ${conquista.titulo}.${othersLabel ? ` ${othersLabel}` : ""}`
    );
    backdrop.value = withTiming(1, { duration: 280 });
    card.value = withSpring(1, { damping: 16, stiffness: 120 });
    flip.value = withDelay(180, withSpring(1, { damping: 16, stiffness: 70 }));
    // Um unico reflexo na medalha, sem repetir.
    shine.value = withDelay(
      1000,
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 0 })
      )
    );

    const timers = [setTimeout(() => setBurstKey(Date.now()), 760), setTimeout(close, VISIBLE_MS)];

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
      { rotateY: `${(1 - flip.value) * 180}deg` },
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
                  <AchievementIcon codigo={conquista.codigo} icone={conquista.icone} size={48} color="#FFFFFF" />
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
              count={28}
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

          {othersLabel ? (
            <Animated.Text
              entering={FadeInDown.delay(780).duration(320)}
              style={styles.others}
            >
              {othersLabel}
            </Animated.Text>
          ) : null}

          <Animated.View entering={FadeInDown.delay(840).duration(320)} style={styles.chips}>
            {unlockedDate ? (
              <View style={styles.chip}>
                <CalendarCheck size={18} color="#2C7BE5" />
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
    color: "#5F3DC4",
    fontSize: 16,
    fontWeight: "800",
  },
  title: {
    color: "#12314C",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    color: "#35506B",
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
  },
  others: {
    color: "#35506B",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
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
    fontSize: 16,
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
    minHeight: 60,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
