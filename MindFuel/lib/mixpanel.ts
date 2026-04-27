import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;

// Initialize Mixpanel safely
let mixpanel: Mixpanel | null = null;

if (MIXPANEL_TOKEN) {
  mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
  mixpanel.init();
}

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (mixpanel) {
    mixpanel.track(eventName, properties);
  } else {
    if (__DEV__) {
      console.log(`[Mixpanel Dummy] ${eventName}`, properties);
    }
  }
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (mixpanel) {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.getPeople().set(traits);
    }
  }
};
