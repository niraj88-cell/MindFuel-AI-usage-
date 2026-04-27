import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks/useAuth';
import { format } from 'date-fns';
import { trackEvent } from '../../lib/mixpanel';
import { canLogToday } from '../../lib/services/subscription';
import { Theme } from '../../theme';
import { 
  Zap, 
  Brain, 
  Flame, 
  Trophy, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react-native';
import { QuickLogSheet } from '../../components/QuickLogSheet';

const { width } = Dimensions.get('window');

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ percentage, size = 180, strokeWidth = 14 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Theme.colors.primaryLight} />
            <Stop offset="100%" stopColor={Theme.colors.secondary} />
          </LinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Theme.colors.card}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 40, fontWeight: '900', color: Theme.colors.text }}>
          {Math.round(percentage)}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginTop: -4 }}>
          SCORE
        </Text>
      </View>
    </View>
  );
}

function CategoryIcon({ category, size = 16 }: { category: string; size?: number }) {
  const colorMap: Record<string, string> = {
    educational: Theme.colors.educational,
    productive: Theme.colors.productive,
    creative: Theme.colors.creative,
    social: Theme.colors.social,
    entertainment: Theme.colors.entertainment,
    doomscroll: Theme.colors.doomscroll,
    neutral: Theme.colors.neutral,
  };
  const color = colorMap[category] || Theme.colors.neutral;
  return <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: color }} />;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    trackEvent('Dashboard Viewed');
  }, []);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showQuickLog, setShowQuickLog] = React.useState(false);

  const { data: recentLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['mental_logs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mental_logs')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: todaySummary, refetch: refetchSummary } = useQuery({
    queryKey: ['daily_summary', user?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, daily_log_limit')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: limitInfo } = useQuery({
    queryKey: ['daily_limit', user?.id],
    queryFn: async () => {
      if (!user) return { allowed: false, remaining: 0 };
      return await canLogToday(user.id);
    },
    enabled: !!user,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLogs(), refetchSummary()]);
    setRefreshing(false);
  };

  const avgScore = todaySummary?.average_score || (recentLogs?.reduce((acc, log) => acc + log.mental_score, 0) ?? 0) / (recentLogs?.length || 1);
  const safeAvgScore = isNaN(avgScore) ? 0 : avgScore;
  const streakDays = todaySummary?.streak_days || 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Premium Header */}
      <View className="px-6 pt-12 pb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-slate-400 text-sm font-medium uppercase tracking-widest">Welcome Back</Text>
            <Text className="text-white text-3xl font-bold mt-1">
              {user?.user_metadata?.full_name?.split(' ')[0] || 'Explorer'}! 🚀
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500/30">
            <Image source={{ uri: `https://ui-avatars.com/api/?name=${user?.email}&background=6366f1&color=fff` }} className="w-full h-full" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Score Section */}
      <View className="mx-6 bg-slate-800/50 rounded-[40px] p-8 border border-white/5 items-center relative overflow-hidden">
        {/* Background Accent */}
        <View className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <Text className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Current Mental Nutrition</Text>
        
        <ProgressRing percentage={safeAvgScore} />
        
        <View className="mt-8 flex-row justify-between w-full px-4">
          <View className="items-center">
            <View className="flex-row items-center space-x-1 mb-1">
              <Flame size={14} color={Theme.colors.warning} fill={Theme.colors.warning} />
              <Text className="text-white text-lg font-bold">{streakDays}</Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">STREAK</Text>
          </View>
          
          <View className="items-center">
            <View className="flex-row items-center space-x-1 mb-1">
              <Zap size={14} color={Theme.colors.primaryLight} fill={Theme.colors.primaryLight} />
              <Text className="text-white text-lg font-bold">{todaySummary?.total_logs || 0}</Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">LOGS</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/subscription')} className="items-center">
            <View className="flex-row items-center space-x-1 mb-1">
              <Trophy size={14} color={Theme.colors.creative} fill={Theme.colors.creative} />
              <Text className="text-white text-lg font-bold">{profile?.subscription_tier === 'premium' ? 'MAX' : limitInfo?.remaining}</Text>
            </View>
            <Text className="text-slate-400 text-[10px] font-bold uppercase">LIMIT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Action Button - Integrated into Design */}
      <TouchableOpacity
        onPress={() => setShowQuickLog(true)}
        className="mx-6 mt-6 bg-indigo-600 h-16 rounded-2xl flex-row items-center justify-center space-x-3 shadow-xl shadow-indigo-600/40"
      >
        <Plus size={24} color="white" strokeWidth={3} />
        <Text className="text-white text-lg font-bold">Quick Log Meal</Text>
      </TouchableOpacity>

      <QuickLogSheet 
        visible={showQuickLog} 
        onClose={() => setShowQuickLog(false)} 
        onSuccess={() => {
          refetchLogs();
          refetchSummary();
        }} 
      />

      {/* Category Grid Section */}
      <View className="px-6 mt-10">
        <View className="flex-row justify-between items-end mb-6">
          <View>
            <Text className="text-white text-xl font-bold">Insights</Text>
            <Text className="text-slate-400 text-sm mt-1">Today's consumption mix</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/reports')} className="flex-row items-center space-x-1">
            <Text className="text-indigo-400 font-bold text-sm">Full Report</Text>
            <ChevronRight size={16} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {['educational', 'productive', 'creative', 'social', 'entertainment', 'doomscroll'].map((cat) => {
            const breakdown = todaySummary?.category_breakdown as Record<string, number> | null;
            const count = breakdown?.[cat] || 0;
            return (
              <View key={cat} style={{ width: (width - 64) / 2 }} className="bg-slate-800/40 border border-white/5 p-4 rounded-3xl mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <CategoryIcon category={cat} />
                  <Text className="text-white font-bold">{count}</Text>
                </View>
                <Text className="text-slate-300 text-xs font-bold capitalize">{cat}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Feed - Premium List UI */}
      <View className="px-6 mt-6 mb-12">
        <Text className="text-white text-xl font-bold mb-6">Recent Feed</Text>
        {recentLogs && recentLogs.length > 0 ? (
          recentLogs.map((log) => (
            <TouchableOpacity key={log.id} className="bg-slate-800/40 border border-white/5 p-5 rounded-3xl mb-4 flex-row items-center space-x-4">
              <View className="w-12 h-12 bg-slate-700/50 rounded-2xl items-center justify-center border border-white/5">
                <Brain size={24} color={Theme.colors.primaryLight} />
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between">
                  <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{log.category}</Text>
                  <Text className="text-slate-500 text-[10px]">{format(new Date(log.created_at), 'h:mm a')}</Text>
                </View>
                <Text className="text-white font-bold mt-1" numberOfLines={1}>{log.content}</Text>
              </View>
              <View className="items-center">
                <Text className={`font-black text-lg ${log.mental_score >= 70 ? 'text-emerald-400' : log.mental_score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {log.mental_score}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="bg-slate-800/20 border-2 border-dashed border-slate-700 rounded-3xl p-10 items-center justify-center">
             <AlertCircle size={40} color={Theme.colors.textMuted} />
             <Text className="text-slate-400 font-bold mt-4">Your log is empty</Text>
             <Text className="text-slate-500 text-xs mt-1">Start feeding your brain! 🧠</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
