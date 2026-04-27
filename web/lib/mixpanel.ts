import mixpanel from 'mixpanel-browser';

// Only initialize if we have a token, otherwise use a dummy mode to prevent crashes
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let isInitialized = false;

export const initMixpanel = () => {
  if (typeof window !== 'undefined' && MIXPANEL_TOKEN && !isInitialized) {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV !== 'production',
      track_pageview: true,
      persistence: 'localStorage',
    });
    isInitialized = true;
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (isInitialized) {
    mixpanel.track(eventName, properties);
  } else {
    // Silent fail if mixpanel is not set up (prevents breaking the app for users who haven't configured it)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mixpanel Dummy] ${eventName}`, properties);
    }
  }
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (isInitialized) {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.people.set(traits);
    }
  }
};
