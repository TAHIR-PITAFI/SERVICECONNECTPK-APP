import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setThemeColorsMode } from './Theme';

export const ThemeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem('@user_theme');
        if (savedTheme) {
          setTheme(savedTheme);
          setThemeColorsMode(savedTheme); // Sync initial load with static Theme colors
        }
      } catch (e) {
        console.warn('Failed to load theme preference:', e);
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
      setThemeColorsMode(nextTheme); // Instantly synchronize static Theme getters
      await AsyncStorage.setItem('@user_theme', nextTheme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
