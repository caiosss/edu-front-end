import { StyleSheet, View } from "react-native";
import { AppText } from "../../../components/ui";
import { colors, radius, spacing } from "../../../theme";

type Bloco =
  | { tipo: "titulo"; texto: string }
  | { tipo: "item"; texto: string }
  | { tipo: "paragrafo"; texto: string; destaque: boolean };

/** "5. Consentimento para dados de saude": a secao que a LGPD pede em destaque. */
const SECAO_DESTACADA = /dados de sa[uú]de/i;

/**
 * Le o texto do termo como vem do backend: paragrafos separados por linha em branco, secoes
 * numeradas ("3. Quais dados usamos") e itens com "•". Sem marcacao propria: o mesmo texto
 * fica legivel no portal e no banco.
 */
const separarBlocos = (corpo: string): Bloco[] => {
  let destacando = false;

  return corpo
    .trim()
    .split(/\n\s*\n/)
    .map((trecho) => trecho.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((texto): Bloco => {
      if (/^\d+\.\s/.test(texto) && texto.length <= 80) {
        destacando = SECAO_DESTACADA.test(texto);
        return { tipo: "titulo", texto };
      }
      if (texto.startsWith("•")) {
        return { tipo: "item", texto: texto.replace(/^•\s*/, "") };
      }
      return { tipo: "paragrafo", texto, destaque: destacando };
    });
};

export function TermsDocument({ corpo }: { corpo: string }) {
  return (
    <View style={styles.documento}>
      {separarBlocos(corpo).map((bloco, index) => {
        if (bloco.tipo === "titulo") {
          return (
            <AppText key={index} variant="heading" accessibilityRole="header" style={styles.titulo}>
              {bloco.texto}
            </AppText>
          );
        }

        if (bloco.tipo === "item") {
          return (
            <View key={index} style={styles.item}>
              <AppText color="primary" style={styles.marcador}>
                •
              </AppText>
              <AppText variant="small" style={styles.itemTexto}>
                {bloco.texto}
              </AppText>
            </View>
          );
        }

        return (
          <AppText
            key={index}
            variant="small"
            style={bloco.destaque ? styles.destaque : null}
          >
            {bloco.texto}
          </AppText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  documento: {
    gap: spacing.md,
  },
  titulo: {
    marginTop: spacing.sm,
  },
  item: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  marcador: {
    lineHeight: 22,
  },
  itemTexto: {
    flex: 1,
  },
  destaque: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    fontWeight: "600",
    overflow: "hidden",
  },
});
