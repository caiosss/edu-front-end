import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Bell, Eye, LogOut, Medal, Settings, UserRound, Users } from "lucide-react-native";
import SettingItem from "../features/navigation/components/settings-item";
import { useRegistrationStore } from "../features/register/store/use-registration-store";
import { useAuth } from "../hooks/useAuth";
import { usePatientProfile } from "../hooks/use-patient-profile";

const XP_PER_LEVEL = 1000;

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

const parseDate = (value: string): Date | null => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const formatDate = (value: string): string => {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
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
  const { payload, clearToken } = useAuth();
  const draft = useRegistrationStore((state) => state.draft);
  const { patientProfile, isLoading, errorMessage, refreshPatientProfile } = usePatientProfile();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const payloadRecord = (payload as Record<string, unknown> | null) ?? null;

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
  const currentXp = patientProfile?.xpAtual ?? 0;
  const xpProgressRatio = Math.max(0, Math.min((currentXp % XP_PER_LEVEL) / XP_PER_LEVEL, 1));
  const xpProgressWidth = progressTrackWidth * xpProgressRatio;

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
      {isLoading && !patientProfile ? (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color="#2C7BE5" />
            <Text style={styles.supportingText}>Carregando dados do paciente...</Text>
          </View>
        </Animated.View>
      ) : null}

      {errorMessage && !patientProfile ? (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => void refreshPatientProfile()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {patientProfile ? (
        <>
          <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
            <View style={styles.mainIconBadge}>
              <UserRound size={34} color="#2C7BE5" />
            </View>

            <Text style={styles.mainName}>{patientProfile.nomeCompleto}</Text>

            <View style={styles.metaGroup}>
              <ProfileInfoRow
                label="Tipo do transplante"
                value={patientProfile.tipoTransplante}
              />
              <ProfileInfoRow
                label="Data do transplante"
                value={formatDate(patientProfile.dataTransplante)}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(230)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Medal size={18} color="#2C7BE5" />
                <Text style={styles.cardTitle}>Conquistas e progresso</Text>
              </View>
              <Text style={styles.levelBadge}>Nivel {Math.max(1, Math.round(patientProfile.nivel))}</Text>
            </View>

            <View style={styles.progressTrack} onLayout={handleProgressTrackLayout}>
              <View style={[styles.progressFill, { width: xpProgressWidth }]} />
            </View>
            <Text style={styles.supportingText}>Voce tem {patientProfile.xpAtual} XP.</Text>
            {/* Moedas devem ser exibidas neste card quando o layout de moedas for adicionado. */}
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
                  value={caregiverName ?? "Nao informado"}
                />
                <ProfileInfoRow
                  label="Relacao"
                  value={caregiverRelationship ?? "Nao informado"}
                />
              </View>
            </Animated.View>
          ) : null}
        </>
      ) : null}

      <Animated.View entering={FadeInDown.delay(180).duration(250)} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Settings size={18} color="#2C7BE5" />
            <Text style={styles.cardTitle}>Configuracoes</Text>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <SettingItem
            label="Preferencias de notificacao"
            description="Receba lembretes sobre medicamentos e missoes."
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            Icon={Bell}
          />

          <SettingItem
            label="Configuracoes de acessibilidade"
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
  loadingBlock: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    color: "#9B2F2F",
    fontSize: 13,
    fontWeight: "600",
  },
  retryButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#2C7BE5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
