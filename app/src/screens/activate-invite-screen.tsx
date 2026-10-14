import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useForm } from "react-hook-form";
import {
  AppText,
  BigButton,
  Card,
  KeyboardAwareScrollView,
  Logo,
  ScreenHeader,
  StatusBanner,
  TextField,
} from "../components/ui";
import type { ActivateInviteFormValues } from "../features/caregivers/types";
import { activateInviteSchema, extractInviteToken } from "../features/caregivers/validation";
import { activateCaregiverInvite } from "../services/auth-service";
import { colors, spacing } from "../theme";
import { toFriendlyMessage } from "../utils/friendly-error";

type ActivateInviteScreenProps = {
  /** Token que veio no link `educare://convite?token=...`. Sem ele, a pessoa cola o link. */
  initialToken?: string | null;
  onNavigateToLogin: () => void;
};

/**
 * O cuidador convidado cria a propria senha e ja entra (SPEC-014 §5.2). O link do e-mail vale
 * 72 horas e serve uma vez.
 */
export default function ActivateInviteScreen({
  initialToken,
  onNavigateToLogin,
}: ActivateInviteScreenProps) {
  const { width } = useWindowDimensions();
  const containerWidth = useMemo(() => Math.min(width - 24, 540), [width]);
  const [errorMessage, setErrorMessage] = useState("");
  const hasTokenFromLink = Boolean(initialToken);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ActivateInviteFormValues>({
    resolver: zodResolver(activateInviteSchema),
    defaultValues: { token: initialToken ?? "", senha: "", confirmarSenha: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // O link pode chegar com a tela ja aberta (app em segundo plano).
  useEffect(() => {
    if (initialToken) {
      setValue("token", initialToken);
    }
  }, [initialToken, setValue]);

  const submitActivation = handleSubmit(async (values) => {
    setErrorMessage("");

    try {
      // Ao ativar, a sessao e gravada e o app abre direto no Inicio do cuidador.
      await activateCaregiverInvite(extractInviteToken(values.token), values.senha);
    } catch (error) {
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível ativar o convite agora. Tente de novo.")
      );
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContainer}
      >
        <Logo width={150} />
        <Animated.View entering={FadeInDown.duration(280)} style={{ width: containerWidth }}>
          <Card>
            <ScreenHeader
              title="Aceitar convite"
              subtitle="Você foi convidado para acompanhar o tratamento de um paciente. Crie a sua senha para entrar."
              onBack={onNavigateToLogin}
              backLabel="Voltar para entrar"
            />

            {hasTokenFromLink ? (
              <StatusBanner tone="success" message="Convite recebido pelo link do e-mail." />
            ) : (
              <TextField
                control={control}
                name="token"
                label="Link do convite"
                hint="Copie o link que chegou no seu e-mail e cole aqui."
                placeholder="educare://convite?token=..."
                autoCapitalize="none"
              />
            )}

            <TextField
              control={control}
              name="senha"
              label="Crie uma senha"
              hint="Pelo menos 8 caracteres."
              placeholder="Sua nova senha"
              autoCapitalize="none"
              autoComplete="new-password"
              isPassword
            />
            <TextField
              control={control}
              name="confirmarSenha"
              label="Repita a senha"
              placeholder="Digite a senha de novo"
              autoCapitalize="none"
              autoComplete="new-password"
              isPassword
            />

            {errorMessage ? <StatusBanner tone="danger" message={errorMessage} /> : null}

            <BigButton
              label={isSubmitting ? "Ativando..." : "Criar senha e entrar"}
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={() => void submitActivation()}
            />

            <AppText variant="small" color="textSecondary">
              O link vale por 72 horas e só pode ser usado uma vez. Se ele vencer, peça um novo
              convite ao paciente.
            </AppText>
          </Card>
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
});
