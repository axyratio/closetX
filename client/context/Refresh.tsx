import { deleteToken, getRole, getToken } from "@/utils/secure-store";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ProfileContextType = {
  refresh: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  isAuth: boolean;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [refresh, setRefresh] = useState(0);
  const [isAuth, setIsAuth] = useState(false);
  const router = useRouter();

  const checkToken = async () => {
    try {
      const token = await getToken();

      if (!token) {
        setIsAuth(false);
        return;
      }

      const decoded = jwtDecode<{ exp: number; user_role: string }>(token);

      if (Date.now() >= decoded.exp * 1000) {
        await deleteToken();
        setIsAuth(false);
        router.replace("/(auth)/login");
        return;
      }

      setIsAuth(true);
      console.log("user role:", await getRole());
    } catch (err) {
      console.log("Token check error:", err);
      setIsAuth(false);
    }
  };

  // ❗ checkToken เฉพาะ refresh เท่านั้น (ไม่ผูก pathname)
  useEffect(() => {
    checkToken();
  }, [refresh]);

  // ❗ value ต้อง wrap ด้วย useMemo เพื่อไม่สร้าง object ใหม่ทุก render
  const value = useMemo(() => {
    return {
      refresh,
      setRefresh,
      isAuth,
    };
  }, [refresh, isAuth]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfileContext = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfileContext must be used inside ProfileProvider");
  }
  return ctx;
};
