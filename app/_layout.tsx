import React, { useEffect } from 'react';
import { Platform, TouchableOpacity, LogBox, View } from 'react-native';
import { Stack, ThemeProvider, DefaultTheme, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../src/theme';

// Disable warning toast banner on screen during development
LogBox.ignoreAllLogs();

SplashScreen.preventAutoHideAsync().catch(() => {});

const AppLightTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    background: '#E5E5EB',
    card: '#FFFFFF',
    text: '#111114',
    border: 'rgba(0, 0, 0, 0.08)',
    primary: colors.lime,
    notification: colors.matchedHighlight,
  },
};

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    Anton: require('../assets/fonts/Anton-Regular.ttf'),
    'Anton-Regular': require('../assets/fonts/Anton-Regular.ttf'),
    BebasNeue: require('../assets/fonts/BebasNeue-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#E5E5EB' }} />;
  }

  const renderFastBackButton = () => (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ marginRight: 10, padding: 4 }}
      accessibilityLabel="Back"
      accessibilityRole="button"
    >
      <Ionicons name="arrow-back" size={22} color="#111114" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#E5E5EB' }}>
      <ThemeProvider value={AppLightTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#E5E5EB',
            },
            headerTintColor: '#111114',
            headerShadowVisible: false,
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
              color: '#111114',
            },
            contentStyle: {
              backgroundColor: '#E5E5EB',
            },
            statusBarTranslucent: true,
            animation: 'slide_from_right',
          }}
        >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="formulas/index"
          options={{
            title: 'All 600 Formulas',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="formulas/[id]"
          options={{
            title: 'Formula Study',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            title: 'Explore & Search',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="helping-verbs"
          options={{
            title: 'Helping Verbs',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="ai-teacher"
          options={{
            title: 'AI English Tutor',
            headerLeft: renderFastBackButton,
            headerStyle: {
              backgroundColor: '#E5E5EB',
            },
            headerTintColor: '#111114',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
              color: '#111114',
            },
            contentStyle: {
              backgroundColor: '#E5E5EB',
            },
          }}
        />
        <Stack.Screen
          name="talk-to-ai"
          options={{
            title: 'AI Speaking Teacher',
            headerShown: false,
            contentStyle: {
              backgroundColor: '#E5E5EB',
            },
          }}
        />
        <Stack.Screen
          name="ai-corrector"
          options={{
            title: 'Sentence Corrector',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="conversation-practice"
          options={{
            title: 'Speaking Practice',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="practice"
          options={{
            title: 'Daily Practice',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="bookmarks"
          options={{
            title: 'Saved Formulas',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="progress"
          options={{
            title: 'Learning Progress',
            headerLeft: renderFastBackButton,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerLeft: renderFastBackButton,
          }}
        />
      </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
