import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ArrowRight, Info } from "lucide-react-native";
import { GAME_INFO } from "../labels";
import type { SituacaoJogo } from "../types";

type GameCardProps = {
  situacao: SituacaoJogo;
  index: number;
  isStarting: boolean;
  disabled: boolean;
  onStart: () => void;
};

export function GameCard({ situacao, index, isStarting, disabled, onStart }: GameCardProps) {
  const info = GAME_INFO[situacao.jogo];
  const Icon = info.icon;
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (situacao.disponivel && !reduceMotion) {
      bob.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }

    return () => {
      cancelAnimation(bob);
    };
  }, [bob, reduceMotion, situacao.disponivel]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * bob.value }, { rotate: `${(bob.value - 0.5) * 6}deg` }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 90).springify().damping(14)}
      style={[styles.card, situacao.disponivel ? null : styles.cardUnavailable]}
    >
      <View style={styles.top}>
        <Animated.View style={iconStyle}>
          <LinearGradient
            colors={situacao.disponivel ? info.cores : ["#CED8E2", "#AAB8C5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Icon size={28} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
        <View style={styles.text}>
          <Text style={styles.title}>{info.titulo}</Text>
          <Text style={styles.description}>{info.descricao}</Text>
        </View>
      </View>

      {situacao.disponivel ? (
        <Pressable
          onPress={onStart}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Começar ${info.titulo}`}
          accessibilityState={{ disabled, busy: isStarting }}
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
            disabled && !isStarting ? styles.buttonDisabled : null,
          ]}
        >
          {isStarting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Começar</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      ) : (
        <View style={styles.reason}>
          <Info size={16} color="#4F6982" />
          <Text style={styles.reasonText}>
            {situacao.motivo ?? "Este jogo ainda não está disponível."}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
    gap: 14,
  },
  cardUnavailable: {
    backgroundColor: "#F6F8FA",
    shadowOpacity: 0.04,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: "#12314C",
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2C7BE5",
  },
  buttonPressed: {
    backgroundColor: "#1A5DB5",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  reason: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#EEF2F6",
  },
  reasonText: {
    flex: 1,
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
});
