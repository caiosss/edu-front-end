import type { RegisterPayload, RegistrationFormValues, UserType } from "./types";
import { normalizeDateToISO } from "./utils/date";

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

export const buildRegisterPayload = (
  values: RegistrationFormValues,
  userType: UserType
): RegisterPayload => {
  const payload: RegisterPayload = {
    email: normalizeEmail(values.email),
    senha: values.senha,
    tipoUsuario: userType,
    nomeCompleto: userType === "PACIENTE" ? values.pacienteNomeCompleto : values.cuidadorNomeCompleto,
    dataNascimento:
      userType === "PACIENTE"
        ? normalizeDateToISO(values.pacienteDataNascimento)
        : normalizeDateToISO("1900-01-01"),
    tipoTransplante:
      userType === "PACIENTE" ? values.pacienteTipoTransplante : "",
    dataTransplante:
      userType === "PACIENTE"
        ? normalizeDateToISO(values.pacienteDataTransplante)
        : normalizeDateToISO("1900-01-01"),
    telefone: userType === "CUIDADOR" ? values.cuidadorTelefone : "",
    relacao: userType === "CUIDADOR" ? values.cuidadorRelacao : "",
    pacienteCpf: userType === "CUIDADOR" ? normalizeCpf(values.pacienteCpf) : "",
  };

  if (userType === "PACIENTE") {
    payload.cpf = normalizeCpf(values.pacienteCpf);
  }

  return payload;
};
