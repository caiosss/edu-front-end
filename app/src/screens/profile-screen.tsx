import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function ProfileScreen() {
  const { nome, email, clearToken } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      {nome ? <Text style={styles.info}>Nome: {nome}</Text> : null}
      {email ? <Text style={styles.info}>E-mail: {email}</Text> : null}

      <Pressable onPress={clearToken} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
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
  info: {
    fontSize: 14,
    color: "#35506B",
  },
  logoutButton: {
    marginTop: 12,
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

