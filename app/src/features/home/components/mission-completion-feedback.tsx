import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { CircleStar } from "lucide-react-native";

type MissionCompletionFeedbackProps = {
  animationKey: number;
  message: string;
  visible: boolean;
  onHide: () => void;
};

type ConfettiPieceSpec = {
  color: string;
  delay: number;
  rotation: number;
  size: number;
  travelX: number;
  travelY: number;
};

const confettiPieces: ConfettiPieceSpec[] = [
  { color: "#2C7BE5", delay: 0, rotation: 130, size: 8, travelX: -108, travelY: 46 },
  { color: "#42B883", delay: 40, rotation: -150, size: 7, travelX: -82, travelY: 70 },
  { color: "#F5B942", delay: 20, rotation: 180, size: 9, travelX: -58, travelY: 38 },
  { color: "#F06595", delay: 60, rotation: -120, size: 7, travelX: -28, travelY: 78 },
  { color: "#845EF7", delay: 10, rotation: 160, size: 8, travelX: 22, travelY: 50 },
  { color: "#20C997", delay: 70, rotation: -170, size: 7, travelX: 48, travelY: 84 },
  { color: "#FF922B", delay: 30, rotation: 140, size: 9, travelX: 78, travelY: 58 },
  { color: "#4DABF7", delay: 50, rotation: -130, size: 8, travelX: 106, travelY: 42 },
  { color: "#FFD43B", delay: 90, rotation: 120, size: 7, travelX: -118, travelY: 100 },
  { color: "#51CF66", delay: 100, rotation: -160, size: 8, travelX: 116, travelY: 96 },
];

function ConfettiPiece({
  animationKey,
  spec,
}: {
  animationKey: number;
  spec: ConfettiPieceSpec;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      spec.delay,
      withTiming(1, {
        duration: 980,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [animationKey, progress, spec.delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const fadeOutProgress = Math.max(0, (progress.value - 0.72) / 0.28);

    return {
      opacity: 1 - fadeOutProgress,
      transform: [
        { translateX: spec.travelX * progress.value },
        { translateY: spec.travelY * progress.value },
        { rotate: `${spec.rotation * progress.value}deg` },
        { scale: 0.8 + progress.value * 0.35 },
      ],
    };
  }, [spec.rotation, spec.travelX, spec.travelY]);

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          width: spec.size,
          height: spec.size * 1.6,
          backgroundColor: spec.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function MissionCompletionFeedback({
  animationKey,
  message,
  visible,
  onHide,
}: MissionCompletionFeedbackProps) {
  const toastProgress = useSharedValue(0);
  const formattedMessage = useMemo(() => message.trim(), [message]);

  useEffect(() => {
    if (!visible || !formattedMessage) {
      return;
    }

    toastProgress.value = 0;
    toastProgress.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });

    const timeoutId = setTimeout(onHide, 3600);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [animationKey, formattedMessage, onHide, toastProgress, visible]);

  const toastStyle = useAnimatedStyle(() => {
    return {
      opacity: toastProgress.value,
      transform: [
        { translateY: (1 - toastProgress.value) * -14 },
        { scale: 0.96 + toastProgress.value * 0.04 },
      ],
    };
  });

  if (!visible || !formattedMessage) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.feedbackArea}>
        <View style={styles.confettiLayer}>
          {confettiPieces.map((piece, index) => (
            <ConfettiPiece
              key={`${animationKey}-${index}`}
              animationKey={animationKey}
              spec={piece}
            />
          ))}
        </View>

        <Animated.View style={[styles.toast, toastStyle]}>
          <View style={styles.iconBadge}>
            <CircleStar size={18} color="#FFFFFF" />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title}>Missão concluída</Text>
            <Text style={styles.message}>{formattedMessage}</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: "center",
  },
  feedbackArea: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  confettiLayer: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    height: 130,
    alignItems: "center",
  },
  confettiPiece: {
    position: "absolute",
    top: 16,
    borderRadius: 2,
  },
  toast: {
    width: "100%",
    maxWidth: 420,
    minHeight: 68,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#12314C",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#173B5D",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7BE5",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    color: "#DCEBFA",
    fontSize: 13,
    lineHeight: 18,
  },
});
