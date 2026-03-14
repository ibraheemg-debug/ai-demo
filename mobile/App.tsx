import { StatusBar } from "expo-status-bar";
import HomeScreen from "./screens/HomeScreen";

export default function App() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#F8F9FC" />
      <HomeScreen />
    </>
  );
}
