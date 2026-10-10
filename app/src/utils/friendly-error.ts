/**
 * Erro com mensagem pronta para a tela. Os services lancam `FriendlyError` quando o texto serve
 * para o paciente; qualquer outro erro (resposta malformada, configuracao) e tecnico e vira o
 * texto generico de `toFriendlyMessage`.
 */
export class FriendlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FriendlyError";
  }
}

export const ERROR_MESSAGES = {
  network: "Sem conexão com a internet. Confira a sua rede e tente de novo.",
  session: "Sua sessão expirou. Saia e entre de novo no aplicativo.",
  server: "Tivemos um problema do nosso lado. Tente de novo em alguns minutos.",
  generic: "Algo deu errado. Tente de novo.",
} as const;

/** Texto para mostrar ao usuario: so `FriendlyError` passa como veio, o resto vira `fallback`. */
export const toFriendlyMessage = (
  error: unknown,
  fallback: string = ERROR_MESSAGES.generic
): string => (error instanceof FriendlyError ? error.message : fallback);
