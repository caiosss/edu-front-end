import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useGamificationStore } from "../../../store/gamification-store";
import { AchievementUnlockedModal } from "./achievement-unlocked-modal";
import { LevelUpModal } from "./level-up-modal";
import { RewardCelebration } from "./reward-celebration";

/**
 * Mostra as celebracoes da fila uma de cada vez, na ordem em que aconteceram:
 * registro/recompensa, depois subida de nivel, depois conquistas.
 */
export function CelebrationHost() {
  const current = useGamificationStore((state) => state.celebrationQueue[0] ?? null);
  const hasFollowUp = useGamificationStore((state) => state.celebrationQueue.length > 1);
  const dequeueCelebration = useGamificationStore((state) => state.dequeueCelebration);

  const handleDone = useCallback(() => {
    if (current) {
      dequeueCelebration(current.id);
    }
  }, [current, dequeueCelebration]);

  if (!current) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.host}>
      {current.kind === "reward" ? (
        <RewardCelebration
          key={current.id}
          event={current}
          hasFollowUp={hasFollowUp}
          onDone={handleDone}
        />
      ) : current.kind === "levelUp" ? (
        <LevelUpModal key={current.id} event={current} onDone={handleDone} />
      ) : (
        <AchievementUnlockedModal key={current.id} event={current} onDone={handleDone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
});
