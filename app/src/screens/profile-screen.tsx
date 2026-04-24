import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import {
  Bell,
  CalendarDays,
  Eye,
  LogOut,
  Medal,
  Settings,
  UserRound,
  Users,
} from "lucide-react-native";
import { useRegistrationStore } from "../features/register/store/use-registration-store";
import { useAuth } from "../hooks/useAuth";
import SettingItem from "../features/navigation/components/settings-item";

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const parsedValue = asNonEmptyString(value);
    if (parsedValue) {
      return parsedValue;
    }
  }

  return null;
};

const asPositiveNumber = (value: unknown, fallbackValue: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallbackValue;
  }

  return value >= 0 ? value : fallbackValue;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const dateFromEpochSeconds = new Date(value * 1000);
    if (!Number.isNaN(dateFromEpochSeconds.getTime())) {
      return dateFromEpochSeconds;
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
};

const formatDate = (date: Date | null): string => {
  if (!date) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

type ProfileInfoRowProps = {
  label: string;
  value: string;
};

function ProfileInfoRow({ label, value }: ProfileInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { nome, payload, clearToken } = useAuth();
  const draft = useRegistrationStore((state) => state.draft);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const payloadRecord = (payload as Record<string, unknown> | null) ?? null;

  const patientName =
    firstNonEmptyString(
      nome,
      payloadRecord?.fullName,
      payloadRecord?.patientName,
      payloadRecord?.pacienteNomeCompleto,
      draft.pacienteNomeCompleto
    ) ?? "Usuário";

  const transplantType =
    firstNonEmptyString(
      payloadRecord?.transplantType,
      payloadRecord?.patientTransplantType,
      payloadRecord?.pacienteTipoTransplante,
      draft.pacienteTipoTransplante
    ) ?? "Não informado";

  const registrationDate = formatDate(
    parseDate(
      firstNonEmptyString(
        payloadRecord?.createdAt,
        payloadRecord?.created_at,
        payloadRecord?.registrationDate,
        payloadRecord?.registeredAt
      ) ?? payloadRecord?.iat
    )
  );

  const caregiverName = firstNonEmptyString(
    payloadRecord?.caregiverName,
    payloadRecord?.caregiverFullName,
    payloadRecord?.cuidadorNomeCompleto,
    draft.cuidadorNomeCompleto
  );

  const caregiverRelationship = firstNonEmptyString(
    payloadRecord?.caregiverRelationship,
    payloadRecord?.caregiverRelation,
    payloadRecord?.cuidadorRelacao,
    draft.cuidadorRelacao
  );

  const shouldShowCaregiverCard = Boolean(caregiverName || caregiverRelationship);

  const userLevel = Math.max(
    1,
    Math.round(asPositiveNumber(payloadRecord?.level ?? payloadRecord?.nivel, 3))
  );

  const currentXp = asPositiveNumber(
    payloadRecord?.xp ?? payloadRecord?.experiencePoints,
    68
  );

  const xpToNextLevel = Math.max(
    1,
    asPositiveNumber(
      payloadRecord?.xpToNextLevel ?? payloadRecord?.nextLevelXp,
      100
    )
  );

  const normalizedCurrentXp = Math.min(currentXp, xpToNextLevel);
  const xpRemaining = Math.max(xpToNextLevel - normalizedCurrentXp, 0);
  const progressRatio = normalizedCurrentXp / xpToNextLevel;
  const progressWidth = progressTrackWidth * progressRatio;

  const handleProgressTrackLayout = (event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  };

  const accessibilityDescription = useMemo(
    () =>
      accessibilityEnabled
        ? "Contraste elevado e apoio visual habilitados."
        : "Ative para melhorar leitura e navegacao.",
    [accessibilityEnabled]
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
        <View style={styles.mainIconBadge}>
          <UserRound size={34} color="#2C7BE5" />
        </View>

        <Text style={styles.mainName}>{patientName}</Text>

        <View style={styles.metaGroup}>
          <ProfileInfoRow label="Tipo do transplante" value={transplantType} />
          <ProfileInfoRow label="Cadastro em" value={registrationDate} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(230)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Medal size={18} color="#2C7BE5" />
            <Text style={styles.cardTitle}>Conquistas e progresso</Text>
          </View>
          <Text style={styles.levelBadge}>Nível {userLevel}</Text>
        </View>

        <View style={styles.progressTrack} onLayout={handleProgressTrackLayout}>
          <Animated.View
            layout={LinearTransition.duration(260)}
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>

        <Text style={styles.supportingText}>
          Faltam {xpRemaining} XP para chegar ao nivel {userLevel + 1}.
        </Text>
      </Animated.View>

      {shouldShowCaregiverCard ? (
        <Animated.View entering={FadeInDown.delay(130).duration(240)} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Users size={18} color="#2C7BE5" />
              <Text style={styles.cardTitle}>Contatos de apoio</Text>
            </View>
          </View>

          <View style={styles.metaGroup}>
            <ProfileInfoRow
              label="Nome do cuidador"
              value={caregiverName ?? "Não informado"}
            />
            <ProfileInfoRow
              label="Relação"
              value={caregiverRelationship ?? "Não informado"}
            />
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(180).duration(250)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Settings size={18} color="#2C7BE5" />
            <Text style={styles.cardTitle}>Configurações</Text>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <SettingItem
            label="Preferências de notificação"
            description="Receba lembretes sobre medicamentos e missões."
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            Icon={Bell}
          />

          <SettingItem
            label="Configurações de acessibilidade"
            description={accessibilityDescription}
            value={accessibilityEnabled}
            onValueChange={setAccessibilityEnabled}
            Icon={Eye}
          />
        </View>
      </Animated.View>

      <Pressable
        onPress={clearToken}
        style={styles.logoutButton}
        android_ripple={{ color: "rgba(255, 255, 255, 0.22)", borderless: false }}
      >
        <LogOut size={16} color="#FFFFFF" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
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
