import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase/client';
import { Theme } from '../../theme';
import { 
  Sparkles, 
  Crown, 
  Check, 
  ChevronLeft, 
  Zap,
  BarChart3,
  Brain,
  Infinity as InfinityIcon,
  Download,
  Moon,
  Headphones
} from 'lucide-react-native';

export default function UpgradeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      initRevenueCat();
    } else {
      setLoading(false);
    }
  }, []);

  const initRevenueCat = async () => {
    try {
      const Purchases = (await import('react-native-purchases')).default;
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
      }) || '';
      if (!apiKey) {
        console.warn('RevenueCat API key not configured');
        setLoading(false);
        return;
      }
      await Purchases.setDebugLogsEnabled(true);
      await Purchases.configure({
        apiKey,
        appUserID: user?.id,
      });
      setLoading(false);
    } catch (error) {
      console.error('RevenueCat setup error:', error);
      setLoading(false);
    }
  };

  const handleSimulatePurchase = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      // Simulate premium activation for dev/web
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'premium' } as any)
        .eq('id', user.id);
      
      Alert.alert(
        'Premium Activated! 🎉',
        'Your subscription is now active. Enjoy unlimited access!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to activate premium. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const FEATURES = [
    { icon: InfinityIcon, text: 'Unlimited daily logs (free: 3/day)', highlight: true },
    { icon: Zap, text: 'Auto-tracking enabled' },
    { icon: BarChart3, text: 'Advanced weekly analytics & trends' },
    { icon: Brain, text: 'AI-powered insights & recommendations' },
    { icon: Sparkles, text: 'Streak tracking & gamification' },
    { icon: Download, text: 'Export data (CSV, PDF)' },
    { icon: Moon, text: 'Premium dark mode themes' },
    { icon: Headphones, text: 'Priority support' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-14 pb-6">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center space-x-2 mb-8">
            <ChevronLeft size={20} color={Theme.colors.primaryLight} />
            <Text className="text-indigo-400 font-bold">Back</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View className="items-center px-6 mb-10">
          <View className="w-24 h-24 bg-amber-500/10 rounded-[32px] items-center justify-center border border-amber-500/30 mb-6">
            <Crown size={48} color="#f59e0b" />
          </View>
          <Text className="text-white text-4xl font-black text-center tracking-tight">Go Premium</Text>
          <Text className="text-slate-400 text-center mt-3 leading-6">Unlock the full power of MindFuel and accelerate your mental nutrition journey.</Text>
        </View>

        {/* Features Card */}
        <View className="mx-6 bg-slate-800/40 border border-white/5 rounded-[32px] p-6 mb-8">
          <View className="flex-row items-center space-x-3 mb-6">
            <Sparkles size={18} color={Theme.colors.primaryLight} />
            <Text className="text-white font-black text-lg">Premium Features</Text>
          </View>
          
          {FEATURES.map((feature, idx) => (
            <View key={idx} className="flex-row items-center space-x-4 mb-5">
              <View className={`w-8 h-8 rounded-xl items-center justify-center ${feature.highlight ? 'bg-amber-500/20' : 'bg-slate-700/50'} border border-white/5`}>
                <feature.icon size={14} color={feature.highlight ? '#f59e0b' : Theme.colors.textMuted} />
              </View>
              <Text className="text-slate-200 font-medium flex-1">{feature.text}</Text>
              <Check size={16} color={Theme.colors.success} />
            </View>
          ))}
        </View>

        {/* Pricing Card */}
        <View className="mx-6 bg-indigo-600/10 border-2 border-indigo-500/30 rounded-[32px] p-8 mb-6 relative overflow-hidden">
          <View className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full" />
          <Text className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">Most Popular</Text>
          <View className="flex-row items-end space-x-2 mb-2">
            <Text className="text-white text-5xl font-black">$4.99</Text>
            <Text className="text-slate-400 font-bold pb-2">/month</Text>
          </View>
          <Text className="text-slate-400 text-sm mb-8">Cancel anytime. Billed monthly via App Store / Google Play.</Text>
          
          <TouchableOpacity
            onPress={handleSimulatePurchase}
            disabled={purchasing}
            className="bg-indigo-600 h-16 rounded-2xl items-center justify-center shadow-xl shadow-indigo-600/40"
          >
            {purchasing ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center space-x-3">
                <Zap size={20} color="white" fill="white" />
                <Text className="text-white font-black text-lg">Activate Premium</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Restore */}
        <TouchableOpacity
          onPress={() => Alert.alert('Restore', 'No active subscriptions found to restore.')}
          className="mx-6 mb-16 py-4 items-center"
        >
          <Text className="text-slate-500 font-bold text-sm">Restore Previous Purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
