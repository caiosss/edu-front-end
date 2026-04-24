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
import { Bell, Eye, LogOut, Medal, Settings, UserRound } from "lucide-react-native";
import SettingItem from "../features/navigation/components/settings-item";
import { useAuth } from "../hooks/useAuth";
import { useCaregiverProfile } from "../hooks/use-caregiver-profile";
import { usePatientProfile } from "../hooks/use-patient-profile";

const XP_PER_LEVEL = 1000;

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

type ProfileScreenProps = {
  onNavigateToAddCaregiver?: () => void;
};

function ProfileInfoRow({ label, value }: ProfileInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ onNavigateToAddCaregiver }: ProfileScreenProps) {
  const { tipoUsuario, clearToken } = useAuth();
  const isCaregiverUser = tipoUsuario === "CUIDADOR";

  const {
    patientProfile,
    isLoading: isPatientLoading,
    errorMessage: patientErrorMessage,
    refreshPatientProfile,
  } = usePatientProfile({ enabled: !isCaregiverUser });

  const {
    caregiverProfile,
    isLoading: isCaregiverLoading,
    errorMessage: caregiverErrorMessage,
    refreshCaregiverProfile,
  } = useCaregiverProfile({ enabled: isCaregiverUser });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const isProfileLoading = isCaregiverUser ? isCaregiverLoading : isPatientLoading;
  const profileErrorMessage = isCaregiverUser ? caregiverErrorMessage : patientErrorMessage;
  const hasProfileData = isCaregiverUser
    ? Boolean(caregiverProfile)
    : Boolean(patientProfile);

  const refreshProfile = isCaregiverUser
    ? refreshCaregiverProfile
    : refreshPatientProfile;

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
      {isProfileLoading && !hasProfileData ? (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color="#2C7BE5" />
            <Text style={styles.supportingText}>
              {isCaregiverUser
                ? "Carregando dados do cuidador..."
                : "Carregando dados do paciente..."}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {profileErrorMessage && !hasProfileData ? (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
          <Text style={styles.errorText}>{profileErrorMessage}</Text>
          <Pressable onPress={() => void refreshProfile()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {isCaregiverUser && caregiverProfile ? (
        <Animated.View entering={FadeInDown.duration(220)} style={styles.card}>
          <View style={styles.mainIconBadge}>
            <UserRound size={34} color="#2C7BE5" />
          </View>

          <Text style={styles.mainName}>{caregiverProfile.nomeCompleto}</Text>

          <View style={styles.metaGroup}>
            <ProfileInfoRow label="Relacao" value={caregiverProfile.relacao} />
            <ProfileInfoRow label="Telefone" value={caregiverProfile.telefone} />
          </View>
        </Animated.View>
      ) : null}

      {!isCaregiverUser && patientProfile ? (
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
              <Text style={styles.levelBadge}>
                Nivel {Math.max(1, Math.round(patientProfile.nivel))}
              </Text>
            </View>

            <View style={styles.progressTrack} onLayout={handleProgressTrackLayout}>
              <View style={[styles.progressFill, { width: xpProgressWidth }]} />
            </View>
            <Text style={styles.supportingText}>Voce tem {patientProfile.xpAtual} XP.</Text>
            {/* Moedas devem ser exibidas neste card quando o layout de moedas for adicionado. */}
          </Animated.View>
        </>
      ) : null}

      {!isCaregiverUser && onNavigateToAddCaregiver ? (
        <Pressable
          onPress={onNavigateToAddCaregiver}
          style={styles.addCaregiverButton}
          android_ripple={{ color: "rgba(255, 255, 255, 0.22)", borderless: false }}
        >
          <Text style={styles.addCaregiverButtonText}>Adicionar cuidador</Text>
        </Pressable>
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
  addCaregiverButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#2C7BE5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  addCaregiverButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
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
