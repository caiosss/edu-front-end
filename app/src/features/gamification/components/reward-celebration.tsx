import { useCallback, useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleCheck, Clock, Pill, Star, Target } from "lucide-react-native";
import { goldGradient, rewardCardGradient } from "../theme";
import type { CelebrationEvent, Registro } from "../types";
import { capitalize, formatClockTime } from "../utils/format";
import { hapticSuccess } from "../utils/haptics";
import { nivelRatio } from "../utils/level";
import { AnimatedXpBar } from "./animated-xp-bar";
import { ProgressRing } from "./progress-ring";

type RewardEvent = Extract<CelebrationEvent, { kind: "reward" }>;

type RewardCelebrationProps = {
  event: RewardEvent;
  /** Ha outra celebracao na fila (ex.: subida de nivel): o card sai mais cedo. */
  hasFollowUp: boolean;
  onDone: () => void;
};

const MEDAL_SIZE = 56;
/** Tempo na tela: o bastante para ler com calma. Tocar no cartao fecha antes. */
const VISIBLE_MS = 8000;
const VISIBLE_WITH_FOLLOW_UP_MS = 5500;
const DAY_RING_COLORS = ["#96F2D7", "#20C997"] as const;

function OnTimeChip() {
  return (
    <View style={styles.onTimeChip}>
      <Clock size={16} color="#0B7A4B" />
      <Text style={styles.onTimeChipText}>No horário</Text>
    </View>
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
          <Pill size={22} color="#FFFFFF" />
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
                <CircleCheck size={16} color="#DCEBFA" />
                <Text style={styles.neutralChipText}>Registrada</Text>
              </View>
            )}
            {previstoEm ? <Text style={styles.registroHint}>prevista para {previstoEm}</Text> : null}
          </View>
        </View>
        {progresso && progresso.previstas > 0 ? (
          <View style={styles.dayProgress}>
            <ProgressRing
              size={60}
              strokeWidth={6}
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
        <Target size={22} color="#FFFFFF" />
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

export function RewardCelebration({ event, hasFollowUp, onDone }: RewardCelebrationProps) {
  const insets = useSafeAreaInsets();
  const { registro, recompensa } = event.conclusao;
  const nivel = event.nivelAtual;
  const nivelAnterior = event.nivelAnterior;
  const hasXp = recompensa.xp > 0;
  const leveledUp = Boolean(nivelAnterior && nivel.atual > nivelAnterior.atual);
  const registradoEm = formatClockTime(registro?.horarioRegistrado ?? null);
  const announcement = [
    registro?.tipo === "DOSE"
      ? registradoEm
        ? `Dose registrada às ${registradoEm}.`
        : "Dose registrada."
      : "Registro feito.",
    hasXp ? `Mais ${recompensa.xp} XP.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const enter = useSharedValue(0);
  const medal = useSharedValue(0);
  const closingRef = useRef(false);

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
    AccessibilityInfo.announceForAccessibility(announcement);
    enter.value = withSpring(1, { damping: 18, stiffness: 140 });
    medal.value = withDelay(260, withSpring(1, { damping: 14, stiffness: 140 }));

    const closeTimeout = setTimeout(close, VISIBLE_MS);

    return () => {
      clearTimeout(closeTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasFollowUp) {
      return;
    }

    const followUpTimeout = setTimeout(close, VISIBLE_WITH_FOLLOW_UP_MS);

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
    transform: [{ scale: medal.value }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
      <Animated.View style={[styles.cardShadow, cardStyle]}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={announcement}
          accessibilityHint="Toque para fechar o aviso."
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
                </View>

                <View style={styles.rewardText}>
                  <Text style={styles.eyebrow}>Recompensa</Text>
                  <Text style={styles.xpValue}>+{recompensa.xp} XP</Text>
                  {recompensa.motivo ? (
                    <Text style={styles.motivo}>{capitalize(recompensa.motivo)}</Text>
                  ) : null}
                </View>
              </Animated.View>
            ) : recompensa.limiteAtingido ? (
              <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.rewardRow}>
                <View style={styles.limitIcon}>
                  <CircleCheck size={28} color="#8CE99A" />
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
                  <CircleCheck size={28} color="#8CE99A" />
                </View>
                <View style={styles.rewardText}>
                  <Text style={styles.limitTitle}>Registro salvo</Text>
                  <Text style={styles.motivo}>Ele já faz parte do seu histórico de cuidado.</Text>
                </View>
              </Animated.View>
            )}

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
                height={12}
                trackColor="rgba(255, 255, 255, 0.16)"
              />
            </Animated.View>
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
    padding: 18,
    gap: 14,
  },
  eyebrow: {
    color: "#B7CFE6",
    fontSize: 15,
    fontWeight: "700",
  },
  registroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  registroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
  },
  registroMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  registroHint: {
    color: "#C9DBEE",
    fontSize: 16,
    lineHeight: 22,
  },
  onTimeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#B2F2BB",
  },
  onTimeChipText: {
    color: "#0B7A4B",
    fontSize: 15,
    fontWeight: "800",
  },
  neutralChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  neutralChipText: {
    color: "#DCEBFA",
    fontSize: 15,
    fontWeight: "700",
  },
  dayProgress: {
    alignItems: "center",
    gap: 2,
  },
  dayProgressValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  dayProgressLabel: {
    color: "#C9DBEE",
    fontSize: 14,
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
  rewardText: {
    flex: 1,
    gap: 2,
  },
  xpValue: {
    color: "#FFD43B",
    fontSize: 28,
    fontWeight: "900",
  },
  motivo: {
    color: "#DCEBFA",
    fontSize: 16,
    lineHeight: 22,
  },
  limitIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(140, 233, 154, 0.16)",
  },
  limitTitle: {
    color: "#FFFFFF",
    fontSize: 19,
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
    fontSize: 16,
    fontWeight: "800",
  },
  levelLabelUp: {
    color: "#FFD43B",
  },
  levelHint: {
    color: "#C9DBEE",
    fontSize: 15,
    fontWeight: "600",
  },
});
