import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useSignOut } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Theme } from '../../theme';
import { 
  LogOut, 
  Settings, 
  Bell, 
  Share2, 
  Shield, 
  CreditCard, 
  Sparkles,
  HelpCircle,
  ChevronRight
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { signOut, isLoading: signingOut } = useSignOut();
  const router = useRouter();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Ready to disconnect for a while?', [
      { text: 'Stay Connected', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (loadingProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }} className="items-center justify-center">
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Theme.colors.background }} showsVerticalScrollIndicator={false}>
      {/* Premium Header */}
      <View className="items-center pt-20 pb-10">
        <View className="relative">
           <View className="w-28 h-28 rounded-full border-4 border-indigo-500/20 p-1">
              <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${user?.email}&background=6366f1&color=fff&size=200` }} 
                className="w-full h-full rounded-full" 
              />
           </View>
           {profile?.subscription_tier === 'premium' && (
             <View className="absolute bottom-0 right-0 bg-amber-500 w-8 h-8 rounded-full border-4 border-slate-900 items-center justify-center">
                <Sparkles size={12} color="white" fill="white" />
             </View>
           )}
        </View>
        <Text className="text-white text-2xl font-black mt-4">{user?.user_metadata?.full_name || 'Explorer'}</Text>
        <Text className="text-slate-500 text-sm mt-1">{user?.email}</Text>
        
        {profile?.subscription_tier === 'premium' ? (
          <View className="mt-4 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full">
            <Text className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Premium Member</Text>
          </View>
        ) : (
          <View className="mt-4 bg-slate-800/40 border border-white/5 px-4 py-1.5 rounded-full">
            <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Free Tier</Text>
          </View>
        )}
      </View>

      {/* Subscription Card */}
      {profile?.subscription_tier !== 'premium' && (
        <TouchableOpacity 
          onPress={() => router.push('/subscription')}
          className="mx-6 bg-indigo-600 rounded-[32px] p-6 shadow-2xl shadow-indigo-600/50 relative overflow-hidden mb-8"
        >
          <View className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
          <View className="flex-row items-center space-x-3 mb-2">
             <Sparkles size={18} color="white" />
             <Text className="text-white font-black text-lg">Go Platinum</Text>
          </View>
          <Text className="text-indigo-100 text-sm opacity-80 leading-5">Unlock unlimited logs, advanced focus heatmaps, and personalized AI coaching.</Text>
        </TouchableOpacity>
      )}

      {/* Menu Sections */}
      <View className="mx-6 bg-slate-800/40 border border-white/5 rounded-[32px] overflow-hidden mb-8">
        <MenuItem icon={Bell} label="Notifications" />
        <MenuItem icon={Shield} label="Privacy & Security" />
        <MenuItem icon={Share2} label="Export My Data" />
        <MenuItem icon={CreditCard} label="Billing & Plan" />
        <MenuItem icon={HelpCircle} label="Help & Support" last />
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        onPress={handleSignOut}
        className="mx-6 mb-12 flex-row items-center justify-center space-x-2 bg-rose-500/10 border border-rose-500/20 py-5 rounded-[24px]"
      >
        <LogOut size={18} color={Theme.colors.danger} />
        <Text className="text-rose-500 font-black uppercase tracking-widest text-xs">Disconnect</Text>
      </TouchableOpacity>

      <Text className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-12">MindFuel v2.0 • Future Edition</Text>
    </ScrollView>
  );
}

function MenuItem({ icon: Icon, label, last }: { icon: any; label: string; last?: boolean }) {
  return (
    <TouchableOpacity className={`flex-row items-center justify-between px-6 py-5 ${!last ? 'border-b border-white/5' : ''}`}>
      <View className="flex-row items-center space-x-4">
        <View className="w-8 h-8 bg-slate-700/50 rounded-xl items-center justify-center border border-white/5">
          <Icon size={16} color={Theme.colors.textMuted} />
        </View>
        <Text className="text-slate-200 font-bold text-sm">{label}</Text>
      </View>
      <ChevronRight size={16} color={Theme.colors.surface} />
    </TouchableOpacity>
  );
}
