import { StyleSheet, Text, View } from "react-native";

export default function StoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loja</Text>
      <Text style={styles.subtitle}>Aqui voce pode listar produtos, kits e beneficios.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#12314C",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#48627A",
  },
});

