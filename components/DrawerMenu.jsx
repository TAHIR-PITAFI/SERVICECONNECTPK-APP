import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Animated, ScrollView, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, wp, hp } from '../utils/Theme';
import { useTheme } from '../utils/ThemeContext';
import { formatSessionTime } from '../utils/chatStorage';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

export default function DrawerMenu({ visible, onClose, chatSessions = [], onLoadSession }) {
  const router  = useRouter();
  const slideX  = useRef(new Animated.Value(-DRAWER_W)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  const activeColors = theme === 'dark' ? {
    background: '#0b0f19',
    backgroundAlt: '#111827',
    surface: '#1f2937',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    border: '#374151',
    borderLight: '#1f2937',
    primaryGlass: 'rgba(59, 130, 246, 0.15)',
  } : {
    background: '#f0f4ff',
    backgroundAlt: '#e8eeff',
    surface: '#ffffff',
    textPrimary: '#0f1f5c',
    textSecondary: '#4b5a8a',
    textMuted: '#8892b8',
    border: '#dde3f5',
    borderLight: '#eef1fb',
    primaryGlass: 'rgba(26, 86, 219, 0.12)',
  };

  // Profile states
  const [role, setRole] = useState('customer');
  const [profileName, setProfileName] = useState('Guest User');
  const [profilePhone, setProfilePhone] = useState('');
  const [providerService, setProviderService] = useState('Plumber');
  const [providerSector, setProviderSector] = useState('G-11');

  useEffect(() => {
    async function loadProfile() {
      try {
        const savedRole = await AsyncStorage.getItem('@user_role') || 'customer';
        const savedName = await AsyncStorage.getItem('@user_name') || 'Guest User';
        const savedPhone = await AsyncStorage.getItem('@user_phone') || '';
        const savedService = await AsyncStorage.getItem('@provider_service') || 'Plumber';
        const savedSector = await AsyncStorage.getItem('@provider_sector') || 'G-11';

        setRole(savedRole);
        setProfileName(savedName);
        setProfilePhone(savedPhone);
        setProviderService(savedService);
        setProviderSector(savedSector);
      } catch (e) {
        console.warn('Failed to load profile inside drawer:', e);
      }
    }
    if (visible) {
      loadProfile();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -DRAWER_W,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const navigate = (path) => {
    onClose();
    setTimeout(() => router.push(path), 180);
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Panel */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideX }], backgroundColor: activeColors.surface }]}>
        {/* Header */}
        <LinearGradient colors={theme === 'dark' ? ['#0f172a', '#1e293b'] : ['#1e3a8a', '#3b82f6']} style={styles.drawerHeader}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="construct" size={22} color="#fff" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.drawerAppName}>ServiceConnect PK</Text>
              <Text style={styles.drawerTagline}>Islamabad's AI Service Hub</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={[styles.drawerBody, { backgroundColor: activeColors.surface }]} showsVerticalScrollIndicator={false}>
          {/* ── Profile Section ── */}
          <View style={[styles.profileBox, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '850', color: activeColors.textPrimary }}>👤 Profile Workspace</Text>
            <Text style={{ fontSize: 11, color: activeColors.textSecondary, marginTop: 4, lineHeight: 16 }}>Manage your dynamic Customer or Provider profile directly inside the bottom tabs.</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => { onClose(); navigate('/(tabs)/profile'); }}>
              <Ionicons name="person-circle-outline" size={15} color="#fff" />
              <Text style={styles.loginBtnText}>Open Profile Tab</Text>
            </TouchableOpacity>
          </View>

          {/* ── Main Navigation ── */}
          <Text style={[styles.sectionLabel, { color: activeColors.textMuted }]}>MENU</Text>

          {role === 'provider' && (
            <TouchableOpacity style={styles.menuItem} onPress={() => navigate('/provider-dashboard')} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: theme === 'dark' ? '#0c4a6e' : '#e0f2fe' }]}>
                <Ionicons name="speedometer-outline" size={20} color={Theme.colors.info} />
              </View>
              <Text style={[styles.menuLabel, { color: activeColors.textPrimary }]}>Provider Dashboard</Text>
              <Ionicons name="chevron-forward" size={16} color={activeColors.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={() => navigate('/(tabs)/chat')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: activeColors.primaryGlass }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Theme.colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: activeColors.textPrimary }]}>Home — Book Service</Text>
            <Ionicons name="chevron-forward" size={16} color={activeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigate('/(tabs)/bookings')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme === 'dark' ? '#064e3b' : '#ecfdf5' }]}>
              <Ionicons name="calendar-outline" size={20} color={Theme.colors.success} />
            </View>
            <Text style={[styles.menuLabel, { color: activeColors.textPrimary }]}>My Bookings</Text>
            <Ionicons name="chevron-forward" size={16} color={activeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigate('/(tabs)/trace')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme === 'dark' ? '#78350f' : '#fef3c7' }]}>
              <Ionicons name="analytics-outline" size={20} color={Theme.colors.warning} />
            </View>
            <Text style={[styles.menuLabel, { color: activeColors.textPrimary }]}>Agent Trace Log</Text>
            <Ionicons name="chevron-forward" size={16} color={activeColors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigate('/about')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: theme === 'dark' ? '#581c87' : '#f3e8ff' }]}>
              <Ionicons name="information-circle-outline" size={20} color={Theme.colors.accent} />
            </View>
            <Text style={[styles.menuLabel, { color: activeColors.textPrimary }]}>About App</Text>
            <Ionicons name="chevron-forward" size={16} color={activeColors.textMuted} />
          </TouchableOpacity>

          {/* ── Previous Chats ── */}
          <View style={[styles.divider, { backgroundColor: activeColors.borderLight }]} />
          <Text style={[styles.sectionLabel, { color: activeColors.textMuted }]}>PREVIOUS CHATS</Text>

          {chatSessions.length === 0 ? (
            <View style={styles.emptyChats}>
              <Ionicons name="chatbubble-outline" size={28} color={activeColors.textMuted} />
              <Text style={[styles.emptyChatsText, { color: activeColors.textSecondary }]}>No previous chats yet.</Text>
              <Text style={[styles.emptyChatsHint, { color: activeColors.textMuted }]}>Start a conversation to save history!</Text>
            </View>
          ) : (
            chatSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.chatHistoryItem}
                onPress={() => {
                  onLoadSession?.(session);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: activeColors.backgroundAlt }]}>
                  <Ionicons name="time-outline" size={18} color={activeColors.textSecondary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.chatPreview, { color: activeColors.textPrimary }]} numberOfLines={1}>
                    {session.preview || 'Chat session'}
                  </Text>
                  <Text style={[styles.chatTime, { color: activeColors.textMuted }]}>{formatSessionTime(session.timestamp)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* ── Footer ── */}
          <View style={[styles.divider, { backgroundColor: activeColors.borderLight }]} />
          <View style={styles.drawerFooter}>
            <Text style={[styles.footerText, { color: activeColors.textMuted }]}>ServiceConnect PK v1.0</Text>
            <Text style={[styles.footerText, { color: activeColors.textMuted }]}>Built for Google Hackathon 2026 🏆</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 31, 92, 0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#fff',
    ...Theme.shadows.premium,
    zIndex: 1000,
  },
  drawerHeader: {
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAppName: {
    fontSize: Theme.typography.md,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  drawerTagline: {
    fontSize: Theme.typography.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerBody: {
    flex: 1,
    paddingTop: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.textMuted,
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingVertical: 10,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: Theme.typography.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.borderLight,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chatPreview: {
    fontSize: Theme.typography.sm,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  chatTime: {
    fontSize: Theme.typography.xs,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  emptyChats: {
    alignItems: 'center',
    padding: 24,
  },
  emptyChatsText: {
    fontSize: Theme.typography.sm,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginTop: 10,
  },
  emptyChatsHint: {
    fontSize: Theme.typography.xs,
    color: Theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  drawerFooter: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Theme.typography.xs,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileBox: {
    margin: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3f5',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  profileRole: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 10,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    marginTop: 10,
  },
  loginBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
});
