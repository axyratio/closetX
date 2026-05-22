
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="me" />
      <Stack.Screen name="password" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="order-detail" />
    </Stack>
  );
}