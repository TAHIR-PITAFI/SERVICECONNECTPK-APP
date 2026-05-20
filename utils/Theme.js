import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Responsive scaling helpers
export const wp = (percent) => (SCREEN_W * percent) / 100;
export const hp = (percent) => (SCREEN_H * percent) / 100;
export const normalize = (size) => {
  const scale = SCREEN_W / 390;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

let currentTheme = 'light';

export const setThemeColorsMode = (mode) => {
  currentTheme = mode;
};

export const Theme = {
  colors: {
    // Primary palette
    get primary() { return '#1a56db'; },
    get primaryLight() { return '#3b82f6'; },
    get primaryDark() { return '#1239a8'; },
    get primaryGlass() { return currentTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(26, 86, 219, 0.12)'; },

    // Accent
    get accent() { return '#7c3aed'; },
    get accentLight() { return '#a78bfa'; },

    // Success / Warning / Error
    get success() { return '#059669'; },
    get successLight() { return currentTheme === 'dark' ? '#064e3b' : '#d1fae5'; },
    get warning() { return '#d97706'; },
    get warningLight() { return currentTheme === 'dark' ? '#78350f' : '#fef3c7'; },
    get error() { return '#dc2626'; },
    get errorLight() { return currentTheme === 'dark' ? '#7f1d1d' : '#fee2e2'; },
    get info() { return '#0284c7'; },
    get infoLight() { return currentTheme === 'dark' ? '#0c4a6e' : '#e0f2fe'; },

    // Backgrounds
    get background() { return currentTheme === 'dark' ? '#0b0f19' : '#f0f4ff'; },
    get backgroundAlt() { return currentTheme === 'dark' ? '#111827' : '#e8eeff'; },
    get surface() { return currentTheme === 'dark' ? '#1f2937' : '#ffffff'; },
    get surfaceAlt() { return currentTheme === 'dark' ? '#182232' : '#f8faff'; },
    get surfaceElevated() { return currentTheme === 'dark' ? '#374151' : '#ffffff'; },
    get card() { return currentTheme === 'dark' ? '#1f2937' : '#ffffff'; },

    // Text
    get textPrimary() { return currentTheme === 'dark' ? '#f8fafc' : '#0f1f5c'; },
    get textSecondary() { return currentTheme === 'dark' ? '#cbd5e1' : '#4b5a8a'; },
    get textMuted() { return currentTheme === 'dark' ? '#64748b' : '#8892b8'; },
    get textInverse() { return '#ffffff'; },

    // Borders
    get border() { return currentTheme === 'dark' ? '#374151' : '#dde3f5'; },
    get borderLight() { return currentTheme === 'dark' ? '#1f2937' : '#eef1fb'; },

    // Tab bar
    get tabActive() { return '#3b82f6'; },
    get tabInactive() { return currentTheme === 'dark' ? '#64748b' : '#8892b8'; },
    get tabBackground() { return currentTheme === 'dark' ? '#111827' : '#ffffff'; },

    // Chat bubbles
    get userBubble() { return '#1a56db'; },
    get botBubble() { return currentTheme === 'dark' ? '#1f2937' : '#ffffff'; },
    get userText() { return '#ffffff'; },
    get botText() { return currentTheme === 'dark' ? '#f8fafc' : '#0f1f5c'; },

    // Gradients (used as arrays)
    get gradientPrimary() { return currentTheme === 'dark' ? ['#1e3a8a', '#0f172a'] : ['#1a56db', '#1239a8']; },
    get gradientAccent() { return currentTheme === 'dark' ? ['#6d28d9', '#1e3a8a'] : ['#7c3aed', '#1a56db']; },
    get gradientSuccess() { return currentTheme === 'dark' ? ['#065f46', '#047857'] : ['#059669', '#0d9488']; },
    get gradientDark() { return ['#0f1f5c', '#1a3a8c']; },
    get gradientCard() { return currentTheme === 'dark' ? ['#1f2937', '#111827'] : ['#f0f4ff', '#e8eeff']; },

    // Agent identity colors
    get agents() {
      return {
        intent:     '#a78bfa',
        discovery:  '#60a5fa',
        ranking:    '#34d399',
        pricing:    '#fbbf24',
        booking:    '#f87171',
      };
    }
  },

  typography: {
    xs:    normalize(11),
    sm:    normalize(13),
    base:  normalize(15),
    md:    normalize(17),
    lg:    normalize(19),
    xl:    normalize(22),
    xxl:   normalize(26),
    xxxl:  normalize(32),
    huge:  normalize(42),
  },

  spacing: {
    xs:    4,
    sm:    8,
    md:    12,
    base:  16,
    lg:    20,
    xl:    24,
    xxl:   32,
    xxxl:  48,
  },

  borderRadius: {
    xs:   6,
    sm:   10,
    md:   14,
    lg:   20,
    xl:   28,
    xxl:  36,
    full: 999,
  },

  shadows: {
    soft: {
      shadowColor: '#1a56db',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#1a56db',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 14,
      elevation: 4,
    },
    premium: {
      shadowColor: '#1a56db',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      shadowColor: '#0f1f5c',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
  },
};

// Backward compat exports
export const Colors = {
  get primary() { return Theme.colors.primary; },
  get primaryLight() { return Theme.colors.primaryLight; },
  get primaryDark() { return Theme.colors.primaryDark; },
  get primaryGlass() { return Theme.colors.primaryGlass; },
  get accent() { return Theme.colors.accent; },
  get accentLight() { return Theme.colors.accentLight; },
  get success() { return Theme.colors.success; },
  get successLight() { return Theme.colors.successLight; },
  get warning() { return Theme.colors.warning; },
  get warningLight() { return Theme.colors.warningLight; },
  get error() { return Theme.colors.error; },
  get errorLight() { return Theme.colors.errorLight; },
  get info() { return Theme.colors.info; },
  get infoLight() { return Theme.colors.infoLight; },
  get background() { return Theme.colors.background; },
  get backgroundAlt() { return Theme.colors.backgroundAlt; },
  get surface() { return Theme.colors.surface; },
  get surfaceAlt() { return Theme.colors.surfaceAlt; },
  get surfaceElevated() { return Theme.colors.surfaceElevated; },
  get card() { return Theme.colors.card; },
  get textPrimary() { return Theme.colors.textPrimary; },
  get textSecondary() { return Theme.colors.textSecondary; },
  get textMuted() { return Theme.colors.textMuted; },
  get textInverse() { return Theme.colors.textInverse; },
  get border() { return Theme.colors.border; },
  get borderLight() { return Theme.colors.borderLight; },
  get tabActive() { return Theme.colors.tabActive; },
  get tabInactive() { return Theme.colors.tabInactive; },
  get tabBackground() { return Theme.colors.tabBackground; },
  get userBubble() { return Theme.colors.userBubble; },
  get botBubble() { return Theme.colors.botBubble; },
  get userText() { return Theme.colors.userText; },
  get botText() { return Theme.colors.botText; },
  get gradientPrimary() { return Theme.colors.gradientPrimary; },
  get gradientAccent() { return Theme.colors.gradientAccent; },
  get gradientSuccess() { return Theme.colors.gradientSuccess; },
  get gradientDark() { return Theme.colors.gradientDark; },
  get gradientCard() { return Theme.colors.gradientCard; },
  get agents() { return Theme.colors.agents; },
  get text() { return Theme.colors.textPrimary; },
  get textMuted() { return Theme.colors.textMuted; },
};

export const Typography = {
  fontSize: Theme.typography,
};

export const Spacing = Theme.spacing;
export const BorderRadius = Theme.borderRadius;
export const Shadows = Theme.shadows;

export default Theme;
