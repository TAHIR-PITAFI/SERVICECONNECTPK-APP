import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Theme, setThemeColorsMode } from '../utils/Theme';
import { ThemeContextProvider, useTheme } from '../utils/ThemeContext';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get('window');
const SPLASH_DURATION = 2600; // ms

function SplashScreen({ onDone }) {
  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(20)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }, 350);

    // 3. Tagline fades in
    setTimeout(() => {
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 650);

    // 4. Fade out and finish
    setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }).start(() => onDone());
    }, SPLASH_DURATION - 420);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: screenOpacity, zIndex: 9999 }]}>
      <LinearGradient
        colors={['#0f1f5c', '#1a56db', '#3b82f6']}
        style={styles.splash}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circleTopLeft]} />
        <View style={[styles.circle, styles.circleBottomRight]} />

        {/* Logo */}
        <Animated.View style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Ionicons name="construct" size={42} color="#fff" />
            </View>
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[
          styles.splashTitle,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}>
          ServiceConnect PK
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.splashTagline, { opacity: tagOpacity }]}>
          Islamabad's Elite AI Service Orchestrator
        </Animated.Text>

        {/* Services row */}
        <Animated.View style={[styles.servicesRow, { opacity: tagOpacity }]}>
          {['🚰', '⚡', '❄️', '🪚', '🧹'].map((emoji, i) => (
            <Text key={i} style={styles.serviceEmoji}>{emoji}</Text>
          ))}
        </Animated.View>

        {/* Bottom badge */}
        <Animated.View style={[styles.badge, { opacity: tagOpacity }]}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>12 AI Agents · Powered by Llama 3.3</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

function RootContent() {
  const { theme } = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  // Synchronously update the static theme color getters during the render phase
  setThemeColorsMode(theme);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={Theme.colors.background} translucent={false} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="providers" />
        <Stack.Screen name="provider-detail" />
        <Stack.Screen name="booking-confirm" />
        <Stack.Screen name="follow-up" />
        <Stack.Screen name="dispute" />
        <Stack.Screen name="compare" />
        <Stack.Screen name="about" />
      </Stack>

      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <RootContent />
    </ThemeContextProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circleTopLeft: {
    width: width * 0.7,
    height: width * 0.7,
    top: -width * 0.2,
    left: -width * 0.25,
  },
  circleBottomRight: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: -width * 0.25,
    right: -width * 0.25,
  },
  logoWrap: {
    marginBottom: 28,
    alignItems: 'center',
  },
  logoOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: width < 360 ? 24 : 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  splashTagline: {
    fontSize: width < 360 ? 13 : 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  servicesRow: {
    flexDirection: 'row',
    marginTop: 36,
    gap: 14,
  },
  serviceEmoji: {
    fontSize: 26,
  },
  badge: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 48 : 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  badgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
});
