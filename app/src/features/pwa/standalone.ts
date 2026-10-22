import { Platform } from "react-native";

/**
 * Aberto pelo icone da Tela de Inicio (ou instalado pelo Chrome), e nao numa aba do navegador?
 * No iPhone so assim ha push: o Safari nao deixa uma aba comum pedir permissao de notificacao.
 */
export const isStandalone = (): boolean => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return true;
  }
  const navegador = window.navigator as Navigator & { standalone?: boolean };
  return (
    navegador.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
};

export const isIos = (): boolean => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return Platform.OS === "ios";
  }
  const navegador = window.navigator;
  return (
    /iPhone|iPad|iPod/.test(navegador.userAgent) ||
    (navegador.platform === "MacIntel" && navegador.maxTouchPoints > 1)
  );
};
