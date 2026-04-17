export type UserType = "PACIENTE" | "CUIDADOR" ;

export const USER_TYPES: UserType[] = ["PACIENTE", "CUIDADOR"];

export type RegistrationFormValues = {
  email: string;
  senha: string;
  tipoUsuario: string;
  pacienteNomeCompleto: string;
  pacienteDataNascimento: string;
  pacienteTipoTransplante: string;
  pacienteDataTransplante: string;
  cuidadorNomeCompleto: string;
  cuidadorTelefone: string;
  cuidadorRelacao: string;
};

export const registrationDefaultValues: RegistrationFormValues = {
  email: "",
  senha: "",
  tipoUsuario: "",
  pacienteNomeCompleto: "",
  pacienteDataNascimento: "",
  pacienteTipoTransplante: "",
  pacienteDataTransplante: "",
  cuidadorNomeCompleto: "",
  cuidadorTelefone: "",
  cuidadorRelacao: "",
};

export type PatientPayload = {
  fullName: string;
  birthDate: string;
  transplantType: string;
  transplantDate: string;
};

export type CaregiverPayload = {
  fullName: string;
  phone: string;
  relationship: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  userType: UserType;
  patient?: PatientPayload;
  caregiver?: CaregiverPayload;
};
