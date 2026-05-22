import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Heart, Send, Check } from 'lucide-react-native';
import { Theme } from '../../theme';
import { supabase } from '../../lib/supabase/client';
import { useAuth } from '../../lib/hooks/useAuth';
import { format, subDays } from 'date-fns';

const RATINGS = [
  { value: 1, emoji: '😫', label: 'Drained' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '✨', label: 'Energized' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface PulseEntry { date: string; rating: number }

export default function PulseScreen() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weekData, setWeekData] = useState<PulseEntry[]>([]);

  const loadWeek = useCallback(async () => {
    try {
      if (!user) return;
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('daily_pulses')
        .select('date, rating')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: true });
      setWeekData(data || []);
    } catch {}
  }, [user]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  const handleSave = async () => {
    if (!selected || saving || !user) return;
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await supabase.from('daily_pulses').upsert({
        user_id: user.id,
        date: today,
        rating: selected,
        note: note.trim() || null,
      }, { onConflict: 'user_id,date' });
      setSaved(true);
      loadWeek();
      setTimeout(() => { setSaved(false); setSelected(null); setNote(''); }, 2000);
    } catch {}
    setSaving(false);
  };

  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = weekData.find(e => e.date === dateStr);
    return { label: DAY_LABELS[date.getDay()], rating: entry?.rating || 0, isToday: i === 6 };
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Theme.colors.background }}
      contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Heart size={40} color={Theme.colors.textMuted} />
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 16, marginBottom: 8 }}>
          Daily Pulse
        </Text>
        <Text style={{ fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center' }}>
          How did your screen time make you feel?
        </Text>
      </View>

      {/* Rating buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {RATINGS.map(r => (
          <TouchableOpacity
            key={r.value}
            onPress={() => setSelected(r.value)}
            style={{
              alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: selected === r.value ? '#ffffff' : Theme.colors.surface,
              borderWidth: selected === r.value ? 0 : 1,
              borderColor: Theme.colors.border,
            }}
          >
            <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
            <Text style={{
              fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1,
              color: selected === r.value ? '#000000' : Theme.colors.textMuted,
            }}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Note */}
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note (optional)"
        placeholderTextColor={Theme.colors.textMuted}
        style={{
          backgroundColor: Theme.colors.card, color: '#ffffff',
          height: 48, borderRadius: 12, borderWidth: 1,
          borderColor: Theme.colors.border, paddingHorizontal: 16,
          fontSize: 14, textAlign: 'center', marginBottom: 24,
        }}
      />

      {/* Save */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={!selected || saving}
        style={{
          height: 56, backgroundColor: selected ? '#ffffff' : Theme.colors.surface,
          borderRadius: 16, flexDirection: 'row', alignItems: 'center',
          justifyContent: 'center', gap: 12, opacity: selected ? 1 : 0.5,
          marginBottom: 48,
        }}
      >
        {saved ? (
          <>
            <Check size={20} color="#000000" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }}>Saved</Text>
          </>
        ) : (
          <>
            <Send size={20} color={selected ? '#000000' : Theme.colors.textMuted} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: selected ? '#000000' : Theme.colors.textMuted }}>
              Save Pulse
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Weekly chart */}
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: Theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
        This Week
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 8 }}>
        {chartDays.map((day, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
              <View style={{
                width: '80%', maxWidth: 28, borderRadius: 8,
                height: day.rating ? `${(day.rating / 5) * 100}%` : 4,
                minHeight: 4,
                backgroundColor: day.rating
                  ? `rgba(255, 255, 255, ${0.15 + day.rating * 0.17})`
                  : 'rgba(255, 255, 255, 0.05)',
              }} />
            </View>
            <Text style={{
              fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase',
              color: day.isToday ? '#ffffff' : '#52525b',
            }}>
              {day.label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
