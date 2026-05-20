import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser } from '../utils/firebaseHelper';
import { Theme } from '../utils/Theme';
import { SECTOR_COORDS } from '../utils/mapHelper';
import ModernAlert from '../components/ModernAlert';

const { width } = Dimensions.get('window');

const SERVICES_LIST = [
  'Plumber','Electrician','AC Technician','Carpenter','Cleaner',
  'Tutor','Beautician','Cook','Driver','Painter','Mechanic',
  'Appliance Repair','Gardener','Pest Control','Solar Installer',
  'CCTV Technician','Welder','Sofa Cleaner','Locksmith','Mason',
  'Car Washer','Tailor','Photographer','Disinfector','Physiotherapist',
  'Barber','Laptop Tech','Roofer','Chauffeur','Handyman',
];
const SECTORS_LIST = Object.keys(SECTOR_COORDS);

// ── Reusable field component ─────────────────────────────────────────────────
function Field({ label, icon, children, error }) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabel}>
        <Ionicons name={icon} size={13} color={error ? '#ef4444' : '#6b7faa'} />
        <Text style={[styles.fieldLabelText, error && { color: '#ef4444' }]}>{label}</Text>
      </View>
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── Password input with show/hide ────────────────────────────────────────────
function PasswordInput({ value, onChangeText, placeholder, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor="#aab4cc"
        secureTextEntry={!visible}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={() => setVisible(v => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7faa" />
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();

  // Role
  const [role, setRole] = useState('customer');

  // Shared fields
  const [name,            setName]            = useState('');
  const [phone,           setPhone]           = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sector,          setSector]          = useState('G-11');

  // Customer-only
  const [address, setAddress] = useState('');

  // Provider-only
  const [serviceType, setServiceType] = useState('Plumber');

  // UI state
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState({});
  const [alertConfig, setAlertConfig] = useState(null);

  // Animated role-tab indicator
  const tabAnim = useRef(new Animated.Value(0)).current;
  const switchRole = (r) => {
    setRole(r);
    setErrors({});
    Animated.spring(tabAnim, { toValue: r === 'customer' ? 0 : 1, useNativeDriver: false, tension: 60, friction: 8 }).start();
  };

  const showAlert = (title, message, type = 'info', buttons = []) =>
    setAlertConfig({ title, message, type, buttons });

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!name.trim())                          errs.name    = 'Full name is required.';
    if (!phone.trim() || phone.trim().length < 10) errs.phone = 'Enter a valid mobile number (min 10 digits).';
    if (!password)                             errs.password = 'Password is required.';
    else if (password.length < 6)              errs.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword)          errs.confirmPassword = 'Passwords do not match.';
    if (role === 'customer' && !address.trim()) errs.address = 'Home address / neighborhood is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const userData = {
        role,
        name:        name.trim(),
        phone:       phone.trim(),
        email:       email.trim(),
        password,
        sector,
        address:     role === 'customer' ? address.trim() : '',
        serviceType: role === 'provider' ? serviceType : '',
      };

      const userRecord = await registerUser(userData);

      // ── Persist session to AsyncStorage ─────────────────────────────────
      await AsyncStorage.multiSet([
        ['@user_uid',       userRecord.uid],
        ['@user_role',      userRecord.role],
        ['@user_name',      userRecord.name],
        ['@user_phone',     userRecord.phone],
        ['@user_email',     userRecord.email || ''],
        ['@user_sector',    userRecord.sector || ''],
        ['@user_address',   userRecord.address || ''],
        ['@user_location',  userRecord.address || ''],
      ]);
      if (role === 'provider') {
        await AsyncStorage.multiSet([
          ['@provider_service', userRecord.serviceType],
          ['@provider_sector',  userRecord.sector],
        ]);
      }

      showAlert(
        '🎉 Welcome to ServiceConnect PK!',
        `Assalam-o-Alaikum, ${userRecord.name}!\n\nYour ${role} account has been created and saved to Firebase successfully.`,
        'success',
        [{ text: 'Let\'s Go! 🚀', onPress: () => router.replace(role === 'provider' ? '/provider-dashboard' : '/(tabs)/chat') }]
      );
    } catch (err) {
      showAlert('Registration Failed', err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Tab indicator interpolation ────────────────────────────────────────────
  const tabLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" backgroundColor="#1a3a8f" translucent={false} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO HEADER ─────────────────────────────────────────────── */}
          <LinearGradient
            colors={['#0f1f5c', '#1a3ecf', '#2d6ef5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {/* Decorative circles */}
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />

            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>🇵🇰 ServiceConnect PK</Text>
              </View>
              <Text style={styles.heroTitle}>Create Account</Text>
              <Text style={styles.heroSub}>Join thousands of customers & providers across Islamabad</Text>
            </View>
          </LinearGradient>

          {/* ── ROLE SELECTOR ───────────────────────────────────────────── */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>I want to join as</Text>
            <View style={styles.roleTabBar}>
              {/* Animated sliding indicator */}
              <Animated.View style={[styles.roleTabIndicator, { left: tabLeft }]} />
              <TouchableOpacity style={styles.roleTab} onPress={() => switchRole('customer')} activeOpacity={0.85}>
                <Ionicons name="people" size={17} color={role === 'customer' ? '#fff' : '#6b7faa'} />
                <Text style={[styles.roleTabText, role === 'customer' && styles.roleTabTextActive]}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleTab} onPress={() => switchRole('provider')} activeOpacity={0.85}>
                <Ionicons name="construct" size={17} color={role === 'provider' ? '#fff' : '#6b7faa'} />
                <Text style={[styles.roleTabText, role === 'provider' && styles.roleTabTextActive]}>Provider</Text>
              </TouchableOpacity>
            </View>

            {/* Role description pill */}
            <View style={styles.roleDescPill}>
              <Ionicons
                name={role === 'customer' ? 'home-outline' : 'briefcase-outline'}
                size={13}
                color={Theme.colors.primary}
              />
              <Text style={styles.roleDescText}>
                {role === 'customer'
                  ? 'Book professional home services in your sector'
                  : 'Offer your skills and earn across Islamabad sectors'}
              </Text>
            </View>
          </View>

          {/* ── PERSONAL DETAILS ────────────────────────────────────────── */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              {role === 'customer' ? '👤 Personal Information' : '🛠️ Business Information'}
            </Text>

            <Field label="FULL NAME" icon="person-outline" error={errors.name}>
              <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Muhammad Haseeb"
                  placeholderTextColor="#aab4cc"
                  value={name}
                  onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: null })); }}
                  autoCapitalize="words"
                />
              </View>
            </Field>

            <Field label="MOBILE NUMBER (used to login)" icon="call-outline" error={errors.phone}>
              <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 03001234567"
                  placeholderTextColor="#aab4cc"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: null })); }}
                />
              </View>
            </Field>

            <Field label="EMAIL (optional)" icon="mail-outline">
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. haseeb@example.com"
                  placeholderTextColor="#aab4cc"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
              </View>
            </Field>
          </View>

          {/* ── ROLE-SPECIFIC FIELDS ─────────────────────────────────────── */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              {role === 'customer' ? '📍 Location Details' : '🔧 Service Details'}
            </Text>

            {role === 'customer' && (
              <>
                <Field label="HOME ADDRESS / NEIGHBORHOOD" icon="home-outline" error={errors.address}>
                  <View style={[styles.inputWrapper, errors.address && styles.inputWrapperError]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. House 14-A, Street 12, G-11/2"
                      placeholderTextColor="#aab4cc"
                      value={address}
                      onChangeText={t => { setAddress(t); setErrors(e => ({ ...e, address: null })); }}
                    />
                  </View>
                </Field>

                <Field label="HOME SECTOR" icon="location-outline">
                  <View style={styles.chipGrid}>
                    {SECTORS_LIST.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.chip, sector === sec && styles.chipActive]}
                        onPress={() => setSector(sec)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, sector === sec && styles.chipTextActive]}>{sec}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              </>
            )}

            {role === 'provider' && (
              <>
                <Field label="SERVICE TYPE" icon="briefcase-outline">
                  <View style={styles.chipGrid}>
                    {SERVICES_LIST.map(srv => (
                      <TouchableOpacity
                        key={srv}
                        style={[styles.chip, serviceType === srv && styles.chipActive]}
                        onPress={() => setServiceType(srv)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, serviceType === srv && styles.chipTextActive]}>{srv}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                <Field label="OPERATING SECTOR" icon="map-outline">
                  <View style={styles.chipGrid}>
                    {SECTORS_LIST.map(sec => (
                      <TouchableOpacity
                        key={sec}
                        style={[styles.chip, sector === sec && styles.chipActive]}
                        onPress={() => setSector(sec)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, sector === sec && styles.chipTextActive]}>{sec}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>
              </>
            )}
          </View>

          {/* ── SECURITY ────────────────────────────────────────────────── */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>🔐 Secure Password</Text>

            <Field label="CREATE PASSWORD" icon="lock-closed-outline" error={errors.password}>
              <PasswordInput
                placeholder="Min 6 characters"
                value={password}
                onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: null, confirmPassword: null })); }}
                error={errors.password}
              />
            </Field>

            <Field label="CONFIRM PASSWORD" icon="shield-checkmark-outline" error={errors.confirmPassword}>
              <PasswordInput
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={t => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: null })); }}
                error={errors.confirmPassword}
              />
            </Field>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[...Array(4)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          password.length >= (i + 1) * 3
                            ? i < 1 ? '#ef4444' : i < 2 ? '#f59e0b' : i < 3 ? '#3b82f6' : '#10b981'
                            : '#e2e8f0',
                      },
                    ]}
                  />
                ))}
                <Text style={styles.strengthLabel}>
                  {password.length < 3 ? 'Weak' : password.length < 6 ? 'Fair' : password.length < 9 ? 'Good' : 'Strong'}
                </Text>
              </View>
            )}
          </View>

          {/* ── DATA NOTICE ─────────────────────────────────────────────── */}
          <View style={styles.noticeRow}>
            <Ionicons name="cloud-outline" size={14} color="#6b7faa" />
            <Text style={styles.noticeText}>
              Your profile is securely saved to Firebase RTDB under{' '}
              <Text style={{ color: Theme.colors.primary }}>
                {role === 'customer' ? 'users/' : 'providers/'}
              </Text>
              with encrypted credentials.
            </Text>
          </View>

          {/* ── REGISTER BUTTON ──────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#94a3b8', '#94a3b8'] : ['#1a3ecf', '#2d6ef5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.registerBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                  <Text style={styles.registerBtnText}>Create Account</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── FOOTER LINK ─────────────────────────────────────────────── */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Log In →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModernAlert
        visible={!!alertConfig}
        title={alertConfig?.title}
        message={alertConfig?.message}
        type={alertConfig?.type}
        buttons={alertConfig?.buttons}
        onClose={() => setAlertConfig(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f0f4ff' },
  scrollContent: { paddingBottom: 48 },

  // Hero
  hero: {
    paddingTop: 12, paddingBottom: 36,
    paddingHorizontal: 20,
    position: 'relative', overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -40,
  },
  heroCircle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -30, left: -30,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  heroContent: { alignItems: 'center' },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginBottom: 14,
  },
  heroBadgeText:  { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  heroTitle:      { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  heroSub:        { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8, textAlign: 'center', lineHeight: 20, fontWeight: '600' },

  // Cards
  formCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 18,
    shadowColor: '#1a3ecf', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#e8eeff',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: '#1e293b',
    letterSpacing: 0.3, marginBottom: 14,
  },

  // Role tabs
  roleTabBar: {
    flexDirection: 'row', backgroundColor: '#eef2ff',
    borderRadius: 14, padding: 4, position: 'relative', overflow: 'hidden',
    marginBottom: 12,
  },
  roleTabIndicator: {
    position: 'absolute', top: 4, bottom: 4, width: '50%',
    backgroundColor: Theme.colors.primary, borderRadius: 11,
    shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
  roleTab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  roleTabText:       { fontSize: 13, fontWeight: '700', color: '#6b7faa' },
  roleTabTextActive: { color: '#fff' },
  roleDescPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#dbeafe',
  },
  roleDescText: { fontSize: 11.5, color: '#3b60c4', fontWeight: '600', flex: 1 },

  // Fields
  fieldWrap:      { marginBottom: 14 },
  fieldLabel:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  fieldLabelText: { fontSize: 9.5, fontWeight: '800', color: '#6b7faa', letterSpacing: 0.6 },
  fieldError:     { fontSize: 10.5, color: '#ef4444', marginTop: 4, fontWeight: '600' },

  // Inputs
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, backgroundColor: '#f8faff',
    borderWidth: 1.5, borderColor: '#dde8ff',
    borderRadius: 13, paddingHorizontal: 14,
  },
  inputWrapperError: { borderColor: '#fca5a5', backgroundColor: '#fff8f8' },
  textInput: {
    flex: 1, fontSize: 14, fontWeight: '600',
    color: '#1e293b', paddingVertical: 0,
  },
  eyeBtn: { padding: 4 },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 },
  chip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  chipActive:     { backgroundColor: '#eff6ff', borderColor: Theme.colors.primary },
  chipText:       { fontSize: 11, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: Theme.colors.primary },

  // Password strength
  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginLeft: 4 },

  // Notice
  noticeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: '#f0f4ff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#dde8ff',
  },
  noticeText: { fontSize: 11, color: '#6b7faa', flex: 1, lineHeight: 17, fontWeight: '500' },

  // Register button
  registerBtn:         { marginHorizontal: 16, marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  registerBtnDisabled: { opacity: 0.7 },
  registerBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56,
    shadowColor: '#1a3ecf', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  registerBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },

  // Footer
  footerRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20, marginBottom: 8,
  },
  footerText: { fontSize: 13, color: '#6b7faa', fontWeight: '600' },
  footerLink: { fontSize: 13, color: Theme.colors.primary, fontWeight: '800' },
});
