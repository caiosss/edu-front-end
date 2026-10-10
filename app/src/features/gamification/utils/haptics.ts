import * as Haptics from "expo-haptics";

// Feedback tatil e enfeite: nunca pode derrubar o fluxo de registro.
const safely = (action: () => Promise<void>) => {
  action().catch(() => undefined);
};

export const hapticSuccess = () =>
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const hapticImpact = (style: "light" | "medium" | "heavy" = "medium") =>
  safely(() =>
    Haptics.impactAsync(
      style === "heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : style === "light"
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
    )
  );

export const hapticSelection = () => safely(() => Haptics.selectionAsync());
