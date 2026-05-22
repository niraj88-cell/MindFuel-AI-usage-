import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, ArrowRight, X } from 'lucide-react-native';
import { Theme } from '../../theme';

export default function InterceptScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'breathe' | 'intent'>('breathe');
  const [timeLeft, setTimeLeft] = useState(5);
  const [intent, setIntent] = useState('');
  
  // Animation value for breathing effect
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (step === 'breathe') {
      // Breathing animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      ).start();

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setStep('intent');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        scaleAnim.stopAnimation();
      };
    }
  }, [step, scaleAnim]);

  const handleContinue = () => {
    // Navigate away, log the intention, etc.
    router.replace('/');
  };

  const handleDisconnect = () => {
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background, padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <ShieldAlert size={48} color={Theme.colors.textMuted} />
      </View>

      {step === 'breathe' ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8 }}>Pause.</Text>
          <Text style={{ fontSize: 16, color: Theme.colors.textMuted, marginBottom: 48 }}>Take a deep breath before proceeding.</Text>
          
          <Animated.View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 2,
            borderColor: Theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: scaleAnim }]
          }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: Theme.colors.text }}>{timeLeft}</Text>
          </Animated.View>
        </View>
      ) : (
        <View style={{ width: '100%' }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8, textAlign: 'center' }}>Why open this?</Text>
          <Text style={{ fontSize: 14, color: Theme.colors.textMuted, marginBottom: 32, textAlign: 'center' }}>Mindless scrolling steals your time.</Text>
          
          <View style={{ backgroundColor: Theme.colors.card, borderRadius: Theme.radius.lg, padding: 24, borderWidth: 1, borderColor: Theme.colors.border }}>
            <TextInput
              style={{
                backgroundColor: Theme.colors.background,
                color: Theme.colors.text,
                height: 56,
                borderRadius: Theme.radius.md,
                borderWidth: 1,
                borderColor: Theme.colors.border,
                paddingHorizontal: 16,
                fontSize: 16,
                marginBottom: 24,
                textAlign: 'center'
              }}
              placeholder="e.g., Checking a message"
              placeholderTextColor={Theme.colors.textMuted}
              value={intent}
              onChangeText={setIntent}
              autoFocus
            />
            
            <TouchableOpacity 
              onPress={handleContinue}
              disabled={!intent.trim()}
              style={{
                backgroundColor: Theme.colors.primary,
                height: 56,
                borderRadius: Theme.radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                opacity: !intent.trim() ? 0.5 : 1
              }}
            >
              <Text style={{ color: Theme.colors.background, fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>Continue to App</Text>
              <ArrowRight size={20} color={Theme.colors.background} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleDisconnect}
              style={{
                height: 56,
                borderRadius: Theme.radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: Theme.colors.textMuted, fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>Close & Disconnect</Text>
              <X size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
