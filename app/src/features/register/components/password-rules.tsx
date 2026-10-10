import { StyleSheet, Text, View } from "react-native";
import { Circle, CircleCheck } from "lucide-react-native";

/** As mesmas regras de `registrationSchema.senha`, mostradas enquanto a pessoa digita. */
const PASSWORD_RULES = [
  { label: "Pelo menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Uma letra maiúscula (A a Z)", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Uma letra minúscula (a a z)", test: (value: string) => /[a-z]/.test(value) },
  { label: "Um número (0 a 9)", test: (value: string) => /[0-9]/.test(value) },
];

type PasswordRulesProps = {
  value: string;
};

export function PasswordRules({ value }: PasswordRulesProps) {
  return (
    <View style={styles.container} accessibilityLabel="Regras da senha">
      <Text style={styles.title}>A senha precisa ter:</Text>
      {PASSWORD_RULES.map((rule) => {
        const isMet = rule.test(value);
        const Icon = isMet ? CircleCheck : Circle;

        return (
          <View
            key={rule.label}
            style={styles.row}
            accessible
            accessibilityLabel={`${rule.label}: ${isMet ? "feito" : "falta"}`}
          >
            <Icon size={22} color={isMet ? "#1F6B38" : "#7A8DA3"} />
            <Text style={[styles.label, isMet ? styles.labelMet : null]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#F4F8FC",
    padding: 12,
  },
  title: {
    color: "#12314C",
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#3E5468",
    fontSize: 16,
    lineHeight: 22,
  },
  labelMet: {
    color: "#1F6B38",
    fontWeight: "600",
  },
});
