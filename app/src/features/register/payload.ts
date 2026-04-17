import type { RegisterPayload, RegistrationFormValues, UserType } from "./types";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const buildRegisterPayload = (
  values: RegistrationFormValues,
  userType: UserType
): RegisterPayload => {
  const payload: RegisterPayload = {
    email: normalizeEmail(values.email),
    password: values.senha,
    userType,
  };

  if (userType === "PACIENTE" || userType === "CUIDADOR") {
    payload.patient = {
      fullName: values.pacienteNomeCompleto.trim(),
      birthDate: values.pacienteDataNascimento,
      transplantType: values.pacienteTipoTransplante.trim(),
      transplantDate: values.pacienteDataTransplante,
    };
  }

  if (userType === "CUIDADOR") {
    payload.caregiver = {
      fullName: values.cuidadorNomeCompleto.trim(),
      phone: values.cuidadorTelefone.replace(/\D/g, ""),
      relationship: values.cuidadorRelacao.trim(),
    };
  }

  return payload;
};
