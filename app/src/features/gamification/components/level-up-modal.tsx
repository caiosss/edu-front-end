import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  ZoomOut,
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
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { Crown } from "lucide-react-native";
import { confettiPalette, goldGradient, goldPalette, levelUpBackdropGradient } from "../theme";
import type { CelebrationEvent } from "../types";
import { hapticImpact, hapticSuccess } from "../utils/haptics";
import { ConfettiBurst } from "./confetti-burst";
import { Sparkle } from "./sparkle";

type LevelUpEvent = Extract<CelebrationEvent, { kind: "levelUp" }>;

type LevelUpModalProps = {
  event: LevelUpEvent;
  onDone: () => void;
};

const STAGE_SIZE = 240;
const RAY_COUNT = 16;
const CORNER_POWER = [760, 1180] as const;
const RAIN_POWER = [60, 360] as const;
const MEDAL_BURST_POWER = [260, 540] as const;
const MEDAL_INNER_GRADIENT = ["#F59F00", "#E8590C"] as const;

const SPARKLES = [
  { x: 28, y: 52, size: 16, delay: 300 },
  { x: 210, y: 40, size: 14, delay: 650 },
  { x: 222, y: 170, size: 18, delay: 450 },
  { x: 20, y: 184, size: 12, delay: 900 },
  { x: 120, y: 6, size: 12, delay: 1100 },
  { x: 118, y: 236, size: 14, delay: 780 },
];

export function LevelUpModal({ event, onDone }: LevelUpModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const backdrop = useSharedValue(0);
  const medal = useSharedValue(0);
  const rays = useSharedValue(0);
  const glow = useSharedValue(0);
  const breathe = useSharedValue(0);
  const closingRef = useRef(false);

  const [shownLevel, setShownLevel] = useState(event.de);
  const [cornerBurstKey, setCornerBurstKey] = useState(0);
  const [medalBurstKey, setMedalBurstKey] = useState(0);
  const [rainBurstKey, setRainBurstKey] = useState(0);

  const raySize = Math.max(width, height) * 1.1;

  const rayPaths = useMemo(() => {
    const center = raySize / 2;
    const halfAngle = (Math.PI / RAY_COUNT) * 0.42;

    return Array.from({ length: RAY_COUNT }, (_, index) => {
      const angle = (index / RAY_COUNT) * Math.PI * 2;
      const x1 = center + center * Math.cos(angle - halfAngle);
      const y1 = center + center * Math.sin(angle - halfAngle);
      const x2 = center + center * Math.cos(angle + halfAngle);
      const y2 = center + center * Math.sin(angle + halfAngle);

      return `M${center} ${center} L${x1} ${y1} L${x2} ${y2} Z`;
    });
  }, [raySize]);

  const close = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    backdrop.value = withTiming(0, { duration: 260 });
    medal.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    setTimeout(onDone, 270);
  }, [backdrop, medal, onDone]);

  // Roda uma vez por evento: o host remonta o componente pela `key` do evento.
  useEffect(() => {
    hapticImpact("heavy");
    backdrop.value = withTiming(1, { duration: 320 });
    medal.value = withDelay(160, withSpring(1, { damping: 7, stiffness: 110 }));
    rays.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    breathe.value = withDelay(
      1400,
      withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
        -1,
        false
      )
    );

    const timers = [
      setTimeout(() => {
        setCornerBurstKey(Date.now());
        hapticSuccess();
      }, 280),
      setTimeout(() => {
        setShownLevel(event.para);
        setMedalBurstKey(Date.now());
        hapticImpact("heavy");
      }, 950),
      setTimeout(() => setRainBurstKey(Date.now()), 1150),
      setTimeout(close, 9000),
    ];

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(rays);
      cancelAnimation(glow);
      cancelAnimation(breathe);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const raysStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [
      { rotate: `${rays.value * 360}deg` },
      { scale: 0.5 + 0.5 * Math.min(medal.value, 1) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: (0.3 + glow.value * 0.4) * backdrop.value,
    transform: [{ scale: (1 + glow.value * 0.2) * Math.min(medal.value, 1) }],
  }));

  const medalStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, medal.value * 2),
    transform: [{ scale: medal.value }, { rotate: `${(1 - medal.value) * -25}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.05 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar">
          <LinearGradient
            colors={levelUpBackdropGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.rays,
          {
            width: raySize,
            height: raySize,
            left: width / 2 - raySize / 2,
            top: height * 0.38 - raySize / 2,
          },
          raysStyle,
        ]}
      >
        <Svg width={raySize} height={raySize}>
          <Defs>
            <RadialGradient
              id="levelUpRay"
              cx={raySize / 2}
              cy={raySize / 2}
              r={raySize / 2}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFE8A3" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFE8A3" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {rayPaths.map((path, index) => (
            <Path key={index} d={path} fill="url(#levelUpRay)" />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          contentStyle,
        ]}
      >
        <View pointerEvents="none" style={styles.stage}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={medalStyle}>
            <LinearGradient
              colors={goldGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medalOuter}
            >
              <LinearGradient
                colors={MEDAL_INNER_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.medalInner}
              >
                <Crown size={28} color="#FFFFFF" fill="rgba(255, 255, 255, 0.3)" />
                <Animated.Text
                  key={shownLevel}
                  entering={ZoomIn.springify().damping(8)}
                  exiting={ZoomOut.duration(160)}
                  style={styles.levelNumber}
                >
                  {shownLevel}
                </Animated.Text>
                <Text style={styles.levelCaption}>NÍVEL</Text>
              </LinearGradient>
            </LinearGradient>
          </Animated.View>
          {SPARKLES.map((sparkle, index) => (
            <Sparkle key={index} {...sparkle} />
          ))}
          <ConfettiBurst
            burstKey={medalBurstKey}
            origin={{ x: STAGE_SIZE / 2, y: STAGE_SIZE / 2 }}
            count={40}
            colors={goldPalette}
            spread={360}
            power={MEDAL_BURST_POWER}
            gravity={460}
            duration={1700}
          />
        </View>

        <Animated.Text
          entering={FadeInDown.delay(420).springify().damping(14)}
          style={styles.title}
        >
          Você subiu de nível!
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(560).duration(380)} style={styles.subtitle}>
          Do nível {event.de} para o nível {event.para}. Cada registro é um cuidado com você.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(820).springify().damping(12)}>
          <Animated.View style={buttonStyle}>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              style={styles.buttonShadow}
            >
              <LinearGradient
                colors={goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Continuar</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <ConfettiBurst
        burstKey={cornerBurstKey}
        origin={{ x: 0, y: height * 0.92 }}
        count={36}
        direction={-62}
        spread={34}
        power={CORNER_POWER}
        gravity={950}
        duration={2500}
        colors={confettiPalette}
      />
      <ConfettiBurst
        burstKey={cornerBurstKey}
        origin={{ x: width, y: height * 0.92 }}
        count={36}
        direction={-118}
        spread={34}
        power={CORNER_POWER}
        gravity={950}
        duration={2500}
        colors={confettiPalette}
      />
      <ConfettiBurst
        burstKey={rainBurstKey}
        origin={{ x: width / 2, y: -24 }}
        count={44}
        direction={90}
        spread={170}
        power={RAIN_POWER}
        gravity={420}
        duration={3000}
        colors={confettiPalette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rays: {
    position: "absolute",
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  stage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFD43B",
  },
  medalOuter: {
    width: 164,
    height: 164,
    borderRadius: 82,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFD43B",
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    elevation: 16,
  },
  medalInner: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  levelNumber: {
    color: "#FFFFFF",
    fontSize: 46,
    lineHeight: 52,
    fontWeight: "900",
    textShadowColor: "rgba(122, 65, 0, 0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  levelCaption: {
    color: "#FFF3BF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(255, 212, 59, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    color: "#D0E2F5",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
  },
  buttonShadow: {
    marginTop: 18,
    borderRadius: 999,
    shadowColor: "#F5B942",
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  button: {
    minWidth: 220,
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  buttonText: {
    color: "#5C2E00",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
