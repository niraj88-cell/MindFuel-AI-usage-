import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { initSubscription, setSubscriptionListener } from '../services/subscription';

export function useSubscriptionInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initSubscription(user.id);
    }

    const unsubscribe = setSubscriptionListener((customerInfo: any) => {
      console.log('Subscription updated:', customerInfo);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);
}
