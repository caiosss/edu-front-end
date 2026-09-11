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
      <AlertTriangle size={12} color={isDanger ? "#C92A2A" : "#4F6982"} />
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
                    <ItemIcon size={15} color={iconColor} />
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
                    <ActivityIndicator size="small" color="#1A6FD6" />
                  ) : isChecked ? (
                    <Animated.View entering={ZoomIn.springify().damping(7)}>
                      <CircleCheck size={18} color="#1A6FD6" />
                    </Animated.View>
                  ) : isDanger ? (
                    <Circle size={18} color="#C92A2A" />
                  ) : (
                    <Circle size={18} color="#7D94AB" />
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
    fontSize: 20,
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
    padding: 16,
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
    fontSize: 14,
    color: "#35506B",
    lineHeight: 20,
  },
  checklistGroup: {
    gap: 8,
  },
  checklistRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFEAF5",
  },
  iconBadgeChecked: {
    backgroundColor: "#CEE4FF",
  },
  checkRipple: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
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
    fontSize: 14,
    fontWeight: "600",
  },
  checklistSubtitle: {
    color: "#5B738A",
    fontSize: 12,
  },
  noticeRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  noticeText: {
    flex: 1,
    color: "#4F6982",
    fontSize: 11,
    lineHeight: 15,
  },
  noticeTextDanger: {
    color: "#C92A2A",
    fontWeight: "600",
  },
  checklistRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 98,
    gap: 2,
  },
  checkActionLabel: {
    fontSize: 11,
    color: "#5B738A",
    textAlign: "center",
    lineHeight: 14,
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
