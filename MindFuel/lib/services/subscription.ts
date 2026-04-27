import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from '../supabase/client';

type CustomerInfo = any;
type Offering = any;

export type SubscriptionTier = 'free' | 'premium';

export interface UserSubscription {
  tier: SubscriptionTier;
  active_until: string | null;
  daily_log_limit: number;
}

// Initialize RevenueCat with user ID
export async function initSubscription(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
    }) || '';
    if (!apiKey) {
      console.warn('RevenueCat API key not configured');
      return;
    }
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
  } catch (error) {
    console.error('RevenueCat init error:', error);
  }
}

// Get current subscription status
export async function getSubscriptionStatus(): Promise<UserSubscription> {
  if (Platform.OS === 'web') {
    return { tier: 'free', active_until: null, daily_log_limit: 3 };
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    if (customerInfo.activeSubscriptions.length > 0) {
      const expirationDate = customerInfo.entitlements.active['premium']?.expirationDate;

      return {
        tier: 'premium',
        active_until: expirationDate || null,
        daily_log_limit: Infinity,
      };
    }

    return {
      tier: 'free',
      active_until: null,
      daily_log_limit: 3,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      tier: 'free',
      active_until: null,
      daily_log_limit: 3,
    };
  }
}

// Fetch current offerings from RevenueCat
export async function getOfferings(): Promise<{
  currentOffering: Offering | null;
  allOfferings: Record<string, Offering>;
}> {
  if (Platform.OS === 'web') return { currentOffering: null, allOfferings: {} };
  try {
    const offerings = await Purchases.getOfferings();
    return {
      currentOffering: offerings.current,
      allOfferings: offerings.all,
    };
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return {
      currentOffering: null,
      allOfferings: {},
    };
  }
}

// Purchase a product
export async function purchaseProduct(productIdentifier: string): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (Platform.OS === 'web') return { success: false, error: 'Web purchases not supported' };
  try {
    const { customerInfo } = await Purchases.purchaseProduct(productIdentifier);

    if (customerInfo.activeSubscriptions.includes(productIdentifier)) {
      await syncSubscriptionToSupabase(customerInfo);
      return { success: true, customerInfo };
    }

    return { success: false, error: 'Purchase not completed' };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'User cancelled' };
    }
    return { success: false, error: error.message };
  }
}

// Restore purchases
export async function restorePurchases(): Promise<{
  success: boolean;
  message: string;
}> {
  if (Platform.OS === 'web') return { success: false, message: 'Web restore not supported' };
  try {
    const customerInfo = await Purchases.restorePurchases();

    if (customerInfo.activeSubscriptions.length > 0) {
      await syncSubscriptionToSupabase(customerInfo);
      return { success: true, message: 'Subscription restored successfully' };
    }

    return { success: false, message: 'No active subscriptions found' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// Sync RevenueCat subscription to Supabase
async function syncSubscriptionToSupabase(customerInfo: CustomerInfo): Promise<void> {
  if (!customerInfo.activeSubscriptions.length) return;

  try {
    const userId = customerInfo.appUserID;

    // Update profile tier directly (no separate subscriptions table needed)
    await supabase
      .from('profiles')
      .update({ subscription_tier: 'premium' as any })
      .eq('id', userId);
  } catch (error) {
    console.error('Error syncing subscription:', error);
  }
}

// Check daily log limit
export async function canLogToday(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, daily_log_limit')
      .eq('id', userId)
      .single();

    if (!profile) {
      return { allowed: false, remaining: 0 };
    }

    if (profile.subscription_tier === 'premium') {
      return { allowed: true, remaining: Infinity };
    }

    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('mental_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const used = count || 0;
    const remaining = (profile.daily_log_limit || 3) - used;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error('Error checking log limit:', error);
    return { allowed: false, remaining: 0 };
  }
}

// Listen to subscription updates
export function setSubscriptionListener(
  listener: (customerInfo: CustomerInfo) => void
): () => void {
  if (Platform.OS === 'web') return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}
