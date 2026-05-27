import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class ScreenTimeManager {
  static async requestPermissions() {
    if (Platform.OS === 'web') return true;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }

  // Start tracking a session (e.g. from AppState or a specific view)
  static async startTracking(sessionType: string = 'general') {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('mindfuel_session_start', Date.now().toString());
    await SecureStore.setItemAsync('mindfuel_session_type', sessionType);
  }

  // End tracking and return duration
  static async endTracking() {
    const SecureStore = await import('expo-secure-store');
    const startStr = await SecureStore.getItemAsync('mindfuel_session_start');
    const sessionType = await SecureStore.getItemAsync('mindfuel_session_type') || 'general';
    
    if (startStr) {
      const startTime = parseInt(startStr, 10);
      const durationMs = Date.now() - startTime;
      
      await SecureStore.deleteItemAsync('mindfuel_session_start');
      await SecureStore.deleteItemAsync('mindfuel_session_type');
      
      return { durationMs, sessionType };
    }
    return null;
  }

  // Trigger intercept if needed
  static async simulateAppUsageIntercept(appName: string = 'Instagram', delayMs: number = 3000) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    console.log(`[ScreenTimeManager] Scheduling intercept for ${appName} in ${delayMs}ms`);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Mindful Intercept',
        body: `You've been using ${appName} for a while. It's draining your focus energy. Tap to reset.`,
        data: { route: '/(tabs)/intercept', source: 'screentime', appName },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, delayMs / 1000),
      },
    });
  }
}
