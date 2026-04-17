import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RegisterScreen from "./app/src/screens/register-screen";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <RegisterScreen />
    </GestureHandlerRootView>
  );
}
