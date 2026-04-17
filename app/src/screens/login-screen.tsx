import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { AnimatedActionButton } from "../features/login/components/animated-action-button";
import { LoginInput } from "../features/login/components/login-input";
import { useLoginController } from "../features/login/hooks/use-login-controller";
import { loginDefaultValues, type LoginFormValues } from "../features/login/types";
import { loginSchema } from "../features/login/validation";

type LoginScreenProps = {
  onNavigateToRegister?: () => void;
};

export default function LoginScreen({ onNavigateToRegister }: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const containerWidth = useMemo(() => Math.min(width - 24, 540), [width]);
  const { feedbackMessage, feedbackState, clearFeedback, submitLogin } =
    useLoginController();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const submitCredentials = handleSubmit(async (values) => {
    await submitLogin(values);
  });

  const handleNavigateToRegister = () => {
    clearFeedback();
    onNavigateToRegister?.();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.duration(320)}
            style={[styles.card, { width: containerWidth }]}
          >
            <Text style={styles.pageTitle}>Entrar</Text>
            <Text style={styles.pageDescription}>
              Acesse seu plano de cuidados e acompanhe desafios diarios.
            </Text>

            <Animated.View entering={FadeInUp.delay(60).duration(260)} style={styles.formGroup}>
              <LoginInput
                control={control}
                name="email"
                label="E-mail"
                placeholder="voce@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <LoginInput
                control={control}
                name="senha"
                label="Senha"
                placeholder="Digite sua senha"
                isPassword
                autoCapitalize="none"
              />
            </Animated.View>

            {feedbackState !== "idle" ? (
              <Animated.View
                entering={FadeInUp.duration(220)}
                style={[
                  styles.feedbackBox,
                  feedbackState === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackError,
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    feedbackState === "success"
                      ? styles.feedbackTextSuccess
                      : styles.feedbackTextError,
                  ]}
                >
                  {feedbackMessage}
                </Text>
              </Animated.View>
            ) : null}

            <View style={styles.actionGroup}>
              <AnimatedActionButton
                label={isSubmitting ? "Entrando..." : "Entrar"}
                onPress={() => {
                  void submitCredentials();
                }}
                loading={isSubmitting}
                disabled={isSubmitting}
              />

              {onNavigateToRegister ? (
                <Pressable
                  onPress={handleNavigateToRegister}
                  style={styles.switchAuthAction}
                  disabled={isSubmitting}
                >
                  <Text style={styles.switchAuthText}>Criar conta</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EAF2FA",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 22,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#FDFEFF",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 18,
    shadowColor: "#1A2B3A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  pageTitle: {
    color: "#12314C",
    fontSize: 24,
    fontWeight: "700",
  },
  pageDescription: {
    color: "#48627A",
    fontSize: 14,
    lineHeight: 20,
  },
  formGroup: {
    gap: 14,
  },
  feedbackBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  feedbackSuccess: {
    backgroundColor: "#EAF8EF",
    borderColor: "#A8D9B8",
  },
  feedbackError: {
    backgroundColor: "#FDEDED",
    borderColor: "#F1B4B4",
  },
  feedbackText: {
    fontWeight: "600",
    fontSize: 13,
  },
  feedbackTextSuccess: {
    color: "#1F6B38",
  },
  feedbackTextError: {
    color: "#9B2F2F",
  },
  actionGroup: {
    gap: 12,
    marginTop: 4,
  },
  switchAuthAction: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  switchAuthText: {
    color: "#2C7BE5",
    fontSize: 14,
    fontWeight: "700",
  },
});
