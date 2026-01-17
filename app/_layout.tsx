import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react';
import 'react-native-reanimated';

import { useUserStore } from '@/stores/userStore';
import { Colors } from '@/constants/Colors';
import { AUTH_DISABLED } from '@/constants/FeatureFlags';
import SplashQuote from '@/components/SplashQuote';
import { SimpleToastContainer } from '@/components/Toast';
import { authService } from '@/services/backend';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom dark theme for Synapse
const SynapseTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.surfaceElevated,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { isAuthenticated, user, setUser } = useUserStore();
  const router = useRouter();
  const segments = useSegments();
  const [showSplash, setShowSplash] = useState(false); // DEBUG: disabled splash
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Listen to Supabase auth state changes
  useEffect(() => {
    if (AUTH_DISABLED) {
      setIsAuthChecked(true);
      return;
    }

    const unsubscribe = authService.onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          partnerId: authUser.partnerId,
          pairingCode: authUser.pairingCode,
        });
      } else {
        // Only clear user if we're sure they logged out (not just initial check)
        if (isAuthChecked) {
          setUser(null);
        }
      }
      setIsAuthChecked(true);
    });

    return () => unsubscribe();
  }, [isAuthChecked]);

  // Route protection logic
  const navigateToCorrectRoute = useCallback(() => {
    if (!loaded || showSplash || !isAuthChecked) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inExecutorGroup = segments[0] === '(executor)';
    const inSupporterGroup = segments[0] === '(supporter)';

    if (!isAuthenticated) {
      // Not authenticated - must be in auth group
      if (!inAuthGroup) {
        router.replace(AUTH_DISABLED ? '/(auth)' : '/(auth)/login');
      }
      return;
    }

    // User is authenticated
    if (!user?.role) {
      // No role selected - go to role selection
      if (!inAuthGroup || segments[1]) {
        router.replace('/(auth)');
      }
      return;
    }

    if (!user?.partnerId && !AUTH_DISABLED) {
      // Has role but not paired - go to pairing
      if (inAuthGroup && segments[1] !== 'pair') {
        router.replace('/(auth)/pair');
      } else if (!inAuthGroup) {
        router.replace('/(auth)/pair');
      }
      return;
    }

    if (AUTH_DISABLED && inAuthGroup && (segments[1] === 'login' || segments[1] === 'register')) {
      router.replace('/(auth)');
      return;
    }

    // Fully set up - go to role-specific view
    if (inAuthGroup) {
      const route = user.role === 'supporter' ? '/(supporter)' : '/(executor)';
      router.replace(route);
      return;
    }

    // Ensure user is in correct role group
    if (user.role === 'executor' && inSupporterGroup) {
      router.replace('/(executor)');
    } else if (user.role === 'supporter' && inExecutorGroup) {
      router.replace('/(supporter)');
    }
  }, [loaded, showSplash, isAuthChecked, isAuthenticated, user, segments, router]);

  useEffect(() => {
    navigateToCorrectRoute();
  }, [navigateToCorrectRoute]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <Text style={{ color: Colors.textPrimary }}>Loading Synapse...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, height: '100%' }}>
      <RootLayoutNav />
      {showSplash && <SplashQuote onComplete={handleSplashComplete} duration={3500} />}
      <SimpleToastContainer />
    </View>
  );
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={SynapseTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(executor)" />
        <Stack.Screen name="(supporter)" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.textPrimary,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
