import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../globals.css';

import { useAuth } from '../lib/hooks/useAuth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { initSubscription } from '../lib/services/subscription';

// Create a client outside component to prevent recreation on re-render
function RootLayoutNav() {
  const { session, user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (session && user) {
      initSubscription(user.id);
      
      // Request push notification permissions and schedule local reminders
      import('../lib/notifications').then(({ registerForPushNotificationsAsync, scheduleDailyReminders }) => {
        registerForPushNotificationsAsync().then(() => {
          scheduleDailyReminders();
        });
      });
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect to tabs if authenticated and trying to access auth screens
      router.replace('/(tabs)');
    }
  }, [session, user, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

import { ErrorBoundaryProps } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 bg-[#0b0f1a] items-center justify-center p-6">
      <View className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center mb-6">
        <AlertTriangle size={40} color="#f87171" />
      </View>
      <Text className="text-3xl font-black text-white mb-3 text-center">System Glitch</Text>
      <Text className="text-slate-400 text-center mb-8 leading-relaxed text-base">
        We encountered an unexpected error while rendering this screen. Our team has been notified.
      </Text>
      <TouchableOpacity 
        onPress={retry}
        className="h-12 px-8 rounded-full bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/20 flex-row"
      >
        <Text className="text-white font-bold text-base">Attempt Recovery</Text>
      </TouchableOpacity>
    </View>
  );
}
