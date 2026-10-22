import { useState } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { StatusBanner } from "../../components/ui";
import { isIos, isStandalone } from "./standalone";

type InstallHintProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * Na versao web aberta direto no navegador, ensina a colocar o EduCare na Tela de Inicio. E por
 * la que ele vira aplicativo no iPhone: abre em tela cheia, guarda a sessao e e o unico jeito de
 * receber lembretes. O login feito numa aba do Safari nao passa para o icone (o iPhone separa os
 * dados dos dois), por isso o aviso aparece ja na tela de entrar.
 */
export function InstallHint({ style }: InstallHintProps) {
  const [dismissed, setDismissed] = useState(false);

  if (Platform.OS !== "web" || dismissed || isStandalone()) {
    return null;
  }

  const message = isIos()
    ? 'Toque em Compartilhar (o quadrado com a seta para cima; se não aparecer, toque em "⋯" primeiro) e depois em "Adicionar à Tela de Início". Abra o EduCare pelo ícone novo e entre por lá.'
    : 'No menu do navegador, escolha "Adicionar à tela inicial" ou "Instalar app". Abra o EduCare pelo ícone novo e entre por lá.';

  return (
    <View style={style}>
      <StatusBanner
        tone="info"
        title="Use o EduCare como aplicativo"
        message={message}
        action={{ label: "Agora não", onPress: () => setDismissed(true) }}
      />
    </View>
  );
}
