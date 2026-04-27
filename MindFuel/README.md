# MindFuel Mobile

The mobile companion app for the MindFuel platform, built with Expo and React Native. Track your digital consumption on the go with voice logging, AI-powered content analysis, and personalized wellness coaching.

## Features

- **Quick Logging**: Effortlessly log your digital activity using presets or voice-to-text.
- **AI Content Analysis**: Instant feedback on the mental nutrition score of what you've consumed.
- **Voice Support**: Transcribe and analyze your thoughts hands-free.
- **Wellness Insights**: View your mood trends and mental scores directly on your mobile dashboard.
- **Cross-Platform Sync**: Seamlessly integrated with the MindFuel web application.

## Tech Stack

- **Framework**: [Expo](https://expo.dev) / React Native
- **Navigation**: Expo Router
- **State Management**: TanStack Query
- **Database/Auth**: Supabase
- **AI Services**: Integrated AI analysis via MindFuel API
- **Styling**: NativeWind (Tailwind for React Native)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configuration**:
   Ensure you have a `.env` file with:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. **Run the app**:
   ```bash
   npx expo start
   ```

4. **Testing**:
   Use the Expo Go app on your iOS/Android device to scan the QR code.

## Folder Overview

- `/app`: Main application screens and tabs.
- `/components`: Reusable mobile UI components.
- `/lib`: Supabase configuration, custom hooks, and shared services.
- `/theme`: Centralized design system and color palette.
- `/assets`: Images and media assets.
