export type GeneralMissionResponse = {
  id: string;
  missaoId: string;
  nome: string;
  descricao: string;
  categoria: string;
  observacao: string;
  dataInicio: string;
  ativa: boolean;
};

export type MedicationMissionResponse = {
  id: string;
  userId: string;
  nomePaciente: string;
  nomeMedicamento: string;
  tipoMedicamento: string;
  dosagem: string;
  frequenciaHoras: number;
  horarioPrimeiraDose: string;
  ativo: boolean;
};

export type MyMissionsResponse = {
  missoesGerais: GeneralMissionResponse[];
  missoesMedicamento: MedicationMissionResponse[];
};
