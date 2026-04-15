import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rabbithole.app',
  appName: 'Rabbit Hole',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
};

export default config;
