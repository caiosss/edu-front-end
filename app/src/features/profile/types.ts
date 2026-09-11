/**
 * `PacienteResponseDTO`. O progresso e derivado de `xpTotal` no backend: `nivel`,
 * `xpNoNivel` e `xpParaProximo` sao calculados, nunca lidos de coluna mutavel.
 */
export type PatientProfileResponse = {
  id: string;
  dataTransplante: string;
  moedas: number;
  nivel: number;
  nomeCompleto: string;
  tipoTransplante: string;
  xpTotal: number;
  xpNoNivel: number;
  xpParaProximo: number;
  nomeCuidadores: string[];
};

export type CaregiverProfileResponse = {
  id: string;
  nomeCompleto: string;
  relacao: string;
  telefone: string;
  nomePacientes: string[];
};
