import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { AppText, BigButton, StatusBanner } from "../../../components/ui";
import { colors, layout, radius, spacing } from "../../../theme";
import type { ConsentTerm } from "../types";

type ConsentTermModalProps = {
  visible: boolean;
  term: ConsentTerm | null;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * Mostra o texto vigente do termo antes da concessao (SPEC-003 §5.4). O texto vem do backend,
 * versionado: o app nunca escreve o termo por conta propria.
 */
export function ConsentTermModal({
  visible,
  term,
  isLoading,
  isSubmitting,
  errorMessage,
  onAccept,
  onDecline,
}: ConsentTermModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.icon}>
            <ShieldCheck size={32} color={colors.primary} />
          </View>
          <AppText variant="title" align="center">
            {term?.titulo ?? "Autorização"}
          </AppText>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : term ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              <AppText>{term.corpo.trim()}</AppText>
            </ScrollView>
          ) : null}

          {errorMessage ? <StatusBanner tone="danger" message={errorMessage} /> : null}

          <View style={styles.actions}>
            <BigButton
              label={isSubmitting ? "Salvando..." : "Autorizo"}
              loading={isSubmitting}
              disabled={!term || isLoading || isSubmitting}
              onPress={onAccept}
            />
            <BigButton
              label="Agora não"
              variant="secondary"
              disabled={isSubmitting}
              onPress={onDecline}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(18, 54, 98, 0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: layout.maxDialogWidth,
    alignSelf: "center",
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  icon: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
});
