import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  Control,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { fetchPatientNameByCpf } from "../../../services/auth-service";
import type { RegistrationFormValues } from "../types";
import { FormInput } from "./form-input";

type FeedbackState = "idle" | "success" | "error";

type CaregiverFormFieldsProps = {
  control: Control<RegistrationFormValues>;
  watch: UseFormWatch<RegistrationFormValues>;
  setValue: UseFormSetValue<RegistrationFormValues>;
  isSubmitting?: boolean;
  onLookupLoadingChange?: (isLoading: boolean) => void;
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

const normalizeCpfInput = (input: string): string => input.replace(/\D/g, "");

export function CaregiverFormFields({
  control,
  watch,
  setValue,
  isSubmitting = false,
  onLookupLoadingChange,
}: CaregiverFormFieldsProps) {
  const [isCpfLookupLoading, setIsCpfLookupLoading] = useState(false);
  const [cpfLookupState, setCpfLookupState] = useState<FeedbackState>("idle");
  const [cpfLookupMessage, setCpfLookupMessage] = useState("");

  const watchedPatientCpf = watch("pacienteCpf");
  const watchedPatientName = watch("pacienteNomeCompleto");
  const isPatientNameFilled = watchedPatientName.trim().length > 0;

  useEffect(() => {
    setCpfLookupState("idle");
    setCpfLookupMessage("");
  }, [watchedPatientCpf]);

  useEffect(() => {
    onLookupLoadingChange?.(isCpfLookupLoading);
  }, [isCpfLookupLoading, onLookupLoadingChange]);

  const lookupPatientByCpf = async () => {
    const normalizedCpf = normalizeCpfInput(watchedPatientCpf);

    if (normalizedCpf.length !== 11) {
      setCpfLookupState("error");
      setCpfLookupMessage("Informe um CPF valido com 11 digitos.");
      return;
    }

    setCpfLookupState("idle");
    setCpfLookupMessage("");
    setIsCpfLookupLoading(true);

    try {
      const patientName = await fetchPatientNameByCpf(normalizedCpf);
      setValue("pacienteNomeCompleto", patientName, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setCpfLookupState("success");
      setCpfLookupMessage("Nome do paciente preenchido automaticamente.");
    } catch (error) {
      setCpfLookupState("error");
      setCpfLookupMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar o paciente pelo CPF."
      );
    } finally {
      setIsCpfLookupLoading(false);
    }
  };

  return (
    <View style={styles.formGroup}>
      <FormInput
        control={control}
        name="pacienteCpf"
        label="CPF do paciente"
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        maxLength={14}
        valueFormatter={maskCpfInput}
      />

      <Pressable
        onPress={lookupPatientByCpf}
        style={[
          styles.lookupButton,
          isCpfLookupLoading || isPatientNameFilled ? styles.lookupButtonDisabled : undefined,
        ]}
        disabled={isCpfLookupLoading || isSubmitting || isPatientNameFilled}
      >
        {isCpfLookupLoading ? (
          <View style={styles.lookupButtonContent}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.lookupButtonText}>Buscando paciente...</Text>
          </View>
        ) : (
          <Text style={styles.lookupButtonText}>Buscar paciente por CPF</Text>
        )}
      </Pressable>

      {cpfLookupState !== "idle" ? (
        <View
          style={[
            styles.feedbackBox,
            cpfLookupState === "success"
              ? styles.feedbackSuccess
              : styles.feedbackError,
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              cpfLookupState === "success"
                ? styles.feedbackTextSuccess
                : styles.feedbackTextError,
            ]}
          >
            {cpfLookupMessage}
          </Text>
        </View>
      ) : null}

      <FormInput
        control={control}
        name="pacienteNomeCompleto"
        label="Nome do paciente"
        placeholder="Nome preenchido automaticamente"
        autoCapitalize="words"
      />
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
        label="Relacao com o paciente"
        placeholder="Ex: Pai, Mae, Conjuge"
        autoCapitalize="words"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    gap: 14,
  },
  lookupButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#2C7BE5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  lookupButtonDisabled: {
    backgroundColor: "#7EA8DE",
  },
  lookupButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lookupButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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
});
