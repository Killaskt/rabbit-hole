import { useState, useCallback } from 'react';
import { NavContext, ScreenName } from '@/lib/nav';
import { TextSettingsProvider } from '@/lib/textSettings';
import HomeScreen from '@/screens/HomeScreen';
import VaultScreen from '@/screens/VaultScreen';
import NewSessionScreen from '@/screens/NewSessionScreen';
import SessionScreen from '@/screens/SessionScreen';
import QuizScreen from '@/screens/QuizScreen';
import ResultsScreen from '@/screens/ResultsScreen';
import ReviewSessionScreen from '@/screens/ReviewSessionScreen';
import DrillScreen from '@/screens/DrillScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const MONO = '"Courier New", Courier, monospace';

interface HistoryEntry {
  screen: ScreenName;
  params: Record<string, string>;
}

const TAB_SCREENS: ScreenName[] = ['home', 'vault'];

export default function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([{ screen: 'home', params: {} }]);
  const cur = history[history.length - 1];

  const navigate = useCallback((screen: ScreenName, params: Record<string, string> = {}) => {
    setHistory(h => [...h, { screen, params }]);
  }, []);

  const replace = useCallback((screen: ScreenName, params: Record<string, string> = {}) => {
    setHistory(h => [...h.slice(0, -1), { screen, params }]);
  }, []);

  const back = useCallback(() => {
    setHistory(h => h.length > 1 ? h.slice(0, -1) : h);
  }, []);

  const isTab = TAB_SCREENS.includes(cur.screen);

  function renderScreen() {
    switch (cur.screen) {
      case 'home': return <HomeScreen />;
      case 'vault': return <VaultScreen />;
      case 'new-session': return <NewSessionScreen />;
      case 'session': return <SessionScreen />;
      case 'quiz': return <QuizScreen />;
      case 'results': return <ResultsScreen />;
      case 'review-session': return <ReviewSessionScreen />;
      case 'drill': return <DrillScreen />;
      case 'settings': return <SettingsScreen />;
    }
  }

  return (
    <NavContext.Provider value={{ navigate, replace, back, params: cur.params }}>
      <TextSettingsProvider>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#000', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {renderScreen()}
          </div>
          {isTab && (
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(8,8,8,0.98)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}>
              {TAB_SCREENS.map(tab => (
                <button
                  key={tab}
                  onClick={() => replace(tab)}
                  style={{
                    flex: 1,
                    padding: '16px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: MONO,
                    fontSize: 12,
                    letterSpacing: 2,
                    color: cur.screen === tab ? '#fff' : '#555',
                    boxShadow: cur.screen === tab ? 'inset 0 2px 0 #efff00' : 'none',
                  }}
                >
                  {tab === 'home' ? '◎  SURFACE' : '◈  VAULT'}
                </button>
              ))}
            </div>
          )}
        </div>
      </TextSettingsProvider>
    </NavContext.Provider>
  );
}
