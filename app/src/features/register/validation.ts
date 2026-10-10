import { z } from "zod";
import { isBeforeDate, isDateInFuture, parseDateInputToDate } from "./utils/date";
import { USER_TYPES, type RegistrationFormValues, type UserType } from "./types";

const requiredFieldMessage = "Preencha este campo.";
const validDateMessage = "Informe uma data válida, no formato DD/MM/AAAA.";
const validUserTypeMessage = "Escolha se você é paciente ou cuidador.";
const userTypeSet = new Set<UserType>(USER_TYPES);

const hasValue = (value: string): boolean => value.trim().length > 0;

const addRequiredIssue = (
  context: z.RefinementCtx,
  path: keyof RegistrationFormValues,
  message: string = requiredFieldMessage
) => {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
};

const validateDateField = (
  context: z.RefinementCtx,
  path: keyof RegistrationFormValues,
  value: string,
  label: string
) => {
  if (!hasValue(value)) {
    addRequiredIssue(context, path);
    return false;
  }

  if (!parseDateInputToDate(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: validDateMessage,
    });
    return false;
  }

  if (isDateInFuture(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: `${label} não pode ser depois de hoje.`,
    });
    return false;
  }

  return true;
};

export const registrationSchema = z
  .object({
    email: z.string().trim().email("Informe um e-mail válido."),
    senha: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .regex(/[A-Z]/, "A senha precisa ter pelo menos 1 letra maiúscula.")
      .regex(/[a-z]/, "A senha precisa ter pelo menos 1 letra minúscula.")
      .regex(/[0-9]/, "A senha precisa ter pelo menos 1 número."),
    tipoUsuario: z.string(),
    pacienteCpf: z.string(),
    pacienteNomeCompleto: z.string(),
    pacienteDataNascimento: z.string(),
    pacienteTipoTransplante: z.string(),
    pacienteDataTransplante: z.string(),
    cuidadorNomeCompleto: z.string(),
    cuidadorTelefone: z.string(),
    cuidadorRelacao: z.string(),
  })
  .superRefine((values, context) => {
    const userType = values.tipoUsuario as UserType;

    if (!userTypeSet.has(userType)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoUsuario"],
        message: validUserTypeMessage,
      });
      return;
    }

    const needsPatientData = userType === "PACIENTE" || userType === "CUIDADOR";

    if (needsPatientData) {
      if (!hasValue(values.pacienteCpf)) {
        addRequiredIssue(context, "pacienteCpf");
      } else {
        const cpfDigits = values.pacienteCpf.replace(/\D/g, "");
        if (cpfDigits.length !== 11) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["pacienteCpf"],
            message: "Informe um CPF válido, com 11 dígitos.",
          });
        }
      }

      if (!hasValue(values.pacienteNomeCompleto)) {
        addRequiredIssue(context, "pacienteNomeCompleto");
      }

      if (!hasValue(values.pacienteTipoTransplante)) {
        addRequiredIssue(context, "pacienteTipoTransplante");
      }

      const isBirthDateValid = validateDateField(
        context,
        "pacienteDataNascimento",
        values.pacienteDataNascimento,
        "A data de nascimento"
      );
      const isTransplantDateValid = validateDateField(
        context,
        "pacienteDataTransplante",
        values.pacienteDataTransplante,
        "A data de transplante"
      );

      if (
        isBirthDateValid &&
        isTransplantDateValid &&
        isBeforeDate(values.pacienteDataTransplante, values.pacienteDataNascimento)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pacienteDataTransplante"],
          message: "A data do transplante precisa ser depois da data de nascimento.",
        });
      }
    }

    if (userType === "CUIDADOR") {
      if (!hasValue(values.cuidadorNomeCompleto)) {
        addRequiredIssue(context, "cuidadorNomeCompleto");
      }

      if (!hasValue(values.cuidadorRelacao)) {
        addRequiredIssue(context, "cuidadorRelacao");
      }

      if (!hasValue(values.cuidadorTelefone)) {
        addRequiredIssue(context, "cuidadorTelefone");
      } else {
        const phoneDigits = values.cuidadorTelefone.replace(/\D/g, "");
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cuidadorTelefone"],
            message: "Informe um telefone válido, com DDD.",
          });
        }
      }
    }
  });

export type RegistrationSchema = z.infer<typeof registrationSchema>;

export type RegistrationFieldName = keyof RegistrationFormValues;

export const stepOneFields: RegistrationFieldName[] = ["email", "senha", "tipoUsuario"];

export const patientStepFields: RegistrationFieldName[] = [
  "pacienteCpf",
  "pacienteNomeCompleto",
  "pacienteDataNascimento",
  "pacienteTipoTransplante",
  "pacienteDataTransplante",
];

export const caregiverStepFields: RegistrationFieldName[] = [
  ...patientStepFields,
  "cuidadorNomeCompleto",
  "cuidadorTelefone",
  "cuidadorRelacao",
];

export const getStepTwoFields = (userType: UserType | ""): RegistrationFieldName[] => {
  if (userType === "PACIENTE") {
    return patientStepFields;
  }

  if (userType === "CUIDADOR") {
    return caregiverStepFields;
  }

  return [];
};

export const isUserType = (value: string): value is UserType => {
  return userTypeSet.has(value as UserType);
};

export const getStepTitles = (userType: UserType | ""): [string, string] => {
  if (userType === "PACIENTE") {
    return ["Dados de acesso", "Dados do paciente"];
  }

  if (userType === "CUIDADOR") {
    return ["Dados de acesso", "Dados do cuidador"];
  }

  return ["Dados de acesso", "Confirmação"];
};
