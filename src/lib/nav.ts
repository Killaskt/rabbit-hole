import { createContext, useContext } from 'react';

export type ScreenName =
  | 'home'
  | 'vault'
  | 'new-session'
  | 'session'
  | 'quiz'
  | 'results'
  | 'review-session'
  | 'drill'
  | 'settings';

export interface NavCtx {
  navigate: (screen: ScreenName, params?: Record<string, string>) => void;
  replace: (screen: ScreenName, params?: Record<string, string>) => void;
  back: () => void;
  params: Record<string, string>;
}

export const NavContext = createContext<NavCtx>({
  navigate: () => {},
  replace: () => {},
  back: () => {},
  params: {},
});

export function useNav() { return useContext(NavContext); }
