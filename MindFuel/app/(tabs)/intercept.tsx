import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, ArrowRight, X, Check } from 'lucide-react-native';
import { Theme } from '../../theme';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks/useAuth';
import { format } from 'date-fns';

interface InterceptLog {
  id: string;
  intent: string;
  action: 'continued' | 'disconnected';
  created_at: string;
}

export default function InterceptScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<'breathe' | 'intent'>('breathe');
  const [timeLeft, setTimeLeft] = useState(5);
  const [intent, setIntent] = useState('');
  const [recentLogs, setRecentLogs] = useState<InterceptLog[]>([]);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadLogs();
  }, [user]);

  const loadLogs = async () => {
    try {
      if (!user) return;
      const { data } = await supabase
        .from('intercept_logs')
        .select('id, intent, action, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentLogs(data || []);
    } catch {}
  };

  useEffect(() => {
    if (step === 'breathe') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 2000, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
        ])
      ).start();

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timer); setStep('intent'); return 0; }
          return prev - 1;
        });
      }, 1000);

      return () => { clearInterval(timer); scaleAnim.stopAnimation(); };
    }
  }, [step, scaleAnim]);

  const saveAndAct = async (action: 'continued' | 'disconnected') => {
    try {
      if (!user) return;
      await supabase.from('intercept_logs').insert({
        user_id: user.id,
        intent: intent.trim() || 'No intent stated',
        action,
      });
    } catch {}
    router.replace('/');
  };

  const todayCount = recentLogs.filter(l => {
    return format(new Date(l.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  }).length;

  const disconnectRate = recentLogs.length > 0
    ? Math.round((recentLogs.filter(l => l.action === 'disconnected').length / recentLogs.length) * 100)
    : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#000000' }}
      contentContainerStyle={{ padding: 24, paddingTop: 80, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <ShieldAlert size={48} color="#71717a" />
      </View>

      {step === 'breathe' ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 }}>Pause.</Text>
          <Text style={{ fontSize: 14, color: '#71717a', marginBottom: 48 }}>Take a deep breath before proceeding.</Text>
          <Animated.View style={{
            width: 120, height: 120, borderRadius: 60,
            borderWidth: 1, borderColor: '#27272a',
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: scaleAnim }]
          }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: '#ffffff' }}>{timeLeft}</Text>
          </Animated.View>
        </View>
      ) : (
        <View style={{ width: '100%' }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center' }}>
            Why are you opening this?
          </Text>
          <Text style={{ fontSize: 14, color: '#71717a', marginBottom: 32, textAlign: 'center' }}>
            Mindless scrolling steals your time. State your intent.
          </Text>

          <TextInput
            style={{
              backgroundColor: '#09090b', color: '#ffffff',
              height: 56, borderRadius: 12, borderWidth: 1,
              borderColor: '#27272a', paddingHorizontal: 16,
              fontSize: 16, marginBottom: 24, textAlign: 'center'
            }}
            placeholder="e.g., Checking a message"
            placeholderTextColor="#71717a"
            value={intent}
            onChangeText={setIntent}
            autoFocus
          />

          <TouchableOpacity
            onPress={() => saveAndAct('continued')}
            disabled={!intent.trim()}
            style={{
              backgroundColor: '#ffffff', height: 56, borderRadius: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12, opacity: !intent.trim() ? 0.5 : 1
            }}
          >
            <Text style={{ color: '#000000', fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>Continue to App</Text>
            <ArrowRight size={20} color="#000000" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => saveAndAct('disconnected')}
            style={{
              height: 56, borderRadius: 16, flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#71717a', fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>Close & Disconnect</Text>
            <X size={20} color="#71717a" />
          </TouchableOpacity>

          {/* Stats */}
          {recentLogs.length > 0 && (
            <View style={{ marginTop: 40 }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <View style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#ffffff' }}>{todayCount}</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Today</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#ffffff' }}>{disconnectRate}%</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Disconnect</Text>
                </View>
              </View>

              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#52525b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Recent</Text>
              {recentLogs.slice(0, 5).map(log => (
                <View key={log.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {log.action === 'disconnected'
                    ? <Check size={14} color="#ffffff" />
                    : <ArrowRight size={14} color="#52525b" />
                  }
                  <Text style={{ flex: 1, fontSize: 13, color: '#a1a1aa' }} numberOfLines={1}>{log.intent}</Text>
                  <Text style={{ fontSize: 11, color: '#3f3f46' }}>{format(new Date(log.created_at), 'h:mm a')}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
