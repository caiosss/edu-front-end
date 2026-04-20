import { StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";

export default function HomeScreen() {
  const { nome, email, clearToken } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Area autenticada</Text>
        <Text style={styles.subtitle}>Voce entrou com sucesso.</Text>

        {nome ? <Text style={styles.info}>Nome: {nome}</Text> : null}
        {email ? <Text style={styles.info}>E-mail: {email}</Text> : null}

        <Pressable onPress={clearToken} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EAF2FA",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#12314C",
  },
  subtitle: {
    fontSize: 14,
    color: "#48627A",
  },
  info: {
    fontSize: 14,
    color: "#35506B",
  },
  logoutButton: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7BE5",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

