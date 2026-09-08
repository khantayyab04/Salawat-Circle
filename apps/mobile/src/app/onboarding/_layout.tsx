import { Stack } from "expo-router/stack";

export const unstable_settings = { initialRouteName: "profile" };
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }} />;
}
