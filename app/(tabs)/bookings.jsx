import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllBookings } from '../../agents/bookingAgent';
import { Theme } from '../../utils/Theme';
import { useTheme } from '../../utils/ThemeContext';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  confirmed:  { color: Theme.colors.success, bg: Theme.colors.successLight, label: 'Confirmed',  icon: 'checkmark-circle' },
  pending:    { color: Theme.colors.warning, bg: Theme.colors.warningLight, label: 'Pending',    icon: 'time' },
  reminded:   { color: Theme.colors.info,    bg: Theme.colors.infoLight,    label: 'Reminded',   icon: 'notifications' },
  en_route:   { color: Theme.colors.primary, bg: Theme.colors.primaryGlass, label: 'En Route',   icon: 'car' },
  completed:  { color: Theme.colors.textMuted, bg: '#f1f5f9',               label: 'Completed',  icon: 'checkmark-done-circle' },
  cancelled:  { color: Theme.colors.error,   bg: Theme.colors.errorLight,   label: 'Cancelled',  icon: 'close-circle' },
};

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);
  const [phone, setPhone] = useState(null);
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

  const load = useCallback(async () => {
    try {
      const savedRole = await AsyncStorage.getItem('@user_role');
      const savedPhone = await AsyncStorage.getItem('@user_phone');
      setRole(savedRole);
      setPhone(savedPhone);

      const all = await getAllBookings();
      if (savedRole === 'customer' && savedPhone) {
        // Filter customer bookings by verified WhatsApp phone number
        const customerBookings = all.filter(
          b => b.userWhatsApp === savedPhone || b.intent?.userWhatsApp === savedPhone
        );
        setBookings(customerBookings);
      } else {
        setBookings(all);
      }
    } catch (e) {
      console.warn('Failed to load role and bookings:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderBooking = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.confirmed;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
        onPress={() => router.push({ pathname: '/booking-confirm', params: { bookingJson: JSON.stringify(item) } })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.emoji}>{item.service?.emoji || '🛠️'}</Text>
            <View>
              <Text style={[styles.serviceName, { color: activeColors.textPrimary }]}>{item.service?.label || 'Service'}</Text>
              <Text style={styles.bookingId}>#{item.id}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'en_route' ? activeColors.primaryGlass : cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: activeColors.borderLight }]} />

        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={13} color={activeColors.textMuted} />
            <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>{item.provider?.name || 'Provider'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={13} color={activeColors.textMuted} />
            <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Sector {item.location || item.provider?.sector}</Text>
          </View>
          {item.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="home-outline" size={13} color={activeColors.textMuted} />
              <Text style={[styles.infoText, { color: activeColors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={13} color={activeColors.textMuted} />
            <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Slot: {item.slot}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={13} color={activeColors.textMuted} />
            <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Estimate: PKR {item.cost?.estimated}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: activeColors.borderLight }]} />

        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Inspect Live Agent Logs & Routing →</Text>
          <Ionicons name="chevron-forward" size={14} color={Theme.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  // ── GUEST MODE VIEW ──
  if (!role) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSub}>Guest Mode Active</Text>
          </View>
          <View style={styles.countBadge}>
            <Ionicons name="lock-closed" size={20} color="#fff" />
          </View>
        </LinearGradient>
        
        <View style={styles.centerContainer}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="shield-half-outline" size={54} color={Theme.colors.primary} />
          </View>
          <Text style={styles.lockTitle}>Access Restricted</Text>
          <Text style={styles.lockDesc}>
            Assalam-o-Alaikum! You are currently exploring ServiceConnect PK in Guest Mode. Register or log in to book top-tier professionals and track your service history.
          </Text>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => router.push('/login')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.gradientBtn}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Log In / Register Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PROVIDER MODE VIEW ──
  if (role === 'provider') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
        <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSub}>Provider Workspace Restricted</Text>
          </View>
          <View style={styles.countBadge}>
            <Ionicons name="construct" size={20} color="#fff" />
          </View>
        </LinearGradient>
        
        <View style={[styles.centerContainer, { backgroundColor: activeColors.background }]}>
          <View style={[styles.lockIconCircle, { backgroundColor: activeColors.primaryGlass }]}>
            <Ionicons name="speedometer-outline" size={54} color={Theme.colors.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: activeColors.textPrimary }]}>Provider Workspace</Text>
          <Text style={[styles.lockDesc, { color: activeColors.textSecondary }]}>
            Welcome back! You are logged in as a Service Provider. All active booking requests, completed orders, and earnings analytics must be managed from your Provider Dashboard.
          </Text>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => router.push('/provider-dashboard')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#0284c7', '#0369a1']} style={styles.gradientBtn}>
              <Ionicons name="briefcase-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Open Provider Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
      <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>{bookings.length} verified bookings · Pull to refresh</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{bookings.length}</Text>
        </View>
      </LinearGradient>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: activeColors.surface }]}><Ionicons name="calendar-outline" size={44} color={activeColors.textMuted} /></View>
          <Text style={[styles.emptyTitle, { color: activeColors.textPrimary }]}>No Bookings Yet</Text>
          <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>Go to the Book tab and request a service to get started!</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Theme.colors.background },
  header:       { paddingHorizontal: 20, paddingVertical: 18, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:  { fontSize: Theme.typography.xl, fontWeight: '900', color: '#fff' },
  headerSub:    { fontSize: Theme.typography.xs, color: 'rgba(255,255,255,0.72)', fontWeight: '600', marginTop: 2 },
  countBadge:   { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  countText:    { fontSize: Theme.typography.lg, fontWeight: '900', color: '#fff' },
  list:         { padding: 14, gap: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Theme.colors.border, ...Theme.shadows.card },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji:        { fontSize: 28 },
  serviceName:  { fontSize: Theme.typography.base, fontWeight: '800', color: Theme.colors.textPrimary },
  bookingId:    { fontSize: Theme.typography.xs, color: Theme.colors.primary, fontWeight: '700', marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusLabel:  { fontSize: 11, fontWeight: '700' },
  divider:      { height: 1, backgroundColor: Theme.colors.borderLight, marginVertical: 12 },
  infoGrid:     { gap: 7 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText:     { fontSize: Theme.typography.sm, color: Theme.colors.textSecondary, fontWeight: '500' },
  cardFooter:   { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, gap: 4 },
  tapHint:      { fontSize: 12, color: Theme.colors.primary, fontWeight: '700' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:    { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, ...Theme.shadows.soft },
  emptyTitle:   { fontSize: Theme.typography.xl, fontWeight: '900', color: Theme.colors.textPrimary, marginBottom: 8 },
  emptyText:    { fontSize: Theme.typography.base, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  
  // Center Restricted Screens
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f0f4ff' },
  lockIconCircle:  { width: 90, height: 90, borderRadius: 45, backgroundColor: Theme.colors.primaryGlass, justifyContent: 'center', alignItems: 'center', marginBottom: 20, ...Theme.shadows.soft },
  lockTitle:       { fontSize: 20, fontWeight: '950', color: Theme.colors.textPrimary },
  lockDesc:        { fontSize: 13, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 12, fontWeight: '600' },
  actionBtn:       { width: '100%', marginTop: 28, borderRadius: 14, overflow: 'hidden', ...Theme.shadows.medium },
  gradientBtn:     { flexDirection: 'row', height: 48, justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText:   { fontSize: 13, fontWeight: '800', color: '#fff' }
});
