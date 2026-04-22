import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import {
  Bell,
  Circle,
  CircleCheck,
  CircleStar,
  GlassWater,
  Pill,
  Star,
  type LucideIcon,
} from "lucide-react-native";

export type ChecklistItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
};

export const medications: ChecklistItem[] = [
  {
    id: "tacrolimo",
    title: "Tacrolimo",
    subtitle: "1 mg - 08:00",
    icon: Pill,
  },
  {
    id: "prednisona",
    title: "Prednisona",
    subtitle: "5 mg - 12:00",
    icon: Pill,
  },
  {
    id: "micofenolato",
    title: "Micofenolato",
    subtitle: "500 mg - 20:00",
    icon: Pill,
  },
];

export const dailyMissions: ChecklistItem[] = [
  {
    id: "tomar-medicamentos",
    title: "Tomar todos os medicamentos",
    icon: Pill,
  },
  {
    id: "hidratar",
    title: "Beber 2L de agua",
    icon: GlassWater,
  },
  {
    id: "caminhada",
    title: "Realizar uma leve caminhada",
    icon: Star,
  },
  {
    id: "sintomas",
    title: "Registrar sintomas",
    icon: CircleStar,
  },
];

type ChecklistCardProps = {
  title: string;
  description?: string;
  items: ChecklistItem[];
  checkedIds: string[];
  onToggleItem: (itemId: string) => void;
};

export default function ChecklistCard({
  title,
  description,
  items,
  checkedIds,
  onToggleItem,
}: ChecklistCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{title}</Text>
      {description ? <Text style={styles.info}>{description}</Text> : null}

      <View style={styles.checklistGroup}>
        {items.map((item) => {
          const isChecked = checkedIds.includes(item.id);
          const ItemIcon = item.icon;

          return (
            <Animated.View key={item.id} layout={LinearTransition.duration(220)}>
              <Pressable
                onPress={() => onToggleItem(item.id)}
                style={[styles.checklistRow, isChecked ? styles.checklistRowChecked : null]}
              >
                <View style={styles.checklistLeft}>
                  <View style={[styles.iconBadge, isChecked ? styles.iconBadgeChecked : null]}>
                    <ItemIcon size={15} color={isChecked ? "#1A6FD6" : "#4F6982"} />
                  </View>
                  <View style={styles.checklistTextBlock}>
                    <Text style={styles.checklistTitle}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.checklistSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.checklistRight}>
                  {isChecked ? (
                    <CircleCheck size={18} color="#1A6FD6" />
                  ) : (
                    <Circle size={18} color="#7D94AB" />
                  )}
                  <Text
                    style={[
                      styles.checkActionLabel,
                      isChecked ? styles.checkActionLabelDone : null,
                    ]}
                  >
                    {isChecked ? "Concluído" : "Concluir"}
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
});