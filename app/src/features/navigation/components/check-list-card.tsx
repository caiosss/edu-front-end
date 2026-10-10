import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  AlertTriangle,
  Circle,
  CircleCheck,
  type LucideIcon,
} from "lucide-react-native";

export type ChecklistItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  notice?: ChecklistItemNotice;
  disabledLabel?: string;
};

export type ChecklistItemNotice = {
  message: string;
  tone: "danger" | "info";
};

type ChecklistCardProps = {
  title: string;
  description?: string;
  items: ChecklistItem[];
  checkedIds: string[];
  loadingIds?: string[];
  disabledIds?: string[];
  onToggleItem: (itemId: string) => void;
};

function ChecklistNotice({ notice }: { notice: ChecklistItemNotice }) {
  const isDanger = notice.tone === "danger";

  return (
    <View style={styles.noticeRow}>
      <AlertTriangle size={18} color={isDanger ? "#C92A2A" : "#4F6982"} />
      <Text style={[styles.noticeText, isDanger ? styles.noticeTextDanger : null]}>
        {notice.message}
      </Text>
    </View>
  );
}

/** Onda que se expande a partir do icone quando o item e marcado. */
function CheckRipple() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });

    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.4 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.checkRipple, rippleStyle]} />;
}

export default function ChecklistCard({
  title,
  description,
  items,
  checkedIds,
  loadingIds = [],
  disabledIds = [],
  onToggleItem,
}: ChecklistCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{title}</Text>
      {description ? <Text style={styles.info}>{description}</Text> : null}

      <View style={styles.checklistGroup}>
        {items.map((item) => {
          const isChecked = checkedIds.includes(item.id);
          const isLoading = loadingIds.includes(item.id);
          const isDisabled = isLoading || disabledIds.includes(item.id);
          const notice = !isChecked ? item.notice : undefined;
          const isDanger = notice?.tone === "danger";
          const ItemIcon = item.icon;
          const iconColor = isChecked ? "#1A6FD6" : isDanger ? "#C92A2A" : "#4F6982";
          const actionLabel =
            isLoading
              ? "Enviando..."
              : isChecked
                ? "Concluído"
                : isDisabled && item.disabledLabel
                  ? item.disabledLabel
                  : "Concluir";

          return (
            <Animated.View key={item.id} layout={LinearTransition.duration(220)}>
              <Pressable
                disabled={isDisabled}
                onPress={() => onToggleItem(item.id)}
                style={[
                  styles.checklistRow,
                  isDanger ? styles.checklistRowDanger : null,
                  isChecked ? styles.checklistRowChecked : null,
                  isDisabled ? styles.checklistRowDisabled : null,
                ]}
              >
                <View style={styles.checklistLeft}>
                  <View
                    style={[
                      styles.iconBadge,
                      isDanger ? styles.iconBadgeDanger : null,
                      isChecked ? styles.iconBadgeChecked : null,
                    ]}
                  >
                    {isChecked ? <CheckRipple /> : null}
                    <ItemIcon size={24} color={iconColor} />
                  </View>
                  <View style={styles.checklistTextBlock}>
                    <Text style={styles.checklistTitle}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.checklistSubtitle}>{item.subtitle}</Text>
                    ) : null}
                    {notice ? <ChecklistNotice notice={notice} /> : null}
                  </View>
                </View>

                <View style={styles.checklistRight}>
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#1A6FD6" />
                  ) : isChecked ? (
                    <Animated.View entering={ZoomIn.springify().damping(7)}>
                      <CircleCheck size={30} color="#1A6FD6" />
                    </Animated.View>
                  ) : isDanger ? (
                    <Circle size={30} color="#C92A2A" />
                  ) : (
                    <Circle size={30} color="#7D94AB" />
                  )}
                  <Text
                    style={[
                      styles.checkActionLabel,
                      isChecked ? styles.checkActionLabelDone : null,
                      isDanger ? styles.checkActionLabelDanger : null,
                    ]}
                  >
                    {actionLabel}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#12314C",
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#12314C",
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#48627A",
    lineHeight: 20,
  },
  info: {
    fontSize: 18,
    color: "#35506B",
    lineHeight: 26,
  },
  checklistGroup: {
    gap: 10,
  },
  checklistRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F4F8FC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  checklistRowChecked: {
    backgroundColor: "#E8F2FF",
  },
  checklistRowDanger: {
    borderColor: "#FFB4AB",
    backgroundColor: "#FFF1F1",
  },
  checklistRowDisabled: {
    opacity: 0.72,
  },
  checklistLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFEAF5",
  },
  iconBadgeChecked: {
    backgroundColor: "#CEE4FF",
  },
  checkRipple: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#4DABF7",
  },
  iconBadgeDanger: {
    backgroundColor: "#FFE3E3",
  },
  checklistTextBlock: {
    flex: 1,
    gap: 2,
  },
  checklistTitle: {
    color: "#14324C",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700",
  },
  checklistSubtitle: {
    color: "#48627A",
    fontSize: 16,
    lineHeight: 22,
  },
  noticeRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noticeText: {
    flex: 1,
    color: "#4F6982",
    fontSize: 16,
    lineHeight: 22,
  },
  noticeTextDanger: {
    color: "#C92A2A",
    fontWeight: "700",
  },
  checklistRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
    gap: 4,
  },
  checkActionLabel: {
    fontSize: 16,
    color: "#48627A",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  checkActionLabelDone: {
    color: "#1A6FD6",
    fontWeight: "700",
  },
  checkActionLabelDanger: {
    color: "#C92A2A",
    fontWeight: "700",
  },
});
