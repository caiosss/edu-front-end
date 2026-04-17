import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
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
import Animated, {
  FadeInDown,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { DateInput } from "../features/register/components/date-input";
import { FormInput } from "../features/register/components/form-input";
import { ProgressIndicator } from "../features/register/components/progress-indicator";
import { UserTypeSelect } from "../features/register/components/user-type-select";
import { buildRegisterPayload } from "../features/register/payload";
import { useRegistrationStore } from "../features/register/store/use-registration-store";
import type { RegistrationFormValues, UserType } from "../features/register/types";
import { parseISOToDate } from "../features/register/utils/date";
import {
  getStepTitles,
  getStepTwoFields,
  isUserType,
  registrationSchema,
  stepOneFields,
} from "../features/register/validation";
import { registerUser } from "../services/registration-service";

type TransitionDirection = "forward" | "backward";
type FeedbackState = "idle" | "success" | "error";

const today = new Date();

export default function RegisterScreen() {
  const { width } = useWindowDimensions();
  const draft = useRegistrationStore((state) => state.draft);
  const currentStep = useRegistrationStore((state) => state.currentStep);
  const setCurrentStep = useRegistrationStore((state) => state.setCurrentStep);
  const updateDraft = useRegistrationStore((state) => state.updateDraft);

  const [transitionDirection, setTransitionDirection] =
    useState<TransitionDirection>("forward");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: draft,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const userTypeValue = watch("tipoUsuario");
  const userType: UserType | "" = isUserType(userTypeValue) ? userTypeValue : "";
  const patientBirthDate = watch("pacienteDataNascimento");
  const birthDateAsDate = parseISOToDate(patientBirthDate);
  const [, secondStepTitle] = getStepTitles(userType);
  const stepLabels = useMemo(() => ["Credenciais", secondStepTitle], [secondStepTitle]);
  const containerWidth = useMemo(() => Math.min(width - 24, 540), [width]);

  useEffect(() => {
    const subscription = watch((values) => {
      updateDraft(values as Partial<RegistrationFormValues>);
    });

    return () => subscription.unsubscribe();
  }, [watch, updateDraft]);

  const nextStep = async () => {
    const isStepOneValid = await trigger(stepOneFields, {
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
    if (!isUserType(values.tipoUsuario)) {
      setFeedbackState("error");
      setFeedbackMessage("Selecione um tipo de usuario para continuar.");
      return;
    }

    const payload = buildRegisterPayload(values, values.tipoUsuario);

    try {
      await registerUser(payload);
      setFeedbackState("success");
      setFeedbackMessage("Cadastro validado com sucesso. Integracao com API pronta.");
    } catch {
      setFeedbackState("error");
      setFeedbackMessage(
        "Nao foi possivel finalizar o cadastro no momento. Tente novamente."
      );
    }
  };

  const finalizeRegistration = async () => {
    if (!isUserType(userTypeValue)) {
      const isTypeValid = await trigger(["tipoUsuario"], { shouldFocus: true });
      if (!isTypeValid) {
        return;
      }
    }

    const fieldsToValidate = getStepTwoFields(userType);
    const isStepTwoValid =
      fieldsToValidate.length === 0
        ? true
        : await trigger(fieldsToValidate, {
            shouldFocus: true,
          });

    if (!isStepTwoValid) {
      return;
    }

    await handleSubmit(onSubmit)();
  };

  const renderPatientFields = () => (
    <View style={styles.formGroup}>
      <FormInput
        control={control}
        name="pacienteNomeCompleto"
        label="Nome completo"
        placeholder="Ex: Maria Silva"
        autoCapitalize="words"
      />
      <DateInput
        control={control}
        name="pacienteDataNascimento"
        label="Data de nascimento"
        placeholder="Selecione a data"
        maximumDate={today}
      />
      <FormInput
        control={control}
        name="pacienteTipoTransplante"
        label="Tipo de transplante"
        placeholder="Ex: Rim"
        autoCapitalize="words"
      />
      <DateInput
        control={control}
        name="pacienteDataTransplante"
        label="Data do transplante"
        placeholder="Selecione a data"
        minimumDate={birthDateAsDate ?? undefined}
        maximumDate={today}
      />
    </View>
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
          <UserTypeSelect control={control} />
        </View>
      );
    }

    if (userType === "PACIENTE") {
      return renderPatientFields();
    }

    if (userType === "CUIDADOR") {
      return (
        <View style={styles.formGroup}>
          <Text style={styles.sectionTitle}>Paciente vinculado</Text>
          {renderPatientFields()}
          <Text style={styles.sectionTitle}>Dados do cuidador</Text>
          <View style={styles.formGroup}>
            <FormInput
              control={control}
              name="cuidadorNomeCompleto"
              label="Nome completo"
              placeholder="Ex: Joao Pereira"
              autoCapitalize="words"
            />
            <FormInput
              control={control}
              name="cuidadorTelefone"
              label="Telefone"
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
              maxLength={15}
            />
            <FormInput
              control={control}
              name="cuidadorRelacao"
              label="Relação com o paciente"
              placeholder="Ex: Pai, Mãe, Conjuge"
              autoCapitalize="words"
            />
          </View>
        </View>
      );
    }
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
              Fluxo guiado de registro para pacientes e cuidadores.
            </Text>

            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={2}
              labels={stepLabels}
            />

            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>
                {currentStep === 0 ? "Etapa 1" : "Etapa 2"} -{" "}
                {currentStep === 0 ? "Credenciais e tipo de usuario" : secondStepTitle}
              </Text>
            </View>

            <Animated.View
              key={`${currentStep}-${userType}`}
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
                  <Text style={[styles.actionText, styles.primaryButtonText]}>Proximo</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={finalizeRegistration}
                  style={[styles.actionButton, styles.primaryButton]}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.actionText, styles.primaryButtonText]}>
                    {isSubmitting ? "Finalizando..." : "Finalizar"}
                  </Text>
                </Pressable>
              )}
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
  sectionTitle: {
    marginTop: 2,
    color: "#1A4F8B",
    fontSize: 14,
    fontWeight: "700",
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
});
