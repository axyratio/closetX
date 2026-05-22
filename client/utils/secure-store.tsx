// utils/secure-store.tsx
import * as SecureStore from 'expo-secure-store';

// ============= TOKEN =============
export async function saveToken(token: string) {
  await SecureStore.setItemAsync('access-token', token);
}

export async function getToken() {
  const token = await SecureStore.getItemAsync('access-token');
  return token;
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync('access-token');
  console.log("token deleted");
}

// ============= ROLE =============
export async function saveRole(role: string) {
  await SecureStore.setItemAsync("user-role", role);
  console.log("Role saved:", role);
}

export async function getRole() {
  const role = await SecureStore.getItemAsync("user-role");
  return role;
}

export async function deleteRole() {
  await SecureStore.deleteItemAsync("user-role");
  console.log("Role deleted");
}

// ============= USER ID =============
export async function saveUserId(userId: string) {
  await SecureStore.setItemAsync("user-id", userId);
  console.log("User ID saved:", userId);
}

export async function getUserId() {
  const userId = await SecureStore.getItemAsync("user-id");
  return userId;
}

export async function deleteUserId() {
  await SecureStore.deleteItemAsync("user-id");
  console.log("User ID deleted");
}

// ============= STORE ID (ใหม่) =============
export async function saveStoreId(storeId: string) {
  await SecureStore.setItemAsync("store-id", storeId);
  console.log("✅ Store ID saved:", storeId);
}

export async function getStoreId() {
  const storeId = await SecureStore.getItemAsync("store-id");
  return storeId;
}

export async function deleteStoreId() {
  await SecureStore.deleteItemAsync("store-id");
  console.log("🗑️ Store ID deleted");
}