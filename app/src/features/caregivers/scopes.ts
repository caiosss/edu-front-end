import { SCOPES_REQUIRED_TO_ACT } from "./labels";
import type { EscopoCuidador } from "./types";

/**
 * O conjunto que vai para `PUT /vinculos/{id}/escopos` depois de ligar ou desligar um escopo.
 *
 * `AGIR_PELO_PACIENTE` so vale com `VER_MEDICACAO` e `VER_ADESAO` no mesmo conjunto (SPEC-014
 * §5.3): ligar "registrar por mim" liga os dois na tela, e desligar um deles desliga o registro.
 * Assim o paciente ve tudo o que concede, e o backend nao responde 422.
 */
export const nextScopes = (
  current: EscopoCuidador[],
  escopo: EscopoCuidador,
  enabled: boolean
): EscopoCuidador[] => {
  const scopes = new Set(current);

  if (enabled) {
    scopes.add(escopo);

    if (escopo === "AGIR_PELO_PACIENTE") {
      SCOPES_REQUIRED_TO_ACT.forEach((required) => scopes.add(required));
    }
  } else {
    scopes.delete(escopo);

    if (SCOPES_REQUIRED_TO_ACT.includes(escopo)) {
      scopes.delete("AGIR_PELO_PACIENTE");
    }
  }

  return Array.from(scopes);
};
