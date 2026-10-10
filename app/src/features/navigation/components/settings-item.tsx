import { Bell } from "lucide-react-native";
import { Pressable, Switch, View, Text, StyleSheet } from "react-native";

type SettingItemProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  Icon: typeof Bell;
};

export default function SettingItem({
  label,
  description,
  value,
  onValueChange,
  Icon,
}: SettingItemProps) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={styles.settingRow}
      android_ripple={{ color: "rgba(44, 123, 229, 0.14)", borderless: false }}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconBadge}>
          <Icon size={16} color="#2C7BE5" />
        </View>

        <View style={styles.settingTextBlock}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? "#2C7BE5" : "#D7E0EA"}
        trackColor={{ false: "#C9D5E2", true: "#BFD9FF" }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
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
    gap: 12,
  },
  mainIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  mainName: {
    textAlign: "center",
    color: "#11314D",
    fontSize: 20,
    fontWeight: "700",
  },
  metaGroup: {
    gap: 8,
  },
  infoRow: {
    borderRadius: 10,
    backgroundColor: "#F4F8FC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  infoLabel: {
    color: "#5B738A",
    fontSize: 12,
    fontWeight: "600",
  },
  infoValue: {
    color: "#17324D",
    fontSize: 14,
    fontWeight: "600",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#12314C",
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A6FD6",
    backgroundColor: "#E6F1FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#DFEAF5",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2C7BE5",
  },
  supportingText: {
    color: "#35506B",
    fontSize: 13,
    lineHeight: 19,
  },
  settingsGroup: {
    gap: 8,
  },
  settingRow: {
    borderRadius: 12,
    minHeight: 64,
    backgroundColor: "#F4F8FC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  settingIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3EFFD",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextBlock: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    color: "#12314C",
    fontSize: 14,
    fontWeight: "700",
  },
  settingDescription: {
    color: "#5C738B",
    fontSize: 12,
    lineHeight: 16,
  },
  logoutButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2C7BE5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
