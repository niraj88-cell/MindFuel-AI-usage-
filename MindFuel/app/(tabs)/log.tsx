// Mental wellness log screen with AI content analysis and voice input support
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { trackEvent } from '../../lib/mixpanel';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks/useAuth';
import { analyzeContent, type AIAnalysisResult } from '../../lib/services/aiAnalyzer';
import { canLogToday } from '../../lib/services/subscription';
import { transcribeAudio } from '../../lib/api/quickLog';
import * as Speech from 'expo-speech';
import { Theme } from '../../theme';
import {
  Sparkles,
  Clock,
  Smile,
  Save,
  Brain,
  ChevronRight,
  Info,
  Mic,
  Square,
  Camera,
  Play,
  MessageCircle,
  Newspaper,
  Headphones,
  BookOpen,
  Code,
  Gamepad2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Preset options for quick logging
const QUICK_SCANS = [
  { id: 'instagram', label: 'Instagram', icon: Camera, text: 'Scrolling Instagram feed and reels', color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', icon: Play, text: 'Watching TikTok videos', color: '#00f2ea' },
  { id: 'youtube', label: 'YouTube', icon: Play, text: 'Watching YouTube videos', color: '#FF0000' },
  { id: 'twitter', label: 'Twitter/X', icon: MessageCircle, text: 'Scrolling Twitter/X timeline', color: '#1DA1F2' },
  { id: 'news', label: 'News', icon: Newspaper, text: 'Reading news articles online', color: '#64748b' },
  { id: 'podcast', label: 'Podcast', icon: Headphones, text: 'Listening to a podcast episode', color: '#10b981' },
  { id: 'reading', label: 'Reading', icon: BookOpen, text: 'Reading a book or long-form article', color: '#8b5cf6' },
  { id: 'coding', label: 'Coding', icon: Code, text: 'Coding and software development', color: '#06b6d4' },
];

const CATEGORIES = [
  { value: 'educational', label: '📚 Educational', color: Theme.colors.educational },
  { value: 'productive', label: '⚡ Productive', color: Theme.colors.productive },
  { value: 'creative', label: '🎨 Creative', color: Theme.colors.creative },
  { value: 'social', label: '💬 Social', color: Theme.colors.social },
  { value: 'entertainment', label: '🎮 Entertainment', color: Theme.colors.entertainment },
  { value: 'doomscroll', label: '☠️ Doomscroll', color: Theme.colors.doomscroll },
];

function getScoreColor(score: number) {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Low';
  return 'Poor';
}

export default function LogScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [moodBefore, setMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: limitInfo } = useQuery({
    queryKey: ['daily_limit', user?.id],
    queryFn: async () => {
      if (!user) return { allowed: false, remaining: 0 };
      return await canLogToday(user.id);
    },
    enabled: !!user,
  });

  const createLogMutation = useMutation({
    mutationFn: async (logData: any) => {
      const { data, error } = await supabase
        .from('mental_logs')
        .insert({ ...logData, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mental_logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['daily_limit'] });

      trackEvent('Log Created', {
        category: selectedCategory,
        score: aiAnalysis?.mental_score || 50,
        duration: parseInt(duration) || 0,
      });

      setSaved(true);
    },
  });

  // Auto-analyze when a quick scan preset is tapped
  const handleQuickScan = useCallback(async (text: string) => {
    Speech.stop();
    setContent(text);
    setIsAnalyzing(true);
    try {
      const result = await analyzeContent(text);
      Speech.speak(result.summary);
      setAiAnalysis(result);
      setSelectedCategory(result.category);
      trackEvent('Quick Scan Used', { text });
    } catch {
      // Fallback handled inside analyzeContent
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleAIAnalysis = async () => {
    if (!content.trim()) return;
    Speech.stop();
    setIsAnalyzing(true);
    try {
      const result = await analyzeContent(content);
      Speech.speak(result.summary);
      setAiAnalysis(result);
      setSelectedCategory(result.category);
    } catch (error: any) {
      Alert.alert('Analysis Tip', 'Try a more specific description or paste a URL for deeper results.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice logging.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      trackEvent('Voice Recording Started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return;

      const text = await transcribeAudio(uri);
      if (text) {
        setContent(prev => prev ? `${prev} ${text}` : text);
        trackEvent('Voice Transcription Used');
      }
    } catch (err) {
      Alert.alert('Transcription Failed', 'Could not convert voice to text. Please type your content instead.');
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSave = () => {
    if (!content.trim() || !selectedCategory || !duration) {
      Alert.alert('Missing Details', 'Please fill in the content, category, and duration.');
      return;
    }

    createLogMutation.mutate({
      content: content.trim(),
      category: selectedCategory,
      mental_score: aiAnalysis?.mental_score || 50,
      duration_minutes: parseInt(duration),
      mood_before: moodBefore ? parseInt(moodBefore) : null,
      mood_after: moodAfter ? parseInt(moodAfter) : null,
      source: aiAnalysis ? 'url_submission' : 'manual',
      metadata: aiAnalysis ? {
        ai_summary: aiAnalysis.summary,
        ai_reasoning: aiAnalysis.reasoning,
        ai_tags: aiAnalysis.tags,
      } : {},
    });
  };

  const resetForm = () => {
    Speech.stop();
    setContent('');
    setSelectedCategory(null);
    setDuration('');
    setMoodBefore('');
    setMoodAfter('');
    setAiAnalysis(null);
    setSaved(false);
    setShowReasoning(false);
  };

  // ── Post-save success screen ──────────────────────────
  if (saved) {
    const score = aiAnalysis?.mental_score || 50;
    const color = getScoreColor(score);
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <CheckCircle2 size={40} color={color} />
        </View>
        <Text style={{ color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 8, textAlign: 'center' }}>
          Logged! 🧠
        </Text>
        <Text style={{ color: Theme.colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
          {aiAnalysis?.summary || 'Your mental meal has been tracked.'}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: color + '15', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16,
          borderWidth: 1, borderColor: color + '30', marginBottom: 32,
        }}>
          <Text style={{ color, fontSize: 24, fontWeight: '900' }}>{score}</Text>
          <Text style={{ color: Theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>
            / 100 — {getScoreLabel(score)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={resetForm}
          style={{
            backgroundColor: Theme.colors.primary, paddingVertical: 16, paddingHorizontal: 40,
            borderRadius: 20, shadowColor: Theme.colors.primary,
            shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Log Another</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { resetForm(); router.replace('/(tabs)'); }}
          style={{ marginTop: 16, padding: 12 }}
        >
          <Text style={{ color: Theme.colors.textMuted, fontWeight: '700', fontSize: 14 }}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="pt-12 pb-4">
            <Text className="text-white text-3xl font-bold">Log Activity</Text>
            <Text className="text-slate-400 mt-1">What did you consume today?</Text>
          </View>

          {/* ── Quick Scan Presets ──────────────────────── */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Zap size={14} color={Theme.colors.primaryLight} />
              <Text style={{ color: Theme.colors.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
                Quick Scan
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -6 }}>
              {QUICK_SCANS.map((scan) => {
                const Icon = scan.icon;
                return (
                  <TouchableOpacity
                    key={scan.id}
                    onPress={() => handleQuickScan(scan.text)}
                    disabled={isAnalyzing}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      paddingHorizontal: 14, paddingVertical: 10,
                      borderRadius: 16, marginHorizontal: 4,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon size={16} color={scan.color} />
                    <Text style={{ color: Theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>{scan.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Content Input ──────────────────────────── */}
          <View className="bg-slate-800/40 border border-white/5 rounded-[28px] p-6 mb-6">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Brain size={16} color={Theme.colors.primaryLight} />
              <Text style={{ color: Theme.colors.textMuted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
                Mental Content
              </Text>
            </View>

            <TextInput
              className="text-white text-base font-medium"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              placeholder="Paste a URL or describe what you consumed..."
              placeholderTextColor="#475569"
              value={content}
              onChangeText={setContent}
              multiline
            />

            {/* Voice + Analyze buttons */}
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
              <TouchableOpacity
                onPress={recording ? stopRecording : startRecording}
                style={{
                  width: 48, height: 48, borderRadius: 16,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: recording ? '#ef4444' : 'rgba(99, 102, 241, 0.15)',
                  borderWidth: 1,
                  borderColor: recording ? 'rgba(239,68,68,0.4)' : 'rgba(99, 102, 241, 0.25)',
                }}
              >
                {isTranscribing ? (
                  <ActivityIndicator color={Theme.colors.primaryLight} size="small" />
                ) : recording ? (
                  <Square size={18} color="white" fill="white" />
                ) : (
                  <Mic size={18} color={Theme.colors.primaryLight} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAIAnalysis}
                disabled={isAnalyzing || !content.trim()}
                style={{
                  flex: 1, height: 48, borderRadius: 16,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: isAnalyzing ? 'rgba(255,255,255,0.03)' : 'rgba(99, 102, 241, 0.12)',
                  borderWidth: 1,
                  borderColor: isAnalyzing ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.25)',
                  opacity: !content.trim() ? 0.4 : 1,
                }}
              >
                {isAnalyzing ? (
                  <ActivityIndicator color={Theme.colors.primaryLight} size="small" />
                ) : (
                  <>
                    <Sparkles size={16} color={Theme.colors.primaryLight} />
                    <Text style={{ color: Theme.colors.primaryLight, fontWeight: '800', fontSize: 14 }}>
                      Analyze
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── AI Analysis Result ──────────────────── */}
            {aiAnalysis && (
              <View style={{
                marginTop: 20, paddingTop: 20,
                borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
              }}>
                {/* Score bar */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: Theme.colors.primaryLight, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
                    Mental Nutrition
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={{ color: getScoreColor(aiAnalysis.mental_score), fontSize: 24, fontWeight: '900' }}>
                      {aiAnalysis.mental_score}
                    </Text>
                    <Text style={{ color: Theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>/100</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{
                  height: 8, borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  overflow: 'hidden', marginBottom: 16,
                }}>
                  <View style={{
                    width: `${aiAnalysis.mental_score}%`,
                    height: '100%', borderRadius: 4,
                    backgroundColor: getScoreColor(aiAnalysis.mental_score),
                  }} />
                </View>

                {/* Summary */}
                <Text style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 22, fontWeight: '500', marginBottom: 12 }}>
                  {aiAnalysis.summary}
                </Text>

                {/* Tags */}
                {aiAnalysis.tags && aiAnalysis.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {aiAnalysis.tags.map((tag, i) => (
                      <View key={i} style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                        borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)',
                      }}>
                        <Text style={{ color: Theme.colors.primaryLight, fontSize: 10, fontWeight: '700' }}>
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Reasoning toggle */}
                {aiAnalysis.reasoning && (
                  <TouchableOpacity
                    onPress={() => setShowReasoning(!showReasoning)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                  >
                    <Text style={{ color: Theme.colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                      {showReasoning ? 'Hide' : 'Show'} AI reasoning
                    </Text>
                    {showReasoning
                      ? <ChevronUp size={14} color={Theme.colors.textMuted} />
                      : <ChevronDown size={14} color={Theme.colors.textMuted} />
                    }
                  </TouchableOpacity>
                )}
                {showReasoning && aiAnalysis.reasoning && (
                  <Text style={{
                    color: Theme.colors.textMuted, fontSize: 12, lineHeight: 20, fontStyle: 'italic',
                    marginTop: 8, padding: 14, backgroundColor: 'rgba(255,255,255,0.02)',
                    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
                  }}>
                    {aiAnalysis.reasoning}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ── Category Grid ──────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              color: Theme.colors.textMuted, fontSize: 10, fontWeight: '900',
              textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4,
            }}>
              Category
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setSelectedCategory(cat.value)}
                  style={{ width: (width - 64) / 2 }}
                  className={`p-4 rounded-2xl mb-3 border ${
                    selectedCategory === cat.value
                      ? 'bg-indigo-600/20 border-indigo-500'
                      : 'bg-slate-800/40 border-white/5'
                  }`}
                >
                  <Text className={`text-center font-bold text-xs ${
                    selectedCategory === cat.value ? 'text-white' : 'text-slate-400'
                  }`}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Duration & Mood ──────────────────────── */}
          <View className="flex-row mb-6" style={{ gap: 12 }}>
            <View className="flex-1 bg-slate-800/40 border border-white/5 rounded-3xl p-5">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Clock size={13} color={Theme.colors.textMuted} />
                <Text style={{ color: Theme.colors.textMuted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Duration
                </Text>
              </View>
              <TextInput
                className="text-white text-xl font-bold"
                placeholder="Mins"
                placeholderTextColor="#475569"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
            </View>

            <View className="flex-1 bg-slate-800/40 border border-white/5 rounded-3xl p-5">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Smile size={13} color={Theme.colors.textMuted} />
                <Text style={{ color: Theme.colors.textMuted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Mood After
                </Text>
              </View>
              <TextInput
                className="text-white text-xl font-bold"
                placeholder="1-10"
                placeholderTextColor="#475569"
                value={moodAfter}
                onChangeText={setMoodAfter}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          {/* Daily Limit Info */}
          {limitInfo && limitInfo.remaining !== Infinity && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 12, borderRadius: 16,
              marginBottom: 16,
            }}>
              <Info size={14} color={limitInfo.remaining > 0 ? Theme.colors.success : Theme.colors.danger} />
              <Text style={{
                fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1,
                color: limitInfo.remaining > 0 ? Theme.colors.success : Theme.colors.danger,
              }}>
                {limitInfo.remaining > 0
                  ? `${limitInfo.remaining} Daily Logs Remaining`
                  : 'Daily Limit Reached — Upgrade to Premium'}
              </Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={createLogMutation.isPending}
            style={{
              backgroundColor: Theme.colors.primary, height: 60, borderRadius: 22,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: Theme.colors.primary,
              shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20,
              elevation: 12, marginBottom: 48,
            }}
          >
            {createLogMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Save size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Save Mental Meal</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
