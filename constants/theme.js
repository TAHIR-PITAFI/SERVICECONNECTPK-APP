export const Theme = {
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
  },
  borderRadius: {
    sm: 8, md: 12, lg: 20, full: 999,
  },
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    premium: {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    }
  }
};
