import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.killaskt.rabbithole',
  appName: 'Rabbit Hole',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
};

export default config;
