import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#444',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="◎ HOME" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="◈ VAULT" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#080808',
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 0,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 2,
    color: '#444',
  },
  tabLabelFocused: {
    color: '#ffffff',
  },
  tabDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 4,
  },
});
