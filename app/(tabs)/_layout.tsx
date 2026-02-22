import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {focused ? '> ' : ''}{label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIconStyle: styles.tabIconContainer,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="HOME" focused={focused} /> }}
      />
      <Tabs.Screen
        name="vault"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="VAULT" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#080808',
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
  },
  tabIconContainer: {
    width: '100%',
    height: 44,
    overflow: 'visible',
  },
  tabIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabLabel: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 2,
    color: '#444',
  },
  tabLabelFocused: {
    color: '#fff',
  },
});
