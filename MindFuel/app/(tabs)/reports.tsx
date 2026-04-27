import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks/useAuth';
import { format, subDays, startOfWeek } from 'date-fns';
import { trackEvent } from '../../lib/mixpanel';
import { Theme } from '../../theme';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Lightbulb,
  ChevronRight,
  Calendar
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

const categoryColors: Record<string, string> = {
  educational: Theme.colors.educational,
  productive: Theme.colors.productive,
  creative: Theme.colors.creative,
  social: Theme.colors.social,
  entertainment: Theme.colors.entertainment,
  doomscroll: Theme.colors.doomscroll,
  neutral: Theme.colors.neutral,
};

export default function ReportsScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = React.useState<'week' | 'month'>('week');

  useEffect(() => {
    trackEvent('Insights Viewed');
  }, []);

  const { data: weeklyReport, isLoading: reportLoading } = useQuery({
    queryKey: ['weekly_report', user?.id, selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', user!.id)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const wd = weeklyReport?.week_data as Record<string, any> | null;
  const totalLogs = wd?.total_logs || 0;
  const avgScore = wd?.avg_daily_score || 0;
  const categoryDist = wd?.category_distribution || {};
  const topCategory = wd?.top_category || 'None';
  const insights = wd?.insights || [];
  const recommendations = wd?.recommendations || [];
  const trend = wd?.trend || 'stable';

  const pieData = Object.entries(categoryDist).map(([category, value]) => ({
    value: value as number,
    color: categoryColors[category] || Theme.colors.neutral,
    text: category.charAt(0).toUpperCase(),
  }));

  if (reportLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }} className="items-center justify-center">
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Theme.colors.background }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-6 pt-12 pb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-white text-3xl font-bold">Insights</Text>
          <Text className="text-slate-400 mt-1">Deep dive into your patterns</Text>
        </View>
        <TouchableOpacity
          onPress={() => setSelectedPeriod(selectedPeriod === 'week' ? 'month' : 'week')}
          className="bg-indigo-600/20 border border-indigo-500/30 px-4 py-2 rounded-2xl flex-row items-center space-x-2"
        >
          <Calendar size={14} color={Theme.colors.primaryLight} />
          <Text className="text-indigo-400 font-bold text-xs uppercase tracking-widest">
            {selectedPeriod === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
          </Text>
        </TouchableOpacity>
      </View>

      {totalLogs === 0 ? (
        <View className="items-center justify-center py-20 px-10">
          <View className="w-20 h-20 bg-slate-800/40 rounded-[32px] items-center justify-center border border-white/5 mb-6">
            <BarChart3 size={40} color={Theme.colors.textMuted} />
          </View>
          <Text className="text-white font-bold text-xl mb-2 text-center">Harvesting Data...</Text>
          <Text className="text-slate-500 text-center leading-5">
            Log your mental meals for a few more days to generate your first premium insight report!
          </Text>
        </View>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <View className="px-6 flex-row flex-wrap justify-between">
            <View style={{ width: (screenWidth - 60) / 2 }} className="bg-slate-800/40 border border-white/5 p-6 rounded-[32px] mb-4">
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Logs</Text>
              <Text className="text-white text-3xl font-black">{totalLogs}</Text>
            </View>
            
            <View style={{ width: (screenWidth - 60) / 2 }} className="bg-slate-800/40 border border-white/5 p-6 rounded-[32px] mb-4">
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Avg Score</Text>
              <Text className={`text-3xl font-black ${
                avgScore >= 70 ? 'text-emerald-400' : avgScore >= 40 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {Math.round(avgScore)}
              </Text>
            </View>

            <View className="w-full bg-slate-800/40 border border-white/5 p-6 rounded-[32px] mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Overall Trend</Text>
                <Text className="text-white text-xl font-bold capitalize">{trend}</Text>
              </View>
              <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
                trend === 'improving' ? 'bg-emerald-500/20' : trend === 'declining' ? 'bg-rose-500/20' : 'bg-slate-700/50'
              }`}>
                {trend === 'improving' ? <TrendingUp color={Theme.colors.success} /> : 
                 trend === 'declining' ? <TrendingDown color={Theme.colors.danger} /> : 
                 <Minus color={Theme.colors.textMuted} />}
              </View>
            </View>
          </View>

          {/* Chart Section */}
          <View className="mx-6 bg-slate-800/40 border border-white/5 p-8 rounded-[40px] items-center mb-8">
            <Text className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-8">Composition Analysis</Text>
            <PieChart
              data={pieData}
              radius={screenWidth / 3.5}
              innerRadius={screenWidth / 6}
              innerCircleColor={Theme.colors.card}
              centerLabelComponent={() => (
                <View className="items-center justify-center">
                  <PieIcon size={24} color={Theme.colors.primaryLight} />
                </View>
              )}
            />
            <View className="flex-row flex-wrap justify-center mt-8 gap-4">
              {Object.entries(categoryDist as Record<string, number>).map(([category, value]) => (
                <View key={category} className="flex-row items-center space-x-2 bg-slate-700/30 px-3 py-2 rounded-full border border-white/5">
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[category] }} />
                  <Text className="text-slate-300 text-[10px] font-bold capitalize">{category}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* AI Insights Card */}
          {insights.length > 0 && (
            <View className="mx-6 bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[40px] mb-6">
              <View className="flex-row items-center space-x-3 mb-6">
                 <Sparkles size={20} color={Theme.colors.primaryLight} />
                 <Text className="text-white text-xl font-bold">AI Deep Scan</Text>
              </View>
              {insights.map((insight: string, idx: number) => (
                <View key={idx} className="flex-row items-start space-x-4 mb-4">
                  <View className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2" />
                  <Text className="text-slate-200 text-sm leading-6 flex-1">{insight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations Card */}
          {recommendations.length > 0 && (
            <View className="mx-6 bg-emerald-600/10 border border-emerald-500/20 p-8 rounded-[40px] mb-12">
              <View className="flex-row items-center space-x-3 mb-6">
                 <Lightbulb size={20} color={Theme.colors.success} />
                 <Text className="text-white text-xl font-bold">Brain Hacks</Text>
              </View>
              {recommendations.map((rec: string, idx: number) => (
                <View key={idx} className="flex-row items-start space-x-4 mb-4">
                  <ChevronRight size={16} color={Theme.colors.success} className="mt-1" />
                  <Text className="text-slate-200 text-sm leading-6 flex-1 font-medium">{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Premium CTA Upgrade */}
          <TouchableOpacity className="mx-6 mb-12 bg-indigo-600 rounded-[32px] p-8 items-center shadow-2xl shadow-indigo-600/50">
             <Text className="text-white text-2xl font-black text-center mb-2">Power Up to Pro</Text>
             <Text className="text-indigo-100 text-center text-sm mb-6 opacity-80">Unlock 12-month history, advanced focus heatmaps, and personalized AI challenges.</Text>
             <View className="bg-white px-8 py-4 rounded-2xl">
                <Text className="text-indigo-600 font-black">Upgrade Now</Text>
             </View>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
