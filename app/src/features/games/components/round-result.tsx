import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { GraduationCap, RefreshCw, Sparkles } from "lucide-react-native";
import { AnimatedCounter } from "../../gamification/components/animated-counter";
import { ConfettiBurst } from "../../gamification/components/confetti-burst";
import { Sparkle } from "../../gamification/components/sparkle";
import { confettiPalette, goldGradient, xpGradient } from "../../gamification/theme";
import { hapticSelection, hapticSuccess } from "../../gamification/utils/haptics";
import { GAME_INFO } from "../labels";
import type { Jogo, ResultadoRodada } from "../types";

type RoundResultProps = {
  jogo: Jogo;
  resultado: ResultadoRodada;
  onPlayAgain: () => void;
  onBack: () => void;
};

const RAIN_POWER = [80, 320] as const;

/**
 * Fim da rodada. A mensagem vem pronta do backend (RODADA_CONCLUIDA ou RODADA_EXTRA) e nunca
 * fala em erro; o XP chega pelo gamification-service e aparece nas celebracoes do app.
 */
export function RoundResult({ jogo, resultado, onPlayAgain, onBack }: RoundResultProps) {
  const { width } = useWindowDimensions();
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    hapticSuccess();
    const timeoutId = setTimeout(() => setBurstKey(Date.now()), 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View style={styles.stage}>
          <Sparkle x={30} y={30} size={14} delay={200} />
          <Sparkle x={150} y={20} size={11} delay={600} color="#FFFFFF" />
          <Sparkle x={160} y={140} size={16} delay={400} />
          <Animated.View entering={ZoomIn.springify().damping(8)}>
            <LinearGradient
              colors={resultado.acertouTudo ? goldGradient : xpGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medal}
            >
              <GraduationCap size={52} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInDown.delay(250).duration(300)} style={styles.gameName}>
          {GAME_INFO[jogo].titulo}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.scoreRow}>
          <AnimatedCounter
            value={resultado.acertos}
            delay={500}
            duration={700}
            style={styles.score}
            onComplete={hapticSelection}
          />
          <Text style={styles.scoreTotal}>de {resultado.total}</Text>
        </Animated.View>

        {resultado.acertouTudo ? (
          <Animated.View entering={ZoomIn.delay(900).springify().damping(10)} style={styles.allChip}>
            <Sparkles size={14} color="#7A4100" />
            <Text style={styles.allChipText}>Você acertou todas!</Text>
          </Animated.View>
        ) : null}

        <Animated.Text entering={FadeInDown.delay(550).duration(320)} style={styles.message}>
          {resultado.mensagem}
        </Animated.Text>

        {resultado.primeiraDoDia ? (
          <Animated.Text entering={FadeIn.delay(800)} style={styles.hint}>
            Seu progresso é atualizado em instantes.
          </Animated.Text>
        ) : null}
      </View>

      <Animated.View entering={FadeInUp.delay(700).springify().damping(14)} style={styles.actions}>
        <Pressable
          onPress={onPlayAgain}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed ? styles.secondaryPressed : null]}
        >
          <RefreshCw size={18} color="#1A5DB5" />
          <Text style={styles.secondaryText}>Treinar de novo</Text>
        </Pressable>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryPressed : null]}
        >
          <Text style={styles.primaryText}>Voltar aos jogos</Text>
        </Pressable>
      </Animated.View>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiBurst
          burstKey={burstKey}
          origin={{ x: width / 2, y: -20 }}
          count={resultado.acertouTudo ? 36 : 18}
          direction={90}
          spread={170}
          power={RAIN_POWER}
          gravity={420}
          duration={2600}
          colors={confettiPalette}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stage: {
    width: 190,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  medal: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#2C7BE5",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 10,
  },
  gameName: {
    color: "#35506B",
    fontSize: 18,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  score: {
    color: "#12314C",
    fontSize: 64,
    fontWeight: "900",
  },
  scoreTotal: {
    color: "#35506B",
    fontSize: 28,
    fontWeight: "800",
  },
  allChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFE8A3",
  },
  allChipText: {
    color: "#7A4100",
    fontSize: 16,
    fontWeight: "800",
  },
  message: {
    color: "#12314C",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 29,
    textAlign: "center",
    maxWidth: 340,
  },
  hint: {
    color: "#4F6982",
    fontSize: 17,
    textAlign: "center",
  },
  actions: {
    gap: 10,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F2FF",
  },
  secondaryPressed: {
    backgroundColor: "#D6E7FF",
  },
  secondaryText: {
    color: "#1A5DB5",
    fontSize: 18,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7BE5",
  },
  primaryPressed: {
    backgroundColor: "#1A5DB5",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
});
