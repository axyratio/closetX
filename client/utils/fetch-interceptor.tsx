// utils/fetch-interceptor.tsx
import { deleteToken, getToken, deleteRole, deleteUserId, deleteStoreId } from '@/utils/secure-store';
import { router } from 'expo-router';
import { jwtDecode } from 'jwt-decode';

// 🌐 Global variables
export let globalUserId: string | null = null;
export let globalStoreId: string | null = null; // ✅ เพิ่ม global store ID
let globalTokenExp: number | null = null;

interface DecodedToken {
  exp: number;
  sub: string;
  [key: string]: any;
}

/**
 * เช็ค token และ set global user_id
 * @returns true ถ้า token valid, false ถ้าหมดอายุหรือไม่มี
 */
export async function validateToken(): Promise<boolean> {
  // ⚡ เช็คจากแรมก่อนเพื่อความรวดเร็ว
  const currentTime = Date.now() / 1000;
  if (globalUserId && globalTokenExp && currentTime < globalTokenExp) {
    return true;
  }

  const token = await getToken();

  if (!token) {
    globalUserId = null;
    globalStoreId = null;
    globalTokenExp = null;
    return false;
  }

  try {
    console.log('[TOKEN] Decoding token...', token);
    const decoded = jwtDecode<DecodedToken>(token);
    console.log('[TOKEN] Decoded payload =', decoded);

    // เช็คว่าหมดอายุหรือยัง
    console.log('[TOKEN] exp =', decoded.exp, 'now =', Date.now() / 1000);
    if (Date.now() >= decoded.exp * 1000) {
      console.log('🚨 Token expired, logging out...');
      await clearAllData();
      
      // Redirect ไปหน้า login
      router.replace('/(auth)/login');
      return false;
    }

    // Set global user_id
    globalUserId = decoded.sub;
    globalTokenExp = decoded.exp;
    console.log('[TOKEN] set user_id =', globalUserId);
    return true;
  } catch (error) {
    console.error('❌ Token decode error:', error);
    await clearAllData();
    router.replace('/(auth)/login');
    return false;
  }
}

/**
 * ✅ ฟังก์ชันสำหรับ set global store ID
 * @param storeId - Store ID ที่ต้องการเก็บ
 */
export function setGlobalStoreId(storeId: string | null) {
  globalStoreId = storeId;
  console.log('[STORE] Global store ID set:', storeId);
}

/**
 * ✅ ฟังก์ชันสำหรับดึง global store ID
 * @returns Store ID ที่เก็บไว้ใน memory
 */
export function getGlobalStoreId(): string | null {
  return globalStoreId;
}

/**
 * Custom fetch ที่มี interceptor เช็ค token อัตโนมัติ
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  console.log('[AUTH FETCH] URL = ', url);
  
  // 🔒 เช็ค token ก่อนยิง request
  const isValid = await validateToken();

  if (!isValid) {
    throw new Error('Token expired or invalid. Redirected to login.');
  }

  // ดึง token ใหม่ (เผื่อ refresh)
  const token = await getToken();

  // เพิ่ม Authorization header
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: token ? `Bearer ${token}` : '',
  };

  // ยิง request
  const response = await fetch(url, { ...options, headers });

  // 🔴 ถ้า backend ตอบ 401 (Unauthorized) = token invalid
  if (response.status === 401) {
    console.log('🚨 401 Unauthorized, logging out...');
    await clearAllData();
    router.replace('/(auth)/login');
    throw new Error('Unauthorized. Token may be invalid.');
  }

  return response;
}

/**
 * เรียกใช้ในที่ที่ต้องการ user_id โดยไม่ต้องแกะ token ซ้ำ
 */
export function getCurrentUserId(): string | null {
  return globalUserId;
}

/**
 * ✅ ฟังก์ชันสำหรับล้างข้อมูลทั้งหมด (SecureStore + Global Variables)
 */
async function clearAllData() {
  console.log('[CLEAR] Clearing all data...');
  
  // ลบข้อมูลจาก SecureStore
  await deleteToken();
  await deleteRole();
  await deleteUserId();
  await deleteStoreId(); // ✅ ลบ store ID ด้วย
  
  // ล้างข้อมูลในแรม
  globalUserId = null;
  globalStoreId = null; // ✅ ล้าง global store ID
  globalTokenExp = null;
  
  console.log('[CLEAR] All data cleared');
}

/**
 * ฟังก์ชันสำหรับออกจากระบบ และล้างข้อมูลทั้งหมด
 */
export async function logout() {
  console.log('[LOGOUT] Logging out...');
  
  // ล้างข้อมูลทั้งหมด
  await clearAllData();
  
  // ดีดกลับไปหน้า Login
  router.replace('/(auth)/login');
}