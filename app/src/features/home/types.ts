/** `PlanoMissaoItemResponseDTO` */
export type PlanoMissaoItemResponse = {
  id: string;
  missaoId: string;
  nomeMissao: string;
  descricaoMissao: string;
  categoria: string;
  concluida: boolean;
};

/** `PlanoMissaoResponseDTO` */
export type PlanoMissaoResponse = {
  id: string;
  nome: string;
  observacao: string;
  dataInicio: string;
  ativa: boolean;
  concluido: boolean;
  itens: PlanoMissaoItemResponse[];
};

/** `PrescricaoItemResponseDTO` */
export type PrescricaoItemResponse = {
  id: string;
  medicamentoId: string;
  nomeMedicamento: string;
  tipoMedicamento: string;
  dosagem: string;
  frequenciaHoras: number;
  horarioPrimeiraDose: string;
  concluido: boolean;
};

/** `PrescricaoResponseDTO` */
export type PrescricaoResponse = {
  id: string;
  pacienteId: string;
  nomePaciente: string;
  dataCriacao: string;
  ativo: boolean;
  concluido: boolean;
  itens: PrescricaoItemResponse[];
};

/**
 * Item de plano de missoes achatado para a Home. `id` e o id do **item do plano**
 * (`planoMissaoItemId`), unico por paciente.
 */
export type GeneralMissionResponse = {
  id: string;
  missaoId: string;
  planoId: string;
  planoNome: string;
  nome: string;
  descricao: string;
  categoria: string;
  observacao: string;
  dataInicio: string;
  ativa: boolean;
  concluida: boolean;
};

/**
 * Item de prescricao achatado para a Home. `id` e o id do **item da prescricao**
 * (`prescricaoItemId`). `concluida` significa "a dose prevista agora ja foi registrada".
 */
export type MedicationMissionResponse = {
  id: string;
  prescricaoId: string;
  pacienteId: string;
  nomePaciente: string;
  nomeMedicamento: string;
  tipoMedicamento: string;
  dosagem: string;
  frequenciaHoras: number;
  horarioPrimeiraDose: string;
  ativo: boolean;
  concluida: boolean;
};

export type MyMissionsResponse = {
  missoesGerais: GeneralMissionResponse[];
  missoesMedicamento: MedicationMissionResponse[];
};

/** Corpo de `POST /missoes/concluir`, sem o `pacienteId` (resolvido pelo service). */
export type CompleteMissionPayload = {
  planoMissaoItemId?: string;
  prescricaoItemId?: string;
};
