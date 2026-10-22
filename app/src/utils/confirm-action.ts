import { Alert, Platform } from "react-native";

type ConfirmActionOptions = {
  title: string;
  message: string;
  /** Rotulo do botao que confirma ("Sair", "Remover"). */
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

/**
 * Pergunta "tem certeza?" antes de uma acao que nao tem volta.
 *
 * No celular e o Alert do sistema, com os rotulos proprios. No navegador o `Alert.alert` do
 * react-native-web nao mostra nada (o X de sair da rodada simplesmente nao respondia), entao
 * vai o `window.confirm`, com o OK e o Cancelar do Safari.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
}: ConfirmActionOptions) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: "cancel" },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
    ],
    { cancelable: true }
  );
}
