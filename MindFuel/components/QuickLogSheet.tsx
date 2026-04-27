// components/QuickLogSheet.tsx
// Native Quick Log bottom sheet — one-tap presets + voice dictation
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  Mic,
  MicOff,
  X,
  Camera,
  Play,
  MessageCircle,
  Newspaper,
  Headphones,
  BookOpen,
  Gamepad2,
  Code,
  CheckCircle2,
  Zap,
} from 'lucide-react-native';
import { Theme } from '../theme';
import { submitQuickLog, transcribeAudio } from '../lib/api/quickLog';
import { trackEvent } from '../lib/mixpanel';

const { height, width } = Dimensions.get('window');

interface QuickPreset {
  id: string;
  label: string;
  icon: typeof Camera;
  color: string;
  category: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'instagram_scroll', label: 'Instagram', icon: Camera, color: '#E1306C', category: 'doomscroll' },
  { id: 'tiktok_scroll', label: 'TikTok', icon: Play, color: '#00f2ea', category: 'doomscroll' },
  { id: 'youtube_video', label: 'YouTube', icon: Play, color: '#FF0000', category: 'entertainment' },
  { id: 'twitter_scroll', label: 'Twitter/X', icon: MessageCircle, color: '#1DA1F2', category: 'doomscroll' },
  { id: 'news_article', label: 'News', icon: Newspaper, color: '#64748b', category: 'neutral' },
  { id: 'podcast', label: 'Podcast', icon: Headphones, color: '#10b981', category: 'educational' },
  { id: 'reading', label: 'Reading', icon: BookOpen, color: '#8b5cf6', category: 'educational' },
  { id: 'coding', label: 'Coding', icon: Code, color: '#06b6d4', category: 'productive' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, color: '#f59e0b', category: 'entertainment' },
];

interface QuickLogSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickLogSheet({ visible, onClose, onSuccess }: QuickLogSheetProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<{ message: string; emoji: string; scoreImpact?: string } | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (recording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setError(null);
      setInsight(null);
      setIsProcessing(false);
    }
  }, [visible]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Microphone permission is required for voice logging.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setError(null);
      trackEvent('Voice Recording Started');
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Could not access microphone.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;

    try {
      setIsProcessing(true);
      setProcessingLabel('Transcribing voice...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) throw new Error('No recording found');

      const transcribedText = await transcribeAudio(uri);
      trackEvent('Voice Transcription Success');

      setProcessingLabel('Analyzing mental nutrition...');
      const data = await submitQuickLog(undefined, undefined, undefined, undefined, transcribedText);

      if (data.instantInsight) {
        setInsight(data.instantInsight);
        trackEvent('Quick Log Voice Success', { hasInsight: true });
      } else {
        handleSuccess();
      }
    } catch (err: any) {
      console.error('Recording processing failed', err);
      setError(err.message || 'Voice processing failed. Try again.');
      setRecording(null);
    } finally {
      setIsProcessing(false);
    }
  }, [recording]);

  const handlePreset = useCallback(async (preset: QuickPreset) => {
    try {
      setIsProcessing(true);
      setProcessingLabel(`Logging ${preset.label}...`);
      setError(null);

      const data = await submitQuickLog(preset.id);
      trackEvent('Quick Log Preset', { preset: preset.id, category: preset.category });

      if (data.instantInsight) {
        setInsight(data.instantInsight);
      } else {
        handleSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save log.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  function handleSuccess() {
    setInsight(null);
    onClose();
    onSuccess();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Zap size={20} color={Theme.colors.primaryLight} />
            <Text style={styles.title}>Quick Log</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color={Theme.colors.textMuted} size={22} />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Insight Result */}
        {insight ? (
          <View style={styles.insightBox}>
            <Text style={styles.insightEmoji}>{insight.emoji}</Text>
            <Text style={styles.insightLabel}>INSTANT INSIGHT</Text>
            <Text style={styles.insightMessage}>{insight.message}</Text>
            {insight.scoreImpact && (
              <Text style={styles.scoreImpact}>{insight.scoreImpact}</Text>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSuccess}>
              <CheckCircle2 color="white" size={20} />
              <Text style={styles.primaryButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        ) : isProcessing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator color={Theme.colors.primary} size="large" />
            <Text style={styles.processingText}>{processingLabel}</Text>
          </View>
        ) : (
          <>
            {/* Presets Grid */}
            <View style={styles.grid}>
              {QUICK_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.presetButton}
                    onPress={() => handlePreset(preset)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrapper, {
                      backgroundColor: preset.color + '15',
                      borderColor: preset.color + '30',
                    }]}>
                      <Icon color={preset.color} size={22} />
                    </View>
                    <Text style={styles.presetLabel}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR SPEAK</Text>
              <View style={styles.line} />
            </View>

            {/* Voice */}
            <View style={styles.voiceContainer}>
              <TouchableOpacity
                style={[styles.micButton, recording && styles.micButtonRecording]}
                onPress={recording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                {recording ? (
                  <MicOff color="white" size={28} />
                ) : (
                  <Mic color="white" size={28} />
                )}
              </TouchableOpacity>

              <Text style={styles.voiceHint}>
                {recording
                  ? `Recording... 0:${recordingTime.toString().padStart(2, '0')} — tap to stop`
                  : 'Tap to describe what you consumed'}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  presetButton: {
    width: (width - 72) / 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  presetLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dividerText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 16,
    letterSpacing: 3,
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  voiceHint: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
  },
  processingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  processingText: {
    color: Theme.colors.textMuted,
    marginTop: 16,
    fontWeight: '700',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
  insightBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    padding: 28,
    borderRadius: 28,
    alignItems: 'center',
    marginVertical: 20,
  },
  insightEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  insightLabel: {
    color: Theme.colors.primaryLight,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 12,
  },
  insightMessage: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreImpact: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    marginLeft: 8,
  },
});
