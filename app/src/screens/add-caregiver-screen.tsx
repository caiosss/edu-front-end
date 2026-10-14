import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Send } from "lucide-react-native";
import { useForm } from "react-hook-form";
import {
  AppText,
  BigButton,
  Card,
  ScreenHeader,
  StatusBanner,
  TextField,
} from "../components/ui";
import {
  caregiverInviteDefaultValues,
  type CaregiverInviteFormValues,
  type CaregiverInviteResult,
} from "../features/caregivers/types";
import { caregiverInviteSchema } from "../features/caregivers/validation";
import { inviteCaregiver, resendCaregiverInvite } from "../services/caregiver-service";
import { colors, spacing } from "../theme";
import { toFriendlyMessage } from "../utils/friendly-error";

type AddCaregiverScreenProps = {
  onNavigateBack: () => void;
};

/**
 * O paciente convida um cuidador por e-mail (SPEC-014 §5.2). O cuidador cria a propria senha
 * pelo link; o convite vale 72 horas e entra como "Convite enviado" na lista de cuidadores.
 */
export default function AddCaregiverScreen({ onNavigateBack }: AddCaregiverScreenProps) {
  const [invite, setInvite] = useState<CaregiverInviteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CaregiverInviteFormValues>({
    resolver: zodResolver(caregiverInviteSchema),
    defaultValues: caregiverInviteDefaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const submitInvite = handleSubmit(async (values) => {
    setErrorMessage("");
    setInvite(null);

    try {
      setInvite(await inviteCaregiver(values));
      reset(caregiverInviteDefaultValues);
    } catch (error) {
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível enviar o convite agora. Tente de novo.")
      );
    }
  });

  const resendInvite = async () => {
    if (!invite) {
      return;
    }

    setIsResending(true);
    setErrorMessage("");

    try {
      setInvite(await resendCaregiverInvite(invite.vinculo.id));
    } catch (error) {
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível reenviar o convite agora. Tente de novo.")
      );
    } finally {
      setIsResending(false);
    }
  };

  const invitedName = invite?.vinculo.nomeCompleto ?? "";
  const invitedEmail = invite?.vinculo.email ?? "o e-mail informado";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Convidar cuidador"
          subtitle="A pessoa recebe um link no e-mail e cria a própria senha. Você escolhe depois o que ela pode ver e fazer."
          onBack={onNavigateBack}
        />

        {invite?.envio === "ENVIADO" ? (
          <StatusBanner
            tone="success"
            title="Convite enviado"
            message={`Mandamos o link para ${invitedEmail}. Ele vale por 72 horas. Peça para ${invitedName} abrir o e-mail no celular.`}
          />
        ) : null}

        {invite?.envio === "FALHOU" ? (
          <StatusBanner
            tone="warning"
            title="O e-mail não saiu"
            message={`O convite de ${invitedName} foi criado, mas não conseguimos enviar o e-mail. Tente reenviar.`}
            action={{
              label: isResending ? "Reenviando..." : "Reenviar convite",
              onPress: () => void resendInvite(),
            }}
          />
        ) : null}

        <Animated.View entering={FadeInDown.duration(240)}>
          <Card>
            <TextField
              control={control}
              name="nomeCompleto"
              label="Nome do cuidador"
              placeholder="Ex.: Ana Souza"
              autoCapitalize="words"
            />
            <TextField
              control={control}
              name="email"
              label="E-mail do cuidador"
              hint="O convite chega neste e-mail."
              placeholder="cuidador@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextField
              control={control}
              name="telefone"
              label="Telefone (opcional)"
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />
            <TextField
              control={control}
              name="relacao"
              label="Quem é essa pessoa? (opcional)"
              placeholder="Ex.: filha, enfermeira, vizinho"
            />

            {errorMessage ? <StatusBanner tone="danger" message={errorMessage} /> : null}

            <BigButton
              label={isSubmitting ? "Enviando..." : "Enviar convite"}
              icon={Send}
              loading={isSubmitting}
              disabled={isSubmitting || isResending}
              onPress={() => void submitInvite()}
            />
          </Card>
        </Animated.View>

        <AppText variant="small" color="textSecondary">
          Você pode ter até 3 cuidadores. Cada cuidador acompanha só você.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});
