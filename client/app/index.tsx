// app/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getToken, getRole } from '@/utils/secure-store';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        const token = await getToken();
        
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }

        const role = await getRole();
        
        if (role === 'admin') {
          router.replace('/(admin)/admin-home');
        } else {
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error redirecting:', error);
        router.replace('/(auth)/login');
      }
    };

    redirect();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}