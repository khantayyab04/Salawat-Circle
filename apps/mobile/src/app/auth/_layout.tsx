import { Stack } from "expo-router/stack";

export const unstable_settings = { initialRouteName: "email" };
export default function AuthLayout() {
  return <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }} />;
}
