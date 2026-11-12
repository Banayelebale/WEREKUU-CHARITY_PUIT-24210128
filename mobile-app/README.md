# Haven HMS — Android Mobile Application

The official mobile app for Haven Hostel Management System (HMS), built with React Native and Expo.

## Features
- Full access to all Haven HMS web features (Student registration, Room allocation, Check-ins/outs, Reports, Admin).
- Android hardware back-button navigation support.
- Native status bar and styling matching the Haven branding.
- Offline connection error detection with one-tap retry.
- Pull-to-refresh and smooth gesture navigation.

## Development Setup

1. Make sure dependencies are installed:
   ```bash
   cd mobile-app
   npm install
   ```

2. Point the app to your deployed Vercel URL or local dev server:
   - Create a `.env` file inside `mobile-app/` or export the environment variable:
     ```env
     EXPO_PUBLIC_API_URL=https://your-hms-deployment.vercel.app
     ```
   - For Android Emulator connecting to local host, use `http://10.0.2.2:3000`.

3. Start the Expo development server:
   ```bash
   npm start
   ```
   Or run directly on an Android device/emulator:
   ```bash
   npm run android
   ```

## Generating an Android APK

To build a standalone installable Android APK file:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Log in or create a free Expo account:
   ```bash
   eas login
   ```

3. Configure build profile in `eas.json`:
   ```bash
   eas build:configure
   ```

4. Build the Android APK:
   ```bash
   eas build -p android --profile preview
   ```
   Expo will build the `.apk` in the cloud and provide a direct download link to install on Android devices.
