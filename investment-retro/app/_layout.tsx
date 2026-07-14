import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GoalProvider } from '@/context/GoalContext';
import { PortfolioProvider } from '@/context/PortfolioContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { initializing, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (initializing) {
      return;
    }

    const onLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !onLoginScreen) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [initializing, isAuthenticated, router, segments]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#222222" />
      </View>
    );
  }

  return (
    <GoalProvider>
      <PortfolioProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="journal-detail"
              options={{ title: '', headerBackTitle: 'Journal' }}
            />
            <Stack.Screen
              name="ask-ai"
              options={{ title: 'Ask AI', headerBackTitle: 'Insights' }}
            />
            <Stack.Screen
              name="holdings"
              options={{ title: '', headerBackTitle: 'Home' }}
            />
            <Stack.Screen
              name="add-goal"
              options={{
                title: '新增目標',
                headerBackTitle: 'Me',
                presentation: 'modal',
              }}
            />
          </Stack>
        </ThemeProvider>
      </PortfolioProvider>
    </GoalProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F7',
  },
});
