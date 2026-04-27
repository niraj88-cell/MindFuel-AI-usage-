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
import { useSignUp } from '../../lib/hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../../theme';
import { User, Mail, Lock, UserPlus, Sparkles, ArrowRight, ArrowLeft, Calendar, Target } from 'lucide-react-native';

const GOALS = [
  'Reduce Screen Time',
  'Improve Focus',
  'Better Mood',
  'Mindful Consumption',
];

export default function SignUpScreen() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState('');
  
  const { signUp, isLoading, error } = useSignUp();
  const router = useRouter();

  const handleNext = () => {
    if (step === 1) {
      if (!fullName || !email) {
        Alert.alert('Details Missing', 'Please fill in your name and email.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!password || !confirmPassword) {
        Alert.alert('Details Missing', 'Please create and confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Your passwords do not match. Please try again.');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Security Tip', 'Password must be at least 8 characters long for your safety.');
        return;
      }
      setStep(3);
    }
  };

  const handleSignUp = async () => {
    if (!age || !goal) {
      Alert.alert('Details Missing', 'Please provide your age and main goal to start your journey.');
      return;
    }

    const { error } = await signUp(email, password, fullName, age, goal);
    if (error) {
      Alert.alert('Registration Failed', error);
    } else {
      Alert.alert(
        'Check Your Inbox 📧',
        'We sent a confirmation link to your email. Please verify it to activate your account.',
        [{ text: 'Got it', onPress: () => router.replace('/(auth)/login') }]
      );
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
            {/* Header */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-indigo-600/10 rounded-[24px] items-center justify-center mb-6 border border-indigo-500/30">
                <Sparkles size={40} color={Theme.colors.primaryLight} />
              </View>
              <Text className="text-white text-3xl font-black">Join MindFuel</Text>
              <Text className="text-slate-400 text-sm mt-2 font-medium">Step {step} of 3</Text>
            </View>

            {/* Form Steps */}
            <View className="space-y-6">
              {step === 1 && (
                <View className="space-y-6 animate-fade-in">
                  <View>
                    <View className="flex-row items-center space-x-2 mb-3 ml-1">
                      <User size={14} color={Theme.colors.primaryLight} />
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Full Name</Text>
                    </View>
                    <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4">
                      <TextInput
                        className="text-white font-medium"
                        placeholder="Enter your name"
                        placeholderTextColor="#64748b"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center space-x-2 mb-3 ml-1">
                      <Mail size={14} color={Theme.colors.primaryLight} />
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Email Address</Text>
                    </View>
                    <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4">
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
                </View>
              )}

              {step === 2 && (
                <View className="space-y-6 animate-fade-in">
                  <View>
                    <View className="flex-row items-center space-x-2 mb-3 ml-1">
                      <Lock size={14} color={Theme.colors.primaryLight} />
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Create Password</Text>
                    </View>
                    <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4">
                      <TextInput
                        className="text-white font-medium"
                        placeholder="At least 8 characters"
                        placeholderTextColor="#64748b"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center space-x-2 mb-3 ml-1">
                      <Lock size={14} color={Theme.colors.primaryLight} />
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Confirm Password</Text>
                    </View>
                    <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4">
                      <TextInput
                        className="text-white font-medium"
                        placeholder="Repeat password"
                        placeholderTextColor="#64748b"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </View>
              )}

              {step === 3 && (
                <View className="space-y-6 animate-fade-in">
                  <View>
                    <View className="flex-row items-center space-x-2 mb-3 ml-1">
                      <Calendar size={14} color={Theme.colors.primaryLight} />
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Age</Text>
                    </View>
                    <View className="bg-slate-800/40 border border-white/5 rounded-2xl px-4 py-4">
                      <TextInput
                        className="text-white font-medium"
                        placeholder="e.g. 24"
                        placeholderTextColor="#64748b"
                        value={age}
                        onChangeText={setAge}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center space-x-2 mb-3 ml-1">
                      <Target size={14} color={Theme.colors.primaryLight} />
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Primary Goal</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {GOALS.map((g) => (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setGoal(g)}
                          className={`px-4 py-3 rounded-xl border ${
                            goal === g 
                              ? 'bg-indigo-600 border-indigo-500' 
                              : 'bg-slate-800/40 border-white/5'
                          }`}
                        >
                          <Text className={`font-bold ${goal === g ? 'text-white' : 'text-slate-400'}`}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {error && (
                <View className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                  <Text className="text-rose-400 text-xs text-center font-bold">{error}</Text>
                </View>
              )}

              {/* Navigation Buttons */}
              <View className="flex-row gap-4 mt-4">
                {step > 1 && (
                  <TouchableOpacity
                    onPress={() => setStep(step - 1)}
                    className="w-16 h-16 bg-slate-800/80 border border-white/5 rounded-[24px] items-center justify-center"
                  >
                    <ArrowLeft size={20} color="white" />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  onPress={step < 3 ? handleNext : handleSignUp}
                  disabled={isLoading}
                  className={`flex-1 bg-indigo-600 h-16 rounded-[24px] items-center justify-center shadow-xl shadow-indigo-600/40`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View className="flex-row items-center space-x-3">
                      {step < 3 ? (
                        <>
                          <Text className="text-white font-bold text-lg">Continue</Text>
                          <ArrowRight size={20} color="white" />
                        </>
                      ) : (
                        <>
                          <UserPlus size={20} color="white" />
                          <Text className="text-white font-bold text-lg">Create Account</Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            {step === 1 && (
              <View className="mt-12 items-center">
                <Text className="text-slate-500 font-medium">
                  Already have an account?{' '}
                  <Link href="/(auth)/login" className="text-indigo-400 font-black">
                    Sign In
                  </Link>
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
