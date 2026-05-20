import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../../utils/Theme';
import { useTheme } from '../../utils/ThemeContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [profile,      setProfile]      = useState(null);
  const [bookingCount, setBookingCount] = useState(0);
  const { theme, toggleTheme, isDark } = useTheme();

  const loadProfile = useCallback(async () => {
    try {
      const savedRole      = await AsyncStorage.getItem('@user_role');
      const savedName      = await AsyncStorage.getItem('@user_name');
      const savedPhone     = await AsyncStorage.getItem('@user_phone');
      const savedService   = await AsyncStorage.getItem('@provider_service');
      const savedSector    = await AsyncStorage.getItem('@provider_sector');
      const savedLocation  = await AsyncStorage.getItem('@user_location');
      const savedCustSector= await AsyncStorage.getItem('@user_sector');
      const savedAvatar    = await AsyncStorage.getItem('@user_avatar');
      const savedUid       = await AsyncStorage.getItem('@user_uid');
      const savedEmail     = await AsyncStorage.getItem('@user_email');

      // Count bookings
      const rawBookings = await AsyncStorage.getItem('bookings');
      const bookings = rawBookings ? JSON.parse(rawBookings) : [];
      setBookingCount(bookings.length);

      if (savedRole && savedName) {
        setProfile({
          role: savedRole, name: savedName, phone: savedPhone,
          service: savedService, email: savedEmail || '',
          sector: savedRole === 'provider' ? savedSector : savedCustSector,
          location: savedLocation, avatar: savedAvatar, uid: savedUid,
        });
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.warn('Failed to load profile:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = () => {
    Alert.alert('🚪 Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              '@user_uid','@user_role','@user_name','@user_phone',
              '@user_email','@user_location','@user_sector','@user_address',
              '@user_avatar','@provider_service','@provider_sector',
            ]);
            setProfile(null);
            setBookingCount(0);
            Alert.alert('Logged Out', 'You have been signed out successfully.');
          } catch { Alert.alert('Error', 'Failed to log out.'); }
        }}
    ]);
  };

  const renderGuestView = () => (
    <View style={styles.guestContainer}>
      <View style={styles.guestLogoCircle}>
        <Ionicons name="shield-checkmark" size={48} color={Theme.colors.primary} />
      </View>
      <Text style={styles.guestTitle}>Welcome to ServiceConnect PK</Text>
      <Text style={styles.guestDesc}>
        Log in to book professional home services in Islamabad, track matched providers in real time, or manage your bookings with advanced AI scheduling.
      </Text>

      <TouchableOpacity style={styles.guestLoginBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
        <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.gradientBtn}>
          <Ionicons name="log-in-outline" size={20} color="#fff" />
          <Text style={styles.guestLoginBtnText}>Log In to Account</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.guestRegisterBtn} onPress={() => router.push('/register')} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={18} color={Theme.colors.primary} />
        <Text style={styles.guestRegisterBtnText}>Create New Account →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfileView = () => {
    const isProvider = profile.role === 'provider';
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic Profile Card */}
        <LinearGradient 
          colors={isProvider ? ['#0284c7', '#0369a1'] : Theme.colors.gradientPrimary} 
          style={styles.profileCard}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={{ width: 68, height: 68, borderRadius: 34 }} />
              ) : (
                <Ionicons name={isProvider ? 'construct' : 'person'} size={32} color={isProvider ? '#0284c7' : Theme.colors.primary} />
              )}
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{profile.role.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>
            {isProvider ? `${profile.service} Specialist` : 'Premium Service Customer'}
          </Text>
          {/* Firebase badge */}
          {profile.uid && (
            <View style={styles.firebaseBadge}>
              <Text style={styles.firebaseBadgeText}>Firebase ID: {profile.uid}</Text>
            </View>
          )}
          {/* Booking count */}
          {bookingCount > 0 && (
            <View style={styles.bookingCountBadge}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.bookingCountText}>{bookingCount} Booking{bookingCount !== 1 ? 's' : ''} on Record</Text>
            </View>
          )}
        </LinearGradient>

        {/* Details Section */}
        <View style={[styles.detailsCard, { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: Theme.colors.textPrimary }]}>Account Details</Text>
          
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBg, { backgroundColor: Theme.colors.backgroundAlt }]}>
              <Ionicons name="phone-portrait-outline" size={18} color={Theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.detailLabel, { color: Theme.colors.textMuted }]}>MOBILE NUMBER</Text>
              <Text style={[styles.detailValue, { color: Theme.colors.textPrimary }]}>{profile.phone}</Text>
            </View>
          </View>

          {isProvider && (
            <>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconBg, { backgroundColor: Theme.colors.backgroundAlt }]}>
                  <Ionicons name="briefcase-outline" size={18} color="#0284c7" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.detailLabel, { color: Theme.colors.textMuted }]}>SERVICE SPECIALTY</Text>
                  <Text style={[styles.detailValue, { color: Theme.colors.textPrimary }]}>{profile.service}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIconBg, { backgroundColor: Theme.colors.backgroundAlt }]}>
                  <Ionicons name="location-outline" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.detailLabel, { color: Theme.colors.textMuted }]}>BASE SECTOR</Text>
                  <Text style={[styles.detailValue, { color: Theme.colors.textPrimary }]}>Sector {profile.sector} (Islamabad)</Text>
                </View>
              </View>
            </>
          )}

          {!isProvider && (
            <>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconBg, { backgroundColor: Theme.colors.backgroundAlt }]}>
                  <Ionicons name="home-outline" size={18} color={Theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.detailLabel, { color: Theme.colors.textMuted }]}>HOME SECTOR</Text>
                  <Text style={[styles.detailValue, { color: Theme.colors.textPrimary }]}>Sector {profile.sector || 'Not Configured'}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={[styles.detailIconBg, { backgroundColor: Theme.colors.backgroundAlt }]}>
                  <Ionicons name="map-outline" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.detailLabel, { color: Theme.colors.textMuted }]}>HOME ADDRESS</Text>
                  <Text style={[styles.detailValue, { color: Theme.colors.textPrimary }]}>{profile.location || 'Not Configured'}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Action Options */}
        <View style={styles.actionsCard}>
          {isProvider && (
            <TouchableOpacity 
              style={[styles.actionRow, { borderBottomColor: Theme.colors.borderLight, borderBottomWidth: 1 }]}
              onPress={() => router.push('/provider-dashboard')}
            >
              <Ionicons name="speedometer-outline" size={20} color="#0284c7" />
              <Text style={[styles.actionText, { color: '#0284c7' }]}>Open Provider Dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionRow, { borderBottomColor: Theme.colors.borderLight, borderBottomWidth: 1 }]}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="create-outline" size={20} color={Theme.colors.primary} />
            <Text style={styles.actionText}>Edit Profile Info</Text>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionRow, { borderBottomColor: Theme.colors.borderLight, borderBottomWidth: 1 }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={isDark ? Theme.colors.accent : Theme.colors.warning} />
            <Text style={styles.actionText}>{isDark ? "Dark Theme Mode" : "Light Theme Mode"}</Text>
            <View style={[styles.switchTrack, isDark && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, isDark && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionRow}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={Theme.colors.error} />
            <Text style={[styles.actionText, { color: Theme.colors.error }]}>Log Out Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Theme.colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Theme.colors.surface, borderBottomColor: Theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: Theme.colors.textPrimary }]}>User Profile</Text>
        <Text style={[styles.headerSub, { color: Theme.colors.textMuted }]}>Manage your ServiceConnect PK credentials</Text>
      </View>

      {profile ? renderProfileView() : renderGuestView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: 18, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, backgroundColor: Theme.colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '950', color: Theme.colors.textPrimary },
  headerSub: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 2, fontWeight: '700' },
  scrollContent: { padding: 14, gap: 14, paddingBottom: 40 },
  
  // Guest View
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  guestLogoCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: Theme.colors.primaryGlass, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  guestTitle: { fontSize: 18, fontWeight: '900', color: Theme.colors.textPrimary, textAlign: 'center' },
  guestDesc: { fontSize: 13, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 12 },
  guestLoginBtn: { width: '100%', marginTop: 28, borderRadius: 14, overflow: 'hidden', ...Theme.shadows.soft },
  gradientBtn: { flexDirection: 'row', height: 48, justifyContent: 'center', alignItems: 'center', gap: 8 },
  guestLoginBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  guestRegisterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, height: 46, width: '100%', borderRadius: 14, borderWidth: 1.5, borderColor: Theme.colors.primary, backgroundColor: '#eff6ff' },
  guestRegisterBtnText: { fontSize: 13, fontWeight: '800', color: Theme.colors.primary },

  // Logged-in View
  profileCard: { padding: 24, borderRadius: 24, alignItems: 'center', ...Theme.shadows.medium },
  avatarContainer: { marginBottom: 12, alignItems: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: Theme.colors.surface, justifyContent: 'center', alignItems: 'center', ...Theme.shadows.soft },
  badge: { backgroundColor: Theme.colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: -10, borderWidth: 1, borderColor: Theme.colors.border },
  badgeText: { fontSize: 8.5, fontWeight: '900', color: Theme.colors.primary },
  profileName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  profileSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '600' },
  firebaseBadge: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  firebaseBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  bookingCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  bookingCountText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  detailsCard: { backgroundColor: Theme.colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: Theme.colors.border, ...Theme.shadows.card },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: Theme.colors.textPrimary, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  detailIconBg: { width: 34, height: 34, borderRadius: 10, backgroundColor: Theme.colors.backgroundAlt, justifyContent: 'center', alignItems: 'center' },
  detailLabel: { fontSize: 9, fontWeight: '800', color: Theme.colors.textMuted },
  detailValue: { fontSize: 13, fontWeight: '700', color: Theme.colors.textPrimary, marginTop: 2 },

  actionsCard: { backgroundColor: Theme.colors.surface, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: Theme.colors.border, ...Theme.shadows.card },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  actionText: { flex: 1, fontSize: 13, fontWeight: '700', color: Theme.colors.textPrimary, marginLeft: 12 },
  switchTrack: { width: 42, height: 22, borderRadius: 11, backgroundColor: '#cbd5e1', padding: 2, justifyContent: 'center' },
  switchTrackActive: { backgroundColor: '#10b981' },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', elevation: 1 },
  switchThumbActive: { alignSelf: 'flex-end' }
});
