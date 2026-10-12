import { Modal, StyleSheet, View } from "react-native";
import { BellRing } from "lucide-react-native";
import { AppText, BigButton } from "../../../components/ui";
import { colors, radius, spacing } from "../../../theme";

type PushPermissionPromptProps = {
  visible: boolean;
  isCaregiver: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * Convite antes do pedido de permissao do Android. Explica o "para que" em linguagem simples;
 * so depois do "Sim" o sistema pergunta. Recusar aqui nao gasta a pergunta do sistema: o
 * convite volta no proximo login.
 */
export function PushPermissionPrompt({ visible, isCaregiver, onAccept, onDecline }: PushPermissionPromptProps) {
  const texto = isCaregiver
    ? "Avisamos você quando uma dose da pessoa que você acompanha não for registrada no horário."
    : "Avisamos você no horário de cada remédio, mesmo com o aplicativo fechado.";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.icon}>
            <BellRing size={32} color={colors.primary} />
          </View>
          <AppText variant="title" align="center">
            {isCaregiver ? "Receber os avisos?" : "Receber os lembretes do remédio?"}
          </AppText>
          <AppText align="center" color="textSecondary">{texto}</AppText>
          <AppText variant="small" align="center" color="textSecondary">
            Por padrão, o aviso não mostra o nome do remédio na tela bloqueada.
          </AppText>
          <View style={styles.actions}>
            <BigButton label={isCaregiver ? "Sim, quero os avisos" : "Sim, quero os lembretes"} onPress={onAccept} />
            <BigButton label="Agora não" variant="secondary" onPress={onDecline} />
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
    padding: spacing.xl,
  },
  card: {
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
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
