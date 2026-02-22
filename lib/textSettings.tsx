import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export const SCALE_STEPS = [1, 1.15, 1.3] as const;
export const SCALE_LABELS = ['NORMAL', 'LARGE', 'X-LARGE'] as const;

interface TextSettings { scaleIndex: number; bold: boolean }

interface TextSettingsCtx {
  scale: number;
  scaleIndex: number;
  scaleLabel: string;
  bold: boolean;
  canIncrease: boolean;
  canDecrease: boolean;
  setScaleIndex: (i: number) => void;
  toggleBold: () => void;
}

const DEFAULT: TextSettings = { scaleIndex: 0, bold: false };
const KEY = 'rh_text_settings';

export const TextSettingsContext = createContext<TextSettingsCtx>({
  scale: 1, scaleIndex: 0, scaleLabel: 'NORMAL', bold: false,
  canIncrease: true, canDecrease: false,
  setScaleIndex: () => {}, toggleBold: () => {},
});

export function useTextSettings() { return useContext(TextSettingsContext); }

export function TextSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TextSettings>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) });
    });
  }, []);

  const save = (s: TextSettings) => {
    setSettings(s);
    AsyncStorage.setItem(KEY, JSON.stringify(s));
  };

  const { scaleIndex, bold } = settings;

  return (
    <TextSettingsContext.Provider value={{
      scale: SCALE_STEPS[scaleIndex],
      scaleIndex,
      scaleLabel: SCALE_LABELS[scaleIndex],
      bold,
      canIncrease: scaleIndex < SCALE_STEPS.length - 1,
      canDecrease: scaleIndex > 0,
      setScaleIndex: (i) => save({ ...settings, scaleIndex: i }),
      toggleBold: () => save({ ...settings, bold: !bold }),
    }}>
      {children}
    </TextSettingsContext.Provider>
  );
}
