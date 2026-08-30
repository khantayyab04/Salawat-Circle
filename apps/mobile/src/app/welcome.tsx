import { WelcomeScreen } from "@/screens/auth";
import { Stack } from "expo-router/stack";
export default function WelcomeRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WelcomeScreen />
    </>
  );
}
