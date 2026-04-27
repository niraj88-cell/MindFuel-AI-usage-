import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSignIn } from '../../lib/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../theme';
import { identifyUser, trackEvent } from '../../lib/mixpanel';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error } = useSignIn();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Details Required', 'Please enter your email and password');
      return;
    }

    const { error, data } = await signIn(email, password);
    if (error) {
      Alert.alert('Access Denied', error);
    } else if (data?.user) {
      identifyUser(data.user.id, { $email: data.user.email });
      trackEvent('User Logged In');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Premium Logo Section */}
            <View className="items-center mb-16">
              <View className="w-24 h-24 bg-indigo-600/10 rounded-[32px] items-center justify-center mb-6 border border-indigo-500/30">
                <Sparkles size={48} color={Theme.colors.primaryLight} />
              </View>
              <Text className="text-white text-4xl font-black tracking-tight">MindFuel</Text>
              <Text className="text-slate-400 text-sm mt-2 font-medium">Upgrade your mental metabolism</Text>
            </View>

            {/* Premium Form UI */}
            <View className="space-y-6">
              <View>
                <View className="flex-row items-center space-x-2 mb-3 ml-1">
                  <Mail size={14} color={Theme.colors.primaryLight} />
                  <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Email Address</Text>
                </View>
                <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4 focus:border-indigo-500">
                  <TextInput
                    className="text-white font-medium"
                    placeholder="you@example.com"
                    placeholderTextColor="#64748b"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center space-x-2 mb-3 ml-1">
                  <Lock size={14} color={Theme.colors.primaryLight} />
                  <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Password</Text>
                </View>
                <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4 focus:border-indigo-500">
                  <TextInput
                    className="text-white font-medium"
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {error && (
                <View className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                  <Text className="text-rose-400 text-xs text-center font-bold">{error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                className="w-full bg-indigo-600 h-16 rounded-[24px] items-center justify-center shadow-xl shadow-indigo-600/40 mt-4"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center space-x-3">
                    <LogIn size={20} color="white" />
                    <Text className="text-white font-bold text-lg">Enter Dashboard</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="mt-12 items-center">
              <Text className="text-slate-500 font-medium">
                New explorer?{' '}
                <Link href="/(auth)/signup" className="text-indigo-400 font-black">
                  Join MindFuel
                </Link>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
