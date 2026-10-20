import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { AppText, BigButton, StatusBanner } from "../../../components/ui";
import { fetchTermoUsoVigente, type TermoUso } from "../../../services/terms-service";
import { colors, layout, radius, spacing } from "../../../theme";
import { toFriendlyMessage } from "../../../utils/friendly-error";
import { TermsDocument } from "./terms-document";

type TermsModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Avisa quem abriu qual versao foi lida — o cadastro envia ela junto. */
  onLoaded?: (termo: TermoUso) => void;
};

/** Leitura dos Termos de Uso e Politica de Privacidade, sem aceite (cadastro e perfil). */
export function TermsModal({ visible, onClose, onLoaded }: TermsModalProps) {
  const [termo, setTermo] = useState<TermoUso | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const carregar = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const vigente = await fetchTermoUsoVigente();
      setTermo(vigente);
      onLoaded?.(vigente);
    } catch (error) {
      setErrorMessage(toFriendlyMessage(error, "Não foi possível carregar os termos."));
    } finally {
      setIsLoading(false);
    }
  }, [onLoaded]);

  useEffect(() => {
    if (visible && !termo) {
      void carregar();
    }
  }, [carregar, termo, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.icon}>
            <ShieldCheck size={28} color={colors.primary} />
          </View>
          <AppText variant="heading" align="center" accessibilityRole="header">
            {termo?.titulo ?? "Termos de Uso e Política de Privacidade"}
          </AppText>
          {termo ? (
            <AppText variant="small" color="textSecondary" align="center">
              Versão {termo.versao}
            </AppText>
          ) : null}
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {errorMessage ? <StatusBanner tone="danger" message={errorMessage} /> : null}
          {termo ? <TermsDocument corpo={termo.corpo} /> : null}
        </ScrollView>

        <View style={styles.footer}>
          {errorMessage ? (
            <BigButton label="Tentar de novo" variant="secondary" onPress={() => void carregar()} />
          ) : null}
          <BigButton label="Fechar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: spacing.xxl + spacing.lg,
  },
  header: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  icon: {
    width: 56,
    height: 56,
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
