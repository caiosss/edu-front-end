import { z } from "zod";
import { isBeforeDate, isDateInFuture, parseISOToDate } from "./utils/date";
import { USER_TYPES, type RegistrationFormValues, type UserType } from "./types";

const requiredFieldMessage = "Campo obrigatorio.";
const validDateMessage = "Selecione uma data valida.";
const validUserTypeMessage = "Selecione um tipo de usuario valido.";
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

  if (!parseISOToDate(value)) {
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
      message: `${label} nao pode ser no futuro.`,
    });
    return false;
  }

  return true;
};

export const registrationSchema = z
  .object({
    email: z.string().trim().email("Informe um e-mail valido."),
    senha: z
      .string()
      .min(8, "A senha deve ter no minimo 8 caracteres.")
      .regex(/[A-Z]/, "A senha precisa de ao menos 1 letra maiuscula.")
      .regex(/[a-z]/, "A senha precisa de ao menos 1 letra minuscula.")
      .regex(/[0-9]/, "A senha precisa de ao menos 1 numero."),
    tipoUsuario: z.string(),
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
          message: "A data do transplante deve ser posterior a data de nascimento.",
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
            message: "Informe um telefone valido com DDD.",
          });
        }
      }
    }
  });

export type RegistrationSchema = z.infer<typeof registrationSchema>;

export type RegistrationFieldName = keyof RegistrationFormValues;

export const stepOneFields: RegistrationFieldName[] = ["email", "senha", "tipoUsuario"];

export const patientStepFields: RegistrationFieldName[] = [
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
    return ["Credenciais", "Dados do Paciente"];
  }

  if (userType === "CUIDADOR") {
    return ["Credenciais", "Dados do Cuidador"];
  }

  return ["Credenciais", "Confirmacao"];
};
