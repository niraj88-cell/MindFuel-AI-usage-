import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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

  // MOCK: Simulate triggering an intercept after "detecting" excessive usage
  static async simulateAppUsageIntercept(appName: string = 'Instagram', delayMs: number = 3000) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    console.log(`[ScreenTimeManager] Scheduling mock intercept for ${appName} in ${delayMs}ms`);

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
        seconds: delayMs / 1000,
      },
    });
  }
}
