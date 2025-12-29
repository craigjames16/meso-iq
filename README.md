# Meso IQ - React Native App

Native mobile version of Simple Workout Tracker, built with React Native CLI.

## Project Structure

```
src/
├── api/              # API client and endpoints
├── config/           # Environment configuration
├── context/          # React contexts (Auth)
├── hooks/            # Custom React hooks
├── navigation/       # React Navigation setup
├── screens/          # Screen components
│   ├── auth/         # Authentication screens
│   └── main/         # Main app screens
├── services/         # Business logic services
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Setup

### Prerequisites

- Node.js >= 20
- React Native development environment set up
- Xcode (for iOS)
- Android Studio (for Android)

### Installation

1. Install dependencies:
```bash
npm install
```

2. For iOS, install CocoaPods dependencies:
```bash
cd ios && pod install && cd ..
```

### Running the App

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Start Metro bundler:**
```bash
npm start
```

## Configuration

### API URL

The API URL is configured in `src/config/env.ts`. By default, it's set to `http://localhost:3000`.

**Important notes:**
- For iOS simulator: `http://localhost:3000` works
- For Android emulator: Use `http://10.0.2.2:3000` (or your computer's IP)
- For physical devices: Use your computer's IP address (e.g., `http://192.168.1.100:3000`)

Update the `API_URL` constant in `src/config/env.ts` as needed.

## Authentication

The app uses token-based authentication. The authentication flow:

1. User signs in/signs up
2. Token is stored securely using AsyncStorage
3. Token is included in API requests via Authorization header
4. Auth state is managed by `AuthContext`

### Backend Requirements

**Note:** The NextJS backend currently uses NextAuth with cookie-based sessions. For the mobile app to work, you'll need to either:

1. **Modify NextAuth to accept Bearer tokens** - Update the NextJS API to accept `Authorization: Bearer <token>` headers
2. **Create custom auth endpoints** - Create mobile-specific endpoints that return JWT tokens instead of setting cookies

The auth service (`src/services/authService.ts`) is structured to work with token-based authentication. Once the backend is updated, the integration should work seamlessly.

## Navigation

The app uses React Navigation v6 with:
- **AuthNavigator**: Handles sign in/sign up screens
- **MainNavigator**: Handles authenticated app screens
- **AppNavigator**: Root navigator that switches between auth and main based on authentication state

## Next Steps

1. Update the NextJS backend to support token-based authentication for mobile
2. Migrate pages from the NextJS app one by one
3. Add Google OAuth support for mobile (using `@react-native-google-signin/google-signin`)
4. Implement token refresh mechanism
5. Add loading states and error boundaries
6. Style screens to match the web app design

## Development

The project is set up with TypeScript. All new code should be written in TypeScript.

### Code Structure

- **Screens**: Located in `src/screens/`, organized by feature
- **Components**: Can be added to `src/components/` as needed
- **Services**: Business logic and API calls in `src/services/`
- **Types**: TypeScript definitions in `src/types/`

## Troubleshooting

### iOS Build Issues

If you encounter build issues on iOS:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Build Issues

If you encounter build issues on Android:
```bash
cd android
./gradlew clean
cd ..
```

### Metro Bundler Issues

Clear Metro cache:
```bash
npm start -- --reset-cache
```
