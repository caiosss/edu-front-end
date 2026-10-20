import { useCallback, useEffect, useState } from "react";
import { fetchTermoUsoVigente, type TermoUso } from "../../../services/terms-service";

/**
 * Aceite dos Termos de Uso numa tela de criacao de conta (cadastro e convite do cuidador).
 *
 * Busca a versao vigente ao abrir a tela: o backend so grava o aceite citando a versao lida, e
 * a pessoa pode marcar a caixa sem abrir o texto.
 */
export function useTermsAcceptance() {
  const [aceito, setAceito] = useState(false);
  const [versao, setVersao] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const aoCarregar = useCallback((termo: TermoUso) => setVersao(termo.versao), []);

  useEffect(() => {
    fetchTermoUsoVigente()
      .then(aoCarregar)
      .catch(() => undefined);
  }, [aoCarregar]);

  /** A versao a enviar com o cadastro. Tenta de novo se a primeira leitura falhou. */
  const versaoParaEnviar = useCallback(async (): Promise<number> => {
    if (versao !== null) {
      return versao;
    }
    const termo = await fetchTermoUsoVigente();
    setVersao(termo.versao);
    return termo.versao;
  }, [versao]);

  return {
    aceito,
    alternar: () => setAceito((atual) => !atual),
    isModalVisible,
    abrirTermos: () => setIsModalVisible(true),
    fecharTermos: () => setIsModalVisible(false),
    aoCarregar,
    versaoParaEnviar,
  };
}
