import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type ProgressIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  labels: string[];
};

export function ProgressIndicator({
  currentStep,
  totalSteps,
  labels,
}: ProgressIndicatorProps) {
  const progressValue = useSharedValue((currentStep + 1) / totalSteps);

  useEffect(() => {
    progressValue.value = withTiming((currentStep + 1) / totalSteps, {
      duration: 260,
    });
  }, [currentStep, progressValue, totalSteps]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedProgressStyle]} />
      </View>

      <View style={styles.labelsContainer}>
        {labels.map((label, index) => {
          const isCompleted = index <= currentStep;

          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepBadge,
                  isCompleted ? styles.stepBadgeActive : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.stepBadgeText,
                    isCompleted ? styles.stepBadgeTextActive : undefined,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[styles.stepLabel, isCompleted ? styles.stepLabelActive : undefined]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  track: {
    width: "100%",
    height: 8,
    borderRadius: 99,
    backgroundColor: "#DCE6F2",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#2C7BE5",
    borderRadius: 99,
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A8B7C6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stepBadgeActive: {
    borderColor: "#2C7BE5",
    backgroundColor: "#2C7BE5",
  },
  stepBadgeText: {
    color: "#6E7F90",
    fontWeight: "700",
    fontSize: 13,
  },
  stepBadgeTextActive: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 12,
    color: "#6E7F90",
    textAlign: "center",
    fontWeight: "600",
  },
  stepLabelActive: {
    color: "#12314C",
  },
});
