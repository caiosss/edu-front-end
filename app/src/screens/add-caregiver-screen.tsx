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
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useForm } from "react-hook-form";
import { CaregiverFormFields } from "../features/register/components/caregiver-form-fields";
import { FormInput } from "../features/register/components/form-input";
import { buildRegisterPayload } from "../features/register/payload";
import { useRegistrationStore } from "../features/register/store/use-registration-store";
import type { RegistrationFormValues, UserType } from "../features/register/types";
import { registerUser } from "../services/registration-service";

type FeedbackState = "idle" | "success" | "error";

const caregiverFormFields: Array<keyof RegistrationFormValues> = [
  "email",
  "pacienteCpf",
  "pacienteNomeCompleto",
  "cuidadorNomeCompleto",
  "cuidadorTelefone",
  "cuidadorRelacao",
];

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

type AddCaregiverScreenProps = {
  onNavigateBack: () => void;
};

export default function AddCaregiverScreen({ onNavigateBack }: AddCaregiverScreenProps) {
  const { width } = useWindowDimensions();
  const draft = useRegistrationStore((state) => state.draft);
  const updateDraft = useRegistrationStore((state) => state.updateDraft);
  const [isCaregiverLookupLoading, setIsCaregiverLookupLoading] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    setError,
    clearErrors,
    formState: { isSubmitting },
  } =
    useForm<RegistrationFormValues>({
      defaultValues: draft,
      mode: "onChange",
      reValidateMode: "onChange",
    });

  const containerWidth = useMemo(() => Math.min(width - 24, 540), [width]);

  useEffect(() => {
    const subscription = watch((values) => {
      updateDraft(values as Partial<RegistrationFormValues>);
    });

    return () => subscription.unsubscribe();
  }, [watch, updateDraft]);

  useEffect(() => {
    setValue("tipoUsuario", "CUIDADOR", {
      shouldDirty: false,
      shouldValidate: false,
    });
    setValue("senha", "", {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [setValue]);

  const validateCaregiverForm = (values: RegistrationFormValues): boolean => {
    let isValid = true;

    clearErrors(caregiverFormFields);

    const cpfDigits = values.pacienteCpf.replace(/\D/g, "");
    if (!values.email.trim()) {
      setError("email", {
        type: "manual",
        message: "Campo obrigatorio.",
      });
      isValid = false;
    } else if (!isValidEmail(values.email)) {
      setError("email", {
        type: "manual",
        message: "Informe um e-mail valido.",
      });
      isValid = false;
    }

    if (cpfDigits.length !== 11) {
      setError("pacienteCpf", {
        type: "manual",
        message: "Informe um CPF valido com 11 digitos.",
      });
      isValid = false;
    }

    if (!values.pacienteNomeCompleto.trim()) {
      setError("pacienteNomeCompleto", {
        type: "manual",
        message: "Campo obrigatorio.",
      });
      isValid = false;
    }

    if (!values.cuidadorNomeCompleto.trim()) {
      setError("cuidadorNomeCompleto", {
        type: "manual",
        message: "Campo obrigatorio.",
      });
      isValid = false;
    }

    if (!values.cuidadorRelacao.trim()) {
      setError("cuidadorRelacao", {
        type: "manual",
        message: "Campo obrigatorio.",
      });
      isValid = false;
    }

    const phoneDigits = values.cuidadorTelefone.replace(/\D/g, "");
    if (!values.cuidadorTelefone.trim()) {
      setError("cuidadorTelefone", {
        type: "manual",
        message: "Campo obrigatorio.",
      });
      isValid = false;
    } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("cuidadorTelefone", {
        type: "manual",
        message: "Informe um telefone valido com DDD.",
      });
      isValid = false;
    }

    return isValid;
  };

  const submitCaregiver = async (values: RegistrationFormValues) => {
    setFeedbackState("idle");
    setFeedbackMessage("");

    if (!validateCaregiverForm(values)) {
      return;
    }

    const userType: UserType = "CUIDADOR";
    const payload = buildRegisterPayload(
      {
        ...values,
        tipoUsuario: userType,
        senha: "",
      },
      userType
    );

    try {
      await registerUser(payload);

      setFeedbackState("success");
      setFeedbackMessage(
        "Cuidador cadastrado com sucesso. A senha sera gerada e enviada para o e-mail informado."
      );

      setValue("email", "", { shouldDirty: false, shouldValidate: false });
      setValue("cuidadorNomeCompleto", "", { shouldDirty: false, shouldValidate: false });
      setValue("cuidadorTelefone", "", { shouldDirty: false, shouldValidate: false });
      setValue("cuidadorRelacao", "", { shouldDirty: false, shouldValidate: false });
    } catch (error) {
      setFeedbackState("error");
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cadastrar o cuidador no momento."
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
            entering={FadeInDown.duration(260)}
            style={[styles.card, { width: containerWidth }]}
          >
            <View style={styles.headerRow}>
              <Pressable
                onPress={onNavigateBack}
                style={styles.chevronAction}
                disabled={isSubmitting}
              >
                <ChevronLeft size={20} color="#35506B" />
              </Pressable>
              <Text style={styles.pageTitle}>Adicionar cuidador</Text>
              <View style={styles.chevronSpacer} />
            </View>

            <Text style={styles.pageDescription}>
              Preencha os dados para vincular um cuidador ao paciente.
            </Text>

            <FormInput
              control={control}
              name="email"
              label="E-mail do cuidador"
              placeholder="cuidador@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <CaregiverFormFields
              control={control}
              watch={watch}
              setValue={setValue}
              isSubmitting={isSubmitting}
              onLookupLoadingChange={setIsCaregiverLookupLoading}
            />

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

            <Pressable
              onPress={() => void handleSubmit(submitCaregiver)()}
              style={[styles.saveButton, isSubmitting ? styles.saveButtonLoading : undefined]}
              disabled={isSubmitting || isCaregiverLookupLoading}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? "Salvando..." : "Salvar cuidador"}
              </Text>
            </Pressable>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  pageTitle: {
    color: "#12314C",
    fontSize: 21,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  pageDescription: {
    color: "#48627A",
    fontSize: 14,
    lineHeight: 20,
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
  saveButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#2C7BE5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  saveButtonLoading: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
