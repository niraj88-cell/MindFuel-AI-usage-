import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { useAuth } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase/client';
import { apiPost } from '../../lib/api/client';
import { transcribeAudio } from '../../lib/api/quickLog';
import { Theme } from '../../theme';
import { Send, Bot, User, Sparkles, MessageSquare, Mic, Square } from 'lucide-react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadHistory();
  }, [user]);

  async function loadHistory() {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('coaching_sessions')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle();

      const stateObj = data?.state as Record<string, any> | null;
      if (stateObj?.messages) {
        const history: Message[] = Array.isArray(stateObj.messages)
          ? stateObj.messages.map((m: any, i: number) => ({
              id: `hist-${i}`,
              role: (m.type === 'human' ? 'user' : 'assistant') as Message['role'],
              content: m.content || '',
            }))
          : [];

        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            { id: 'welcome', role: 'assistant', content: "Hi! I'm your MindFuel coach. How are you feeling today? 🌿" },
          ]);
        }
      } else {
        setMessages([
          { id: 'welcome', role: 'assistant', content: "Hi! I'm your MindFuel coach. How are you feeling today? 🌿" },
        ]);
      }
    } catch (e) {
      console.error("Load history error:", e);
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSubmit() {
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    setInput('');
    Speech.stop();
    
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const json = await apiPost('/api/coach/mobile', { message: userMessage });
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: json.response };
      
      Speech.speak(json.response);
      
      setMessages((prev) => {
        const updatedMessages = [...prev, assistantMessage];

        // Save history back to Supabase (fire-and-forget)
        const langchainMessages = updatedMessages.map(m => ({
          type: m.role === 'user' ? 'human' : 'ai',
          content: m.content
        }));

        supabase.from('coaching_sessions').upsert({
          user_id: user!.id,
          state: { messages: langchainMessages },
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' }).then(({ error }) => { if (error) console.error(error); });

        return updatedMessages;
      });

    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'system', content: 'Sorry, I encountered an error connecting to the AI Coach.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) { console.error(err); }
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
      if (text) setInput(prev => prev ? `${prev} ${text}` : text);
    } catch (err) { console.error(err); } finally { setIsTranscribing(false); }
  };

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }} className="items-center justify-center">
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        {/* Premium Chat Header */}
        <View style={{ gap: 12 }} className="px-6 py-4 flex-row justify-between items-center border-b border-white/5">
          <View style={{ gap: 12 }} className="flex-row items-center">
            <View className="w-10 h-10 bg-indigo-500/20 rounded-2xl items-center justify-center border border-indigo-500/30">
              <Sparkles size={20} color={Theme.colors.primaryLight} />
            </View>
            <View>
              <Text className="text-white text-lg font-bold">MindFuel AI</Text>
              <View className="flex-row items-center space-x-1">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Active Now</Text>
              </View>
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              className={`mb-6 flex-row items-end space-x-3 ${
                item.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <View className={`w-8 h-8 rounded-full items-center justify-center ${
                item.role === 'user' ? 'bg-indigo-500/20' : 'bg-slate-700/50'
              } border border-white/5`}>
                {item.role === 'user' ? (
                  <User size={14} color={Theme.colors.primaryLight} />
                ) : (
                  <Bot size={14} color={Theme.colors.text} />
                )}
              </View>
              
              <View
                style={{ maxWidth: '80%' }}
                className={`rounded-3xl px-5 py-4 ${
                  item.role === 'user'
                    ? 'bg-indigo-600 rounded-tr-none shadow-lg shadow-indigo-600/30'
                    : item.role === 'system'
                    ? 'bg-rose-500/10 border border-rose-500/20 rounded-tl-none'
                    : 'bg-slate-800/60 border border-white/5 rounded-tl-none shadow-sm'
                }`}
              >
                <Text
                  className={`text-sm leading-6 ${
                    item.role === 'user' ? 'text-white font-medium' : 'text-slate-200'
                  }`}
                >
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View className="flex-row items-center space-x-3 mb-6">
                <View className="w-8 h-8 rounded-full bg-slate-700/50 items-center justify-center border border-white/5">
                  <Bot size={14} color={Theme.colors.text} />
                </View>
                <View className="bg-slate-800/60 border border-white/5 rounded-3xl rounded-tl-none px-5 py-4 flex-row items-center space-x-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-50" />
                  <View className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-70" />
                  <View className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                </View>
              </View>
            ) : null
          }
        />

        <View style={{ paddingBottom: 90 }} className="px-6 py-4 border-t border-white/5 bg-slate-900">
          <View className="flex-row items-center bg-slate-800/50 rounded-2xl px-4 border border-white/5">
            <TouchableOpacity 
              onPress={recording ? stopRecording : startRecording}
              className="mr-2"
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={Theme.colors.primaryLight} />
              ) : recording ? (
                <Square size={18} color="#f43f5e" fill="#f43f5e" />
              ) : (
                <Mic size={18} color={Theme.colors.primaryLight} />
              )}
            </TouchableOpacity>
            
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
              placeholderTextColor="#64748b"
              className="flex-1 py-4 text-white text-base"
              multiline
              editable={!loading}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!input.trim() || loading}
              className={`w-10 h-10 rounded-xl items-center justify-center ${
                !input.trim() || loading ? 'bg-slate-700/50' : 'bg-indigo-600'
              }`}
            >
              <Send size={18} color={!input.trim() || loading ? '#64748b' : 'white'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
