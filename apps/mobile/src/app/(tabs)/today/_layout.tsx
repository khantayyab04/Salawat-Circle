import { Stack } from "expo-router/stack";

export const unstable_settings = { initialRouteName: "index" };

export default function TodayLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
