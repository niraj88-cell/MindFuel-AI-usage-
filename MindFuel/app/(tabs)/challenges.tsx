import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase/client';
import { HabitChallenge } from '../../lib/supabase/types';
import { Theme } from '../../theme';
import { 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Plus, 
  Compass, 
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react-native';

const STATIC_TEMPLATES = [
  {
    title: 'Digital Detox Morning',
    description: 'No social media or news for the first hour after waking up.',
    target_days: 7,
    difficulty: 'medium' as const,
    category: 'morning_routine',
    target_category: 'doomscroll',
  },
  {
    title: 'Mindful Meals',
    description: 'Eat at least one meal a day without any screens.',
    target_days: 14,
    difficulty: 'easy' as const,
    category: 'mindfulness',
    target_category: 'entertainment',
  },
  {
    title: 'Deep Work Sprint',
    description: 'Complete one 90-minute focused work block daily without interruptions.',
    target_days: 5,
    difficulty: 'hard' as const,
    category: 'productivity',
    target_category: 'productive',
  }
];

export default function ChallengesScreen() {
  const [activeChallenges, setActiveChallenges] = useState<HabitChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadChallenges();
  }, [user]);

  async function loadChallenges() {
    if (!user) return;
    const { data } = await supabase
      .from('habit_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setActiveChallenges(data || []);
    setLoading(false);
  }

  async function startChallenge(template: any) {
    if (!user) return;
    setAddingTemplate(template.title);
    await supabase.from('habit_challenges').insert({
      user_id: user.id,
      title: template.title,
      description: template.description,
      target_days: template.target_days,
      difficulty: template.difficulty,
      category: template.category,
      target_category: template.target_category,
      completed_days: 0,
      is_active: true,
      started_at: new Date().toISOString(),
    } as any);
    await loadChallenges();
    setAddingTemplate(null);
  }

  async function checkInChallenge(challenge: HabitChallenge) {
    const newProgress = challenge.completed_days + 1;
    const isCompleted = newProgress >= challenge.target_days;
    await supabase.from('habit_challenges')
      .update({
        completed_days: newProgress,
        is_active: !isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      } as any)
      .eq('id', challenge.id);
    loadChallenges();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }} className="items-center justify-center">
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-10">
          <View className="flex-row items-center mb-2 space-x-3">
            <View className="w-10 h-10 bg-amber-500/20 rounded-2xl items-center justify-center border border-amber-500/30">
              <Trophy size={22} color={Theme.colors.creative} />
            </View>
            <Text className="text-3xl font-black text-white">Challenges</Text>
          </View>
          <Text className="text-slate-400 font-medium">Build ironclad mental habits</Text>
        </View>

        {/* Active Challenges */}
        <View className="flex-row items-center justify-between mb-6">
           <Text className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Your Missions</Text>
           <View className="bg-emerald-500/20 px-3 py-1 rounded-full">
              <Text className="text-emerald-400 font-bold text-[10px]">{activeChallenges.length} Active</Text>
           </View>
        </View>

        {activeChallenges.length > 0 ? (
          activeChallenges.map((challenge) => {
            const progress = (challenge.completed_days / challenge.target_days) * 100;
            return (
              <View key={challenge.id} className="bg-slate-800/40 border border-white/5 rounded-[32px] p-6 mb-6 overflow-hidden">
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1 pr-4">
                    <Text className="text-white text-lg font-bold">{challenge.title}</Text>
                    <Text className="text-slate-400 text-xs mt-1 leading-5" numberOfLines={2}>{challenge.description}</Text>
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center space-x-1">
                      <Flame size={14} color={Theme.colors.warning} fill={Theme.colors.warning} />
                      <Text className="text-white font-black">{challenge.completed_days}/{challenge.target_days}</Text>
                    </View>
                    <Text className="text-slate-500 text-[9px] font-bold uppercase mt-1">Progress</Text>
                  </View>
                </View>

                {/* Custom Progress Bar */}
                <View className="h-2 bg-slate-700/50 rounded-full mb-6 overflow-hidden">
                   <View 
                    style={{ width: `${progress}%` }} 
                    className="h-full bg-indigo-500 shadow-lg shadow-indigo-500/50" 
                   />
                </View>
                
                <TouchableOpacity 
                  onPress={() => checkInChallenge(challenge)}
                  className="bg-indigo-600 h-14 rounded-2xl flex-row justify-center items-center space-x-3 shadow-xl shadow-indigo-600/40"
                >
                  <CheckCircle2 size={18} color="white" strokeWidth={3} />
                  <Text className="text-white font-bold">Check-In for Today</Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View className="bg-slate-800/20 rounded-[32px] p-10 items-center border border-dashed border-slate-700 mb-8">
            <Compass size={40} color={Theme.colors.textMuted} />
            <Text className="text-slate-400 font-bold mt-4 text-center">No active missions</Text>
            <Text className="text-slate-500 text-xs mt-1 text-center">Select a challenge below to begin your training.</Text>
          </View>
        )}

        {/* Discover */}
        <View className="mt-6 mb-6">
           <Text className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Training Academy</Text>
        </View>

        <View className="pb-12">
          {STATIC_TEMPLATES.map((template) => {
            const isActive = activeChallenges.some(c => c.title === template.title);
            return (
              <View key={template.title} className="bg-slate-800/40 border border-white/5 rounded-[32px] p-6 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <View className={`px-3 py-1 rounded-full border ${
                    template.difficulty === 'easy' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                    template.difficulty === 'medium' ? 'bg-amber-500/10 border-amber-500/20' : 
                    'bg-rose-500/10 border-rose-500/20'
                  }`}>
                    <Text className={`text-[9px] font-black uppercase tracking-widest ${
                      template.difficulty === 'easy' ? 'text-emerald-400' : 
                      template.difficulty === 'medium' ? 'text-amber-400' : 
                      'text-rose-400'
                    }`}>{template.difficulty}</Text>
                  </View>
                  <View className="flex-row items-center space-x-1">
                    <Target size={12} color={Theme.colors.textMuted} />
                    <Text className="text-slate-400 text-[10px] font-bold uppercase">{template.target_days} Days</Text>
                  </View>
                </View>
                
                <Text className="text-white text-lg font-bold mb-1">{template.title}</Text>
                <Text className="text-slate-400 text-xs leading-5 mb-6">{template.description}</Text>
                
                <TouchableOpacity 
                  onPress={() => startChallenge(template)}
                  disabled={isActive || addingTemplate === template.title}
                  className={`h-14 rounded-2xl flex-row justify-center items-center space-x-3 ${
                    isActive ? 'bg-slate-700/30 border border-white/5' : 'bg-slate-700/80 shadow-lg'
                  }`}
                >
                  {isActive ? (
                    <>
                      <ShieldCheck size={18} color={Theme.colors.success} />
                      <Text className="text-emerald-400 font-bold">Currently Active</Text>
                    </>
                  ) : addingTemplate === template.title ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Zap size={18} color="white" fill="white" />
                      <Text className="text-white font-bold">Accept Mission</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
