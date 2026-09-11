import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
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
import { CircleCheck, Clock, Pill, Sparkles, Star, Target } from "lucide-react-native";
import { goldGradient, rewardCardGradient } from "../theme";
import type { CelebrationEvent, Registro } from "../types";
import { capitalize, formatClockTime } from "../utils/format";
import { hapticSelection, hapticSuccess } from "../utils/haptics";
import { nivelRatio } from "../utils/level";
import { AnimatedCounter } from "./animated-counter";
import { AnimatedXpBar } from "./animated-xp-bar";
import { ConfettiBurst } from "./confetti-burst";
import { ProgressRing } from "./progress-ring";
import { Sparkle } from "./sparkle";

type RewardEvent = Extract<CelebrationEvent, { kind: "reward" }>;

type RewardCelebrationProps = {
  event: RewardEvent;
  /** Ha outra celebracao na fila (ex.: subida de nivel): o card sai mais cedo. */
  hasFollowUp: boolean;
  onDone: () => void;
};

const MEDAL_SIZE = 56;
const STAR_BURST_COLORS = ["#FFD43B", "#F5B942", "#FFE8A3", "#FFFFFF", "#63E6BE"] as const;
const STAR_BURST_POWER = [150, 320] as const;
const STAR_BURST_SIZE = [5, 9] as const;
const DAY_RING_COLORS = ["#96F2D7", "#20C997"] as const;

function OnTimeChip() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      500,
      withRepeat(
        withSequence(withTiming(1, { duration: 420 }), withTiming(0, { duration: 420 })),
        3,
        false
      )
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  return (
    <Animated.View style={[styles.onTimeChip, pulseStyle]}>
      <Clock size={12} color="#0B7A4B" />
      <Text style={styles.onTimeChipText}>No horário</Text>
    </Animated.View>
  );
}

function RegistroBlock({ registro }: { registro: Registro | null }) {
  if (registro?.tipo === "DOSE") {
    const registradoEm = formatClockTime(registro.horarioRegistrado);
    const previstoEm = formatClockTime(registro.horarioPrevisto);
    const progresso = registro.progressoDoDia;

    return (
      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.registroRow}>
        <View style={styles.registroIcon}>
          <Pill size={18} color="#FFFFFF" />
        </View>
        <View style={styles.registroText}>
          <Text style={styles.eyebrow}>Registro</Text>
          <Text style={styles.registroTitle}>
            {registradoEm ? `Dose registrada às ${registradoEm}` : "Dose registrada"}
          </Text>
          <View style={styles.registroMeta}>
            {registro.dentroDaJanela === true ? (
              <OnTimeChip />
            ) : (
              <View style={styles.neutralChip}>
                <CircleCheck size={12} color="#DCEBFA" />
                <Text style={styles.neutralChipText}>Registrada</Text>
              </View>
            )}
            {previstoEm ? <Text style={styles.registroHint}>prevista {previstoEm}</Text> : null}
          </View>
        </View>
        {progresso && progresso.previstas > 0 ? (
          <View style={styles.dayProgress}>
            <ProgressRing
              size={52}
              strokeWidth={5}
              ratio={progresso.registradas / progresso.previstas}
              colors={DAY_RING_COLORS}
              trackColor="rgba(255, 255, 255, 0.16)"
              delay={260}
            >
              <Text style={styles.dayProgressValue}>
                {progresso.registradas}/{progresso.previstas}
              </Text>
            </ProgressRing>
            <Text style={styles.dayProgressLabel}>doses hoje</Text>
          </View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.registroRow}>
      <View style={styles.registroIcon}>
        <Target size={18} color="#FFFFFF" />
      </View>
      <View style={styles.registroText}>
        <Text style={styles.eyebrow}>Registro</Text>
        <Text style={styles.registroTitle}>
          {registro?.tipo === "MISSAO" ? "Missão registrada" : "Registro feito"}
        </Text>
        <Text style={styles.registroHint}>Mais um passo no seu plano de cuidado.</Text>
      </View>
    </Animated.View>
  );
}

function FloatingXpChip({ delay, offsetX, xp }: { delay: number; offsetX: number; xp: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1150, easing: Easing.out(Easing.quad) })
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress]);

  const chipStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value < 0.2
        ? progress.value * 5
        : Math.max(0, 1 - (progress.value - 0.2) / 0.8),
    transform: [
      { translateX: offsetX * progress.value },
      { translateY: -84 * progress.value },
      { scale: 0.7 + 0.5 * progress.value },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.floatingChip, chipStyle]}>
      <Text style={styles.floatingChipText}>+{xp}</Text>
    </Animated.View>
  );
}

function PulseRing({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }), 3, false)
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.75 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.2 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle]} />;
}

export function RewardCelebration({ event, hasFollowUp, onDone }: RewardCelebrationProps) {
  const insets = useSafeAreaInsets();
  const { registro, recompensa } = event.conclusao;
  const nivel = event.nivelAtual;
  const nivelAnterior = event.nivelAnterior;
  const hasXp = recompensa.xp > 0;
  const leveledUp = Boolean(nivel && nivelAnterior && nivel.atual > nivelAnterior.atual);
  // A barra so anima quando a resposta traz o nivel; na API anterior ele chega pelo perfil.
  const showLevelProgress = Boolean(nivel && event.conclusao.nivel);

  const enter = useSharedValue(0);
  const medal = useSharedValue(0);
  const closingRef = useRef(false);
  const [burstKey, setBurstKey] = useState(0);

  const close = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    enter.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) });
    setTimeout(onDone, 250);
  }, [enter, onDone]);

  // Roda uma vez por evento: o host remonta o componente pela `key` do evento.
  useEffect(() => {
    hapticSuccess();
    enter.value = withSpring(1, { damping: 15, stiffness: 150 });
    medal.value = withDelay(260, withSpring(1, { damping: 6, stiffness: 120 }));

    const burstTimeout = hasXp ? setTimeout(() => setBurstKey(Date.now()), 460) : null;
    const closeTimeout = setTimeout(close, hasXp ? 5400 : 4400);

    return () => {
      if (burstTimeout) {
        clearTimeout(burstTimeout);
      }
      clearTimeout(closeTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasFollowUp) {
      return;
    }

    const followUpTimeout = setTimeout(close, 3600);

    return () => {
      clearTimeout(followUpTimeout);
    };
  }, [close, hasFollowUp]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.4),
    transform: [
      { translateY: (1 - enter.value) * -130 },
      { scale: 0.92 + 0.08 * enter.value },
    ],
  }));

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: medal.value }, { rotate: `${(1 - medal.value) * -40}deg` }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
      <Animated.View style={[styles.cardShadow, cardStyle]}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso de registro"
        >
          <LinearGradient
            colors={rewardCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Registro antes de recompensa: o concreto e clinico primeiro, o ludico depois. */}
            <RegistroBlock registro={registro} />

            <View style={styles.divider} />

            {hasXp ? (
              <Animated.View entering={FadeIn.delay(300).duration(260)} style={styles.rewardRow}>
                <View style={styles.medalWrapper}>
                  <PulseRing delay={560} />
                  <Animated.View style={medalStyle}>
                    <LinearGradient
                      colors={goldGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.medal}
                    >
                      <Star size={26} color="#FFFFFF" fill="#FFFFFF" />
                    </LinearGradient>
                  </Animated.View>
                  <FloatingXpChip delay={640} offsetX={-20} xp={recompensa.xp} />
                  <FloatingXpChip delay={840} offsetX={16} xp={recompensa.xp} />
                  <FloatingXpChip delay={1040} offsetX={-4} xp={recompensa.xp} />
                  <ConfettiBurst
                    burstKey={burstKey}
                    origin={{ x: MEDAL_SIZE / 2, y: MEDAL_SIZE / 2 }}
                    count={24}
                    colors={STAR_BURST_COLORS}
                    spread={360}
                    power={STAR_BURST_POWER}
                    gravity={260}
                    duration={1150}
                    sizeRange={STAR_BURST_SIZE}
                  />
                </View>

                <View style={styles.rewardText}>
                  <Text style={styles.eyebrow}>Recompensa</Text>
                  <AnimatedCounter
                    value={recompensa.xp}
                    prefix="+"
                    suffix=" XP"
                    delay={500}
                    duration={900}
                    style={styles.xpValue}
                    onComplete={hapticSelection}
                  />
                  {recompensa.motivo ? (
                    <Text style={styles.motivo}>{capitalize(recompensa.motivo)}</Text>
                  ) : null}
                </View>

                <Sparkle x={250} y={10} size={12} delay={700} />
                <Sparkle x={220} y={52} size={9} delay={1100} color="#FFFFFF" />
                <Sparkles size={16} color="#FFE8A3" style={styles.sparklesIcon} />
              </Animated.View>
            ) : recompensa.limiteAtingido ? (
              <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.rewardRow}>
                <View style={styles.limitIcon}>
                  <CircleCheck size={24} color="#8CE99A" />
                </View>
                <View style={styles.rewardText}>
                  <Text style={styles.limitTitle}>Registro feito!</Text>
                  <Text style={styles.motivo}>
                    O XP desta ação por hoje já foi alcançado. Seu registro continua valendo para
                    o seu cuidado.
                  </Text>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.rewardRow}>
                <View style={styles.limitIcon}>
                  <CircleCheck size={24} color="#8CE99A" />
                </View>
                <View style={styles.rewardText}>
                  <Text style={styles.limitTitle}>Registro salvo</Text>
                  <Text style={styles.motivo}>Ele já faz parte do seu histórico de cuidado.</Text>
                </View>
              </Animated.View>
            )}

            {showLevelProgress && nivel ? (
              <Animated.View entering={FadeIn.delay(700).duration(300)} style={styles.levelBlock}>
                <View style={styles.levelHeader}>
                  <Text style={[styles.levelLabel, leveledUp ? styles.levelLabelUp : null]}>
                    {leveledUp ? `Novo nível ${nivel.atual}!` : `Nível ${nivel.atual}`}
                  </Text>
                  <Text style={styles.levelHint}>faltam {nivel.xpParaProximo} XP</Text>
                </View>
                <AnimatedXpBar
                  ratio={nivelRatio(nivel)}
                  fromRatio={nivelAnterior ? nivelRatio(nivelAnterior) : undefined}
                  levelKey={nivel.atual}
                  fromLevelKey={nivelAnterior?.atual}
                  delay={hasXp ? 1000 : 400}
                  height={10}
                  trackColor="rgba(255, 255, 255, 0.16)"
                />
              </Animated.View>
            ) : null}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  cardShadow: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 22,
    shadowColor: "#0A1A2C",
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 14,
  },
  card: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  eyebrow: {
    color: "#8FB7E0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  registroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  registroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(77, 171, 247, 0.28)",
  },
  registroText: {
    flex: 1,
    gap: 3,
  },
  registroTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  registroMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  registroHint: {
    color: "#B7CFE6",
    fontSize: 12,
  },
  onTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#B2F2BB",
  },
  onTimeChipText: {
    color: "#0B7A4B",
    fontSize: 11,
    fontWeight: "800",
  },
  neutralChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  neutralChipText: {
    color: "#DCEBFA",
    fontSize: 11,
    fontWeight: "700",
  },
  dayProgress: {
    alignItems: "center",
    gap: 2,
  },
  dayProgressValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dayProgressLabel: {
    color: "#B7CFE6",
    fontSize: 10,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  medalWrapper: {
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  medal: {
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
    borderRadius: MEDAL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.55)",
  },
  pulseRing: {
    position: "absolute",
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
    borderRadius: MEDAL_SIZE / 2,
    borderWidth: 3,
    borderColor: "#FFD43B",
  },
  floatingChip: {
    position: "absolute",
    top: 8,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: "#FFD43B",
  },
  floatingChipText: {
    color: "#7A4100",
    fontSize: 11,
    fontWeight: "900",
  },
  rewardText: {
    flex: 1,
    gap: 2,
  },
  xpValue: {
    color: "#FFD43B",
    fontSize: 28,
    fontWeight: "900",
    textShadowColor: "rgba(245, 185, 66, 0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  motivo: {
    color: "#DCEBFA",
    fontSize: 13,
    lineHeight: 18,
  },
  sparklesIcon: {
    position: "absolute",
    right: 0,
    top: 0,
  },
  limitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(140, 233, 154, 0.16)",
  },
  limitTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  levelBlock: {
    gap: 6,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  levelLabelUp: {
    color: "#FFD43B",
  },
  levelHint: {
    color: "#B7CFE6",
    fontSize: 11,
    fontWeight: "600",
  },
});
