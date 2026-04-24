import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { CaregiverFormFields } from "../features/register/components/caregiver-form-fields";
import { FormInput } from "../features/register/components/form-input";
import { ProgressIndicator } from "../features/register/components/progress-indicator";
import { buildRegisterPayload } from "../features/register/payload";
import { useRegistrationStore } from "../features/register/store/use-registration-store";
import type { RegistrationFormValues, UserType } from "../features/register/types";
import { registrationSchema } from "../features/register/validation";
import { registerUser } from "../services/registration-service";

type TransitionDirection = "forward" | "backward";
type FeedbackState = "idle" | "success" | "error";
type RegisterStage = "steps" | "caregiver";
type RegisterScreenProps = {
  onNavigateToLogin?: () => void;
};

const credentialStepFields: Array<keyof RegistrationFormValues> = ["email", "senha"];
const patientStepFields: Array<keyof RegistrationFormValues> = [
  "pacienteCpf",
  "pacienteNomeCompleto",
  "pacienteDataNascimento",
  "pacienteTipoTransplante",
  "pacienteDataTransplante",
];
const caregiverOnlyFields: Array<keyof RegistrationFormValues> = [
  "cuidadorNomeCompleto",
  "cuidadorTelefone",
  "cuidadorRelacao",
];
const caregiverSubmitFields: Array<keyof RegistrationFormValues> = [
  "pacienteCpf",
  "pacienteNomeCompleto",
  ...caregiverOnlyFields,
];
const maskBrDateInput = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

const maskCpfInput = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export default function RegisterScreen({ onNavigateToLogin }: RegisterScreenProps) {
  const { width } = useWindowDimensions();
  const draft = useRegistrationStore((state) => state.draft);
  const currentStep = useRegistrationStore((state) => state.currentStep);
  const setCurrentStep = useRegistrationStore((state) => state.setCurrentStep);
  const updateDraft = useRegistrationStore((state) => state.updateDraft);

  const [transitionDirection, setTransitionDirection] =
    useState<TransitionDirection>("forward");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [registerStage, setRegisterStage] = useState<RegisterStage>("steps");
  const [isCaregiverModalVisible, setIsCaregiverModalVisible] = useState(false);
  const [isCaregiverLookupLoading, setIsCaregiverLookupLoading] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { isSubmitting },
    reset,
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: draft,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const stepLabels = useMemo(() => ["Credenciais", "Dados do paciente"], []);
  const containerWidth = useMemo(() => Math.min(width - 24, 540), [width]);

  useEffect(() => {
    const subscription = watch((values) => {
      updateDraft(values as Partial<RegistrationFormValues>);
    });

    return () => subscription.unsubscribe();
  }, [watch, updateDraft]);

  useEffect(() => {
    setValue("tipoUsuario", "PACIENTE", {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [setValue]);

  const nextStep = async () => {
    const isStepOneValid = await trigger(credentialStepFields, {
      shouldFocus: true,
    });

    if (!isStepOneValid) {
      return;
    }

    setFeedbackState("idle");
    setTransitionDirection("forward");
    setCurrentStep(1);
  };

  const previousStep = () => {
    setFeedbackState("idle");
    setTransitionDirection("backward");
    setCurrentStep(0);
  };

  const onSubmit = async (values: RegistrationFormValues) => {
    const userType: UserType = values.tipoUsuario === "CUIDADOR" ? "CUIDADOR" : "PACIENTE";
    const payload = buildRegisterPayload(values, userType);

    try {
      await registerUser(payload);
      setFeedbackState("success");
      setFeedbackMessage("Cadastro finalizado com sucesso.");
      reset();
      setTimeout(() => {
        if (onNavigateToLogin) {
          onNavigateToLogin();
        }
      }, 1500);
    } catch (error) {
      setFeedbackState("error");
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel finalizar o cadastro no momento. Tente novamente."
      );
    }
  };

  const submitRegistration = async () => {
    await handleSubmit(onSubmit)();
  };

  const finalizeRegistration = async () => {
    const isStepTwoValid = await trigger(patientStepFields, {
      shouldFocus: true,
    });

    if (!isStepTwoValid) {
      return;
    }

    setIsCaregiverModalVisible(true);
  };

  const submitWithoutCaregiver = async () => {
    setIsCaregiverModalVisible(false);
    setFeedbackState("idle");
    setValue("tipoUsuario", "PACIENTE", {
      shouldDirty: true,
      shouldValidate: false,
    });

    await submitRegistration();
  };

  const showCaregiverForm = () => {
    setIsCaregiverModalVisible(false);
    setFeedbackState("idle");
    setValue("tipoUsuario", "CUIDADOR", {
      shouldDirty: true,
      shouldValidate: false,
    });
    setRegisterStage("caregiver");
  };

  const finalizeCaregiverRegistration = async () => {
    const isCaregiverValid = await trigger(caregiverSubmitFields, {
      shouldFocus: true,
    });

    if (!isCaregiverValid) {
      return;
    }

    await submitRegistration();
  };

  const renderPatientFields = () => (
    <View style={styles.formGroup}>
      <FormInput
        control={control}
        name="pacienteCpf"
        label="CPF"
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        maxLength={14}
        valueFormatter={maskCpfInput}
      />
      <FormInput
        control={control}
        name="pacienteNomeCompleto"
        label="Nome completo"
        placeholder="Ex: Maria Silva"
        autoCapitalize="words"
      />
      <FormInput
        control={control}
        name="pacienteDataNascimento"
        label="Data de nascimento"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        maxLength={10}
        valueFormatter={maskBrDateInput}
      />
      <FormInput
        control={control}
        name="pacienteTipoTransplante"
        label="Tipo de transplante"
        placeholder="Ex: Rim"
        autoCapitalize="words"
      />
      <FormInput
        control={control}
        name="pacienteDataTransplante"
        label="Data do transplante"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        maxLength={10}
        valueFormatter={maskBrDateInput}
      />
    </View>
  );

  const renderCaregiverFields = () => (
    <CaregiverFormFields
      control={control}
      watch={watch}
      setValue={setValue}
      isSubmitting={isSubmitting}
      onLookupLoadingChange={setIsCaregiverLookupLoading}
    />
  );

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <View style={styles.formGroup}>
          <FormInput
            control={control}
            name="email"
            label="E-mail"
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormInput
            control={control}
            name="senha"
            label="Senha"
            placeholder="Crie uma senha segura"
            isPassword
            autoCapitalize="none"
          />
        </View>
      );
    }

    return renderPatientFields();
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
            <Text style={styles.pageTitle}>Cadastro</Text>
            <Text style={styles.pageDescription}>
              Fluxo guiado de registro do paciente.
            </Text>

            {registerStage === "steps" ? (
              <>
                <ProgressIndicator
                  currentStep={currentStep}
                  totalSteps={2}
                  labels={stepLabels}
                />

                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>
                    {currentStep === 0
                      ? "Etapa 1 - Credenciais"
                      : "Etapa 2 - Dados do paciente"}
                  </Text>
                </View>

                <Animated.View
                  key={`steps-${currentStep}`}
                  entering={
                    transitionDirection === "forward"
                      ? SlideInRight.duration(260)
                      : SlideInLeft.duration(260)
                  }
                  exiting={
                    transitionDirection === "forward"
                      ? SlideOutLeft.duration(220)
                      : SlideOutRight.duration(220)
                  }
                  style={styles.stepContainer}
                >
                  {renderStepContent()}
                </Animated.View>
              </>
            ) : (
              <Animated.View
                key="caregiver-form"
                entering={FadeInDown.duration(240)}
                style={styles.stepContainer}
              >
                <View style={styles.caregiverHeader}>
                  {onNavigateToLogin ? (
                    <Pressable
                      onPress={onNavigateToLogin}
                      style={styles.chevronAction}
                      disabled={isSubmitting}
                    >
                      <ChevronLeft size={20} color="#35506B" />
                    </Pressable>
                  ) : (
                    <View style={styles.chevronSpacer} />
                  )}
                  <Text style={styles.stepTitle}>Dados do cuidador</Text>
                </View>

                <Text style={styles.caregiverDescription}>
                  Preencha os dados para adicionar um cuidador ao paciente.
                </Text>

                {renderCaregiverFields()}
              </Animated.View>
            )}

            {feedbackState !== "idle" ? (
              <View
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
              </View>
            ) : null}

            {registerStage === "steps" ? (
              <View style={styles.navigationRow}>
                {currentStep === 0 ? (
                  <View style={styles.ghostButton} />
                ) : (
                  <Pressable
                    onPress={previousStep}
                    style={[styles.actionButton, styles.secondaryButton]}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.actionText, styles.secondaryButtonText]}>Voltar</Text>
                  </Pressable>
                )}

                {currentStep === 0 ? (
                  <Pressable
                    onPress={nextStep}
                    style={[styles.actionButton, styles.primaryButton]}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.actionText, styles.primaryButtonText]}>Próximo</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={finalizeRegistration}
                    style={[styles.actionButton, styles.primaryButton]}
                    disabled={isSubmitting || feedbackState === "success"}
                  >
                    <Text style={[styles.actionText, styles.primaryButtonText]}>
                      {isSubmitting ? "Finalizando..." : "Finalizar"}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.singleActionRow}>
                <Pressable
                  onPress={finalizeCaregiverRegistration}
                  style={[styles.actionButton, styles.primaryButton]}
                  disabled={
                    isSubmitting || isCaregiverLookupLoading || feedbackState === "success"
                  }
                >
                  <Text style={[styles.actionText, styles.primaryButtonText]}>
                    {isSubmitting ? "Finalizando..." : "Finalizar cadastro"}
                  </Text>
                </Pressable>
              </View>
            )}

            {onNavigateToLogin && registerStage === "steps" ? (
              <Pressable
                onPress={onNavigateToLogin}
                style={styles.switchAuthAction}
                disabled={isSubmitting || feedbackState === "success"}
              >
                <Text style={styles.switchAuthText}>Já possui conta? Entrar</Text>
              </Pressable>
            ) : null}

            <Modal
              visible={isCaregiverModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setIsCaregiverModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Deseja adicionar um cuidador?</Text>
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={showCaregiverForm}
                      style={[styles.modalButton, styles.primaryButton]}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.actionText, styles.primaryButtonText]}>Sim</Text>
                    </Pressable>
                    <Pressable
                      onPress={submitWithoutCaregiver}
                      style={[styles.modalButton, styles.secondaryButton]}
                      disabled={isSubmitting}
                    >
                      <Text style={[styles.actionText, styles.secondaryButtonText]}>Não</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
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
  stepHeader: {
    paddingVertical: 4,
  },
  stepTitle: {
    color: "#12314C",
    fontSize: 16,
    fontWeight: "700",
  },
  stepContainer: {
    gap: 14,
  },
  formGroup: {
    gap: 14,
  },
  caregiverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chevronAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#B7C6D7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FBFE",
  },
  chevronSpacer: {
    width: 34,
    height: 34,
  },
  caregiverDescription: {
    color: "#48627A",
    fontSize: 13,
    lineHeight: 18,
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
  navigationRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 10,
  },
  singleActionRow: {
    marginTop: 4,
  },
  ghostButton: {
    flex: 1,
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#2C7BE5",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#B7C6D7",
    backgroundColor: "#F9FBFE",
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#35506B",
  },
  switchAuthAction: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  switchAuthText: {
    color: "#2C7BE5",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 34, 51, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: "#FDFEFF",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    padding: 18,
    gap: 16,
  },
  modalTitle: {
    color: "#12314C",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

