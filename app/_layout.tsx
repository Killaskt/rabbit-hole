import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { initGameState } from '../lib/gameState';
import { TextSettingsProvider } from '../lib/textSettings';

export default function RootLayout() {
  useEffect(() => {
    initGameState();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <TextSettingsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="new-session" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="session" options={{ animation: 'fade' }} />
        <Stack.Screen name="quiz" options={{ animation: 'fade' }} />
        <Stack.Screen name="results" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review-session" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="drill" options={{ animation: 'slide_from_right' }} />
      </Stack>
      </TextSettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
