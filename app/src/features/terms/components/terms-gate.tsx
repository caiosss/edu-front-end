import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ShieldCheck } from "lucide-react-native";
import { AppText, BigButton, StatusBanner } from "../../../components/ui";
import { useAuth } from "../../../hooks/useAuth";
import {
  aceitarTermoUso,
  fetchSituacaoTermoUso,
  type TermoUso,
} from "../../../services/terms-service";
import { colors, layout, radius, spacing } from "../../../theme";
import { toFriendlyMessage } from "../../../utils/friendly-error";
import { TermsDocument } from "./terms-document";

type Estado = "conferindo" | "pendente" | "liberado";

/**
 * Antes de qualquer tela autenticada: quem ainda nao aceitou a versao vigente dos Termos de Uso
 * (conta antiga, ou versao nova publicada) le e aceita aqui. Recusar e sair da conta.
 *
 * Se a situacao nao puder ser conferida (sem internet, backend antigo), libera e confere de novo
 * na proxima abertura: travar o paciente fora do lembrete de dose por uma falha de rede seria
 * pior do que adiar o aceite.
 */
export function TermsGate({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const [estado, setEstado] = useState<Estado>("conferindo");
  const [termo, setTermo] = useState<TermoUso | null>(null);
  const [marcado, setMarcado] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const conferir = useCallback(async () => {
    try {
      const situacao = await fetchSituacaoTermoUso();
      setTermo(situacao.termo);
      setEstado(situacao.pendente ? "pendente" : "liberado");
    } catch (error) {
      console.warn("Nao foi possivel conferir o aceite dos termos", error);
      setEstado("liberado");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    setEstado("conferindo");
    setMarcado(false);
    void conferir();
  }, [conferir, token]);

  const aceitar = async () => {
    if (!termo) {
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      const situacao = await aceitarTermoUso(termo.versao);
      setTermo(situacao.termo);
      setEstado(situacao.pendente ? "pendente" : "liberado");
    } catch (error) {
      setErrorMessage(toFriendlyMessage(error, "Não foi possível registrar o seu aceite."));
      // 409: o termo mudou enquanto a pessoa lia. Traz o texto novo e pede o aceite de novo.
      setMarcado(false);
      void conferir();
    } finally {
      setIsSaving(false);
    }
  };

  if (estado === "liberado") {
    return <>{children}</>;
  }

  if (estado === "conferindo" || !termo) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <ShieldCheck size={30} color={colors.primary} />
        </View>
        <AppText variant="title" align="center" accessibilityRole="header">
          Antes de continuar
        </AppText>
        <AppText variant="small" color="textSecondary" align="center">
          Leia os {termo.titulo} do EduCare. Seus dados de saúde são protegidos e tratados conforme
          a LGPD.
        </AppText>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <TermsDocument corpo={termo.corpo} />
        <AppText variant="small" color="textSecondary">
          Versão {termo.versao}
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        {errorMessage ? <StatusBanner tone="danger" message={errorMessage} /> : null}

        <Pressable
          onPress={() => setMarcado((atual) => !atual)}
          disabled={isSaving}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: marcado }}
          style={styles.checkRow}
        >
          <View style={[styles.box, marcado ? styles.boxChecked : null]}>
            {marcado ? <Check size={18} color={colors.onPrimary} strokeWidth={3} /> : null}
          </View>
          <AppText variant="small" style={styles.checkText}>
            Li e aceito os Termos de Uso e a Política de Privacidade, incluindo o uso dos meus dados
            de saúde para o funcionamento do aplicativo.
          </AppText>
        </Pressable>

        <BigButton
          label={isSaving ? "Salvando..." : "Aceitar e continuar"}
          loading={isSaving}
          disabled={!marcado || isSaving}
          onPress={() => void aceitar()}
        />
        <BigButton
          label="Não aceito, sair da conta"
          variant="secondary"
          disabled={isSaving}
          onPress={() => void logout()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  footer: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  box: {
    width: 28,
    height: 28,
    marginTop: 2,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkText: {
    flex: 1,
  },
});
