export const BRAND = {
  primary: '#1B6EA8',
  accent: '#E8621A',
  success: '#34C759',
};

export const makeTheme = (dark: boolean) => ({
  bg: dark ? '#1A1A1A' : '#F4F6F9',
  surface: dark ? '#252525' : '#FFFFFF',
  header: dark ? '#111111' : '#FFFFFF',
  tabBar: dark ? '#1E1E1E' : '#FFFFFF',
  rowIcon: dark ? '#2C2C2C' : '#EEF2F6',
  divider: dark ? '#303030' : '#E5E9EF',
  border: dark ? '#2E2E2E' : '#DDE2EA',
  text: dark ? '#FFFFFF' : '#111827',
  muted: dark ? '#888888' : '#6B7280',
  ...BRAND,
  barStyle: (dark ? 'light-content' : 'dark-content') as
    | 'light-content'
    | 'dark-content',
});

export type Theme = ReturnType<typeof makeTheme>;

export type Tab = 'READ' | 'WRITE' | 'OTHER';
