import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { Timer, Play, X, Check } from 'lucide-react-native';
import { Svg, Circle } from 'react-native-svg';
import { Theme } from '../../theme';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks/useAuth';

const DURATIONS = [15, 30, 45, 60];

export default function FocusScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [phase, setPhase] = useState<'select' | 'running' | 'done'>('select');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    const total = selectedMinutes * 60;
    setTotalSeconds(total);
    setSecondsLeft(total);
    setPhase('running');
  };

  useEffect(() => {
    if (phase === 'running' && secondsLeft > 0) {
      intervalRef.current = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
      return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
    }
    if (phase === 'running' && secondsLeft === 0) {
      setPhase('done');
      Vibration.vibrate([0, 200, 100, 200]);
      saveSession(true);
    }
  }, [phase, secondsLeft]);

  const giveUp = () => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    setPhase('select');
    saveSession(false);
  };

  const saveSession = async (completed: boolean) => {
    try {
      if (!user) return;
      await supabase.from('focus_sessions').insert({
        user_id: user.id,
        duration_minutes: selectedMinutes,
        completed,
      });
    } catch {}
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

  const size = 240;
  const strokeWidth = 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      {phase === 'select' && (
        <View style={{ alignItems: 'center', width: '100%' }}>
          <Timer size={40} color={Theme.colors.textMuted} />
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: Theme.colors.text, marginTop: 24, marginBottom: 8 }}>
            Focus Timer
          </Text>
          <Text style={{ fontSize: 14, color: Theme.colors.textMuted, marginBottom: 40 }}>
            Commit to phone-free time.
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedMinutes(d)}
                style={{
                  paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
                  backgroundColor: selectedMinutes === d ? '#ffffff' : Theme.colors.surface,
                  borderWidth: selectedMinutes === d ? 0 : 1,
                  borderColor: Theme.colors.border,
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: 'bold',
                  color: selectedMinutes === d ? '#000000' : Theme.colors.textMuted,
                }}>
                  {d}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={startTimer}
            style={{
              width: '100%', height: 56, backgroundColor: '#ffffff',
              borderRadius: 16, flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: 12,
            }}
          >
            <Play size={20} color="#000000" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }}>Begin Focus</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'running' && (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
              />
              <Circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="#ffffff" strokeWidth={strokeWidth}
                strokeDasharray={`${circumference}`} strokeDashoffset={`${offset}`}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={{ fontSize: 56, fontWeight: '900', color: '#ffffff', fontVariant: ['tabular-nums'] }}>
              {mm}:{ss}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: Theme.colors.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
              Remaining
            </Text>
          </View>

          <Text style={{ fontSize: 13, color: '#52525b', marginTop: 32, marginBottom: 32 }}>
            Stay present. Your future self will thank you.
          </Text>

          <TouchableOpacity onPress={giveUp} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <X size={16} color="#52525b" />
            <Text style={{ fontSize: 14, color: '#52525b' }}>Give Up</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'done' && (
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, borderWidth: 2,
            borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 32,
          }}>
            <Check size={40} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 }}>
            Focus Complete
          </Text>
          <Text style={{ fontSize: 14, color: Theme.colors.textMuted, marginBottom: 40 }}>
            {selectedMinutes} minutes of undistracted time.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={{
              width: '100%', height: 56, backgroundColor: '#ffffff',
              borderRadius: 16, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
