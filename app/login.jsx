import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions, Animated,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { loginUser, updateUserProfile, resetUserPassword } from '../utils/firebaseHelper';
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

function PasswordInput({ value, onChangeText, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.inputRow}>
      <TextInput
        style={[styles.textInput, { flex: 1 }]}
        placeholder={placeholder || 'Enter password'}
        placeholderTextColor={Theme.colors.textMuted}
        secureTextEntry={!visible}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={() => setVisible(v => !v)} style={{ padding: 6 }} activeOpacity={0.7}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7faa" />
      </TouchableOpacity>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();

  // mode: 'login' | 'edit'  (login = credential gate, edit = profile editor for logged-in users)
  const [mode,     setMode]     = useState('login');
  const [role,     setRole]     = useState('customer');
  const [loading,  setLoading]  = useState(false);
  const [alertConfig, setAlertConfig] = useState(null);

  // Login form
  const [loginPhone,    setLoginPhone]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isForgotMode,  setForgotMode]    = useState(false);

  // Edit-profile form (mirrors existing login.jsx fields)
  const [uid,         setUid]         = useState('');
  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [serviceType, setServiceType] = useState('Plumber');
  const [sector,      setSector]      = useState('G-11');
  const [location,    setLocation]    = useState('');
  const [avatarUri,   setAvatarUri]   = useState('');

  const showAlert = (title, message, type = 'info', buttons = []) =>
    setAlertConfig({ title, message, type, buttons });

  // Decide mode on mount
  useEffect(() => {
    (async () => {
      const savedUid  = await AsyncStorage.getItem('@user_uid');
      const savedRole = await AsyncStorage.getItem('@user_role');
      if (savedUid && savedRole) {
        // Already logged in → go to profile editor
        setMode('edit');
        setRole(savedRole);
        setUid(savedUid);
        const savedName   = await AsyncStorage.getItem('@user_name');
        const savedPhone  = await AsyncStorage.getItem('@user_phone');
        const savedSvc    = await AsyncStorage.getItem('@provider_service');
        const savedSec    = await AsyncStorage.getItem('@provider_sector');
        const savedCstSec = await AsyncStorage.getItem('@user_sector');
        const savedLoc    = await AsyncStorage.getItem('@user_location');
        const savedAvatar = await AsyncStorage.getItem('@user_avatar');
        if (savedName)   setName(savedName);
        if (savedPhone)  setPhone(savedPhone);
        if (savedSvc)    setServiceType(savedSvc);
        if (savedRole === 'provider' && savedSec)    setSector(savedSec);
        if (savedRole === 'customer' && savedCstSec) setSector(savedCstSec);
        if (savedLoc)    setLocation(savedLoc);
        if (savedAvatar) setAvatarUri(savedAvatar);
      } else {
        setMode('login');
      }
    })();
  }, []);

  // ── Login handler ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginPhone.trim()) return showAlert('Required', 'Enter your registered mobile number.', 'warning');
    if (!loginPassword)     return showAlert('Required', 'Enter your password.', 'warning');
    setLoading(true);
    try {
      const user = await loginUser(loginPhone.trim(), loginPassword, role);

      await AsyncStorage.multiSet([
        ['@user_uid',      user.uid],
        ['@user_role',     user.role],
        ['@user_name',     user.name],
        ['@user_phone',    user.phone],
        ['@user_email',    user.email || ''],
        ['@user_sector',   user.sector || ''],
        ['@user_address',  user.address || ''],
        ['@user_location', user.address || ''],
      ]);
      if (user.role === 'provider') {
        await AsyncStorage.multiSet([
          ['@provider_service', user.serviceType || ''],
          ['@provider_sector',  user.sector || ''],
        ]);
      }

      showAlert(
        `✅ Welcome back, ${user.name}!`,
        `You have successfully logged in as a ${user.role}.`,
        'success',
        [{ text: 'Continue →', onPress: () => router.replace(user.role === 'provider' ? '/provider-dashboard' : '/(tabs)/chat') }]
      );
    } catch (err) {
      showAlert('Login Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password handler ──────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!loginPhone.trim()) return showAlert('Required', 'Enter your registered mobile number.', 'warning');
    if (!loginPassword) return showAlert('Required', 'Enter your new password.', 'warning');
    if (loginPassword.length < 6) return showAlert('Weak Password', 'Password must be at least 6 characters.', 'warning');
    
    setLoading(true);
    try {
      await resetUserPassword(loginPhone.trim(), loginPassword, role);
      showAlert(
        '✅ Password Reset Successful',
        'Your password has been securely updated in Firebase. You can now log in.',
        'success',
        [{ text: 'OK', onPress: () => { setForgotMode(false); setLoginPassword(''); } }]
      );
    } catch (err) {
      showAlert('Reset Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Profile save handler ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return showAlert('Required', 'Please enter your name.', 'warning');
    if (!phone.trim() || phone.length < 10) return showAlert('Required', 'Enter a valid mobile number.', 'warning');
    if (role === 'customer' && !location.trim()) return showAlert('Required', 'Please enter your location.', 'warning');

    setLoading(true);
    try {
      await AsyncStorage.setItem('@user_name', name.trim());
      await AsyncStorage.setItem('@user_phone', phone.trim());
      if (avatarUri) await AsyncStorage.setItem('@user_avatar', avatarUri);
      else await AsyncStorage.removeItem('@user_avatar');

      if (role === 'provider') {
        await AsyncStorage.setItem('@provider_service', serviceType);
        await AsyncStorage.setItem('@provider_sector', sector);
      } else {
        await AsyncStorage.setItem('@user_location', location.trim());
        await AsyncStorage.setItem('@user_sector', sector);
      }

      // Sync updated profile to Firebase if UID present
      if (uid) {
        updateUserProfile(uid, role, {
          name: name.trim(), phone: phone.trim(),
          sector, address: location.trim(), serviceType: role === 'provider' ? serviceType : '',
        }).catch(() => {});
      }

      showAlert(
        '✅ Profile Updated',
        `Profile saved${uid ? ' and synced to Firebase' : ' locally'}.`,
        'success',
        [{ text: 'Done', onPress: () => router.replace(role === 'provider' ? '/provider-dashboard' : '/(tabs)/chat') }]
      );
    } catch {
      showAlert('Error', 'Failed to save profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) setAvatarUri(result.assets[0].uri);
  };

  // ════════════════════════════════════════════════════════
  // RENDER: Login gate
  // ════════════════════════════════════════════════════════
  if (mode === 'login') return (
    <SafeAreaView style={styles.container} edges={['top','left','right','bottom']}>
      <StatusBar style="light" backgroundColor="#0f1f5c" translucent={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <LinearGradient colors={['#0f1f5c','#1a3ecf','#2d6ef5']} style={styles.hero}>
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoWrap}>
              <View style={styles.logoOuter}><View style={styles.logoInner}>
                <Ionicons name="shield-checkmark" size={36} color="#fff" />
              </View></View>
            </View>
            <Text style={styles.heroTitle}>Welcome Back</Text>
            <Text style={styles.heroSub}>Sign in to your ServiceConnect PK account</Text>
          </LinearGradient>

          {/* Card */}
          <View style={styles.loginCard}>
            {/* Role tabs */}
            <View style={styles.tabRow}>
              {['customer','provider'].map(r => (
                <TouchableOpacity key={r} style={[styles.tab, role===r && styles.tabActive]} onPress={() => setRole(r)} activeOpacity={0.8}>
                  <Ionicons name={r==='customer'?'people':'construct'} size={16} color={role===r?'#fff':'#6b7faa'} />
                  <Text style={[styles.tabText, role===r && styles.tabTextActive]}>{r==='customer'?'Customer':'Provider'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g. 03001234567"
                placeholderTextColor={Theme.colors.textMuted}
                keyboardType="phone-pad"
                value={loginPhone}
                onChangeText={setLoginPhone}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>{isForgotMode ? "NEW PASSWORD" : "PASSWORD"}</Text>
            <PasswordInput value={loginPassword} onChangeText={setLoginPassword} placeholder={isForgotMode ? "Enter new password" : "Enter your password"} />

            <View style={{ alignItems: 'flex-end', marginTop: 10, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => setForgotMode(!isForgotMode)}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Theme.colors.primary }}>
                  {isForgotMode ? "Back to Login" : "Forgot Password?"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={isForgotMode ? handleForgotPassword : handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#1a3ecf','#2d6ef5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGradient}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name={isForgotMode ? "refresh-outline" : "log-in-outline"} size={20} color="#fff" /><Text style={styles.primaryBtnText}>{isForgotMode ? "Reset Password" : "Sign In"}</Text></>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Don't have an account?</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/register')} activeOpacity={0.8}>
              <Ionicons name="person-add-outline" size={18} color={Theme.colors.primary} />
              <Text style={styles.secondaryBtnText}>Create New Account →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ModernAlert visible={!!alertConfig} title={alertConfig?.title} message={alertConfig?.message} type={alertConfig?.type} buttons={alertConfig?.buttons} onClose={() => setAlertConfig(null)} />
    </SafeAreaView>
  );

  // ════════════════════════════════════════════════════════
  // RENDER: Profile Editor (for logged-in users)
  // ════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top','left','right','bottom']}>
      <StatusBar style="dark" backgroundColor="#f0f4ff" translucent={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnDark}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.editTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.editLogoCard}>
          <View style={styles.logoIconBg}><Ionicons name="shield-checkmark" size={28} color="#fff" /></View>
          <Text style={styles.editLogoTitle}>Profile Manager</Text>
          <Text style={styles.editLogoSub}>
            {uid ? '🔥 Synced with Firebase' : '📱 Local profile only'}
          </Text>
        </LinearGradient>

        <View style={styles.tabRow}>
          {['customer','provider'].map(r => (
            <TouchableOpacity key={r} style={[styles.tab, role===r && styles.tabActive]} onPress={() => setRole(r)} activeOpacity={0.8}>
              <Ionicons name={r==='customer'?'people':'construct'} size={16} color={role===r?'#fff':'#6b7faa'} />
              <Text style={[styles.tabText, role===r && styles.tabTextActive]}>{r==='customer'?'Customer':'Provider'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.editCard}>
          {/* Avatar */}
          <View style={{ alignItems:'center', marginBottom: 18 }}>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrap} activeOpacity={0.8}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                : <View style={styles.avatarPlaceholder}><Ionicons name="camera" size={28} color={Theme.colors.primary} /></View>}
              <View style={styles.cameraIconBadge}><Ionicons name="pencil" size={11} color="#fff" /></View>
            </TouchableOpacity>
            <Text style={{ fontSize: 10, color: Theme.colors.primary, fontWeight:'700', marginTop: 8 }}>Tap to update photo</Text>
          </View>

          <Text style={styles.inputLabel}>FULL NAME</Text>
          <View style={styles.inputRow}><TextInput style={[styles.textInput,{flex:1}]} placeholder="Full name" placeholderTextColor={Theme.colors.textMuted} value={name} onChangeText={setName} autoCapitalize="words" /></View>

          <Text style={[styles.inputLabel,{marginTop:14}]}>MOBILE NUMBER</Text>
          <View style={styles.inputRow}><TextInput style={[styles.textInput,{flex:1}]} placeholder="Mobile number" placeholderTextColor={Theme.colors.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} /></View>

          {role==='customer' && <>
            <Text style={[styles.inputLabel,{marginTop:14}]}>HOME ADDRESS</Text>
            <View style={styles.inputRow}><TextInput style={[styles.textInput,{flex:1}]} placeholder="House, Street, Sector" placeholderTextColor={Theme.colors.textMuted} value={location} onChangeText={setLocation} /></View>
            <Text style={[styles.inputLabel,{marginTop:14}]}>HOME SECTOR</Text>
            <View style={styles.chipGrid}>{SECTORS_LIST.map(s=><TouchableOpacity key={s} style={[styles.chip,sector===s&&styles.chipActive]} onPress={()=>setSector(s)}><Text style={[styles.chipText,sector===s&&styles.chipTextActive]}>{s}</Text></TouchableOpacity>)}</View>
          </>}

          {role==='provider' && <>
            <Text style={[styles.inputLabel,{marginTop:14}]}>SERVICE TYPE</Text>
            <View style={styles.chipGrid}>{SERVICES_LIST.map(s=><TouchableOpacity key={s} style={[styles.chip,serviceType===s&&styles.chipActive]} onPress={()=>setServiceType(s)}><Text style={[styles.chipText,serviceType===s&&styles.chipTextActive]}>{s}</Text></TouchableOpacity>)}</View>
            <Text style={[styles.inputLabel,{marginTop:14}]}>OPERATING SECTOR</Text>
            <View style={styles.chipGrid}>{SECTORS_LIST.map(s=><TouchableOpacity key={s} style={[styles.chip,sector===s&&styles.chipActive]} onPress={()=>setSector(s)}><Text style={[styles.chipText,sector===s&&styles.chipTextActive]}>{s}</Text></TouchableOpacity>)}</View>
          </>}

          <TouchableOpacity style={[styles.primaryBtn,{marginTop:24},loading&&{opacity:0.7}]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#1a3ecf','#2d6ef5']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.primaryBtnGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.primaryBtnText}>Save & Sync Profile</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ModernAlert visible={!!alertConfig} title={alertConfig?.title} message={alertConfig?.message} type={alertConfig?.type} buttons={alertConfig?.buttons} onClose={() => setAlertConfig(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },

  // Hero
  hero: { paddingTop: 12, paddingBottom: 44, paddingHorizontal: 20, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroCircle1: { position:'absolute', width:200, height:200, borderRadius:100, backgroundColor:'rgba(255,255,255,0.05)', top:-60, right:-40 },
  heroCircle2: { position:'absolute', width:150, height:150, borderRadius:75,  backgroundColor:'rgba(255,255,255,0.04)', bottom:-30, left:-30 },
  backBtn: { position:'absolute', top:12, left:16, width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.15)', justifyContent:'center', alignItems:'center' },
  logoWrap: { marginBottom: 20 },
  logoOuter: { width:90, height:90, borderRadius:45, backgroundColor:'rgba(255,255,255,0.15)', justifyContent:'center', alignItems:'center' },
  logoInner: { width:68, height:68, borderRadius:34, backgroundColor:'rgba(255,255,255,0.22)', justifyContent:'center', alignItems:'center' },
  heroTitle: { fontSize:28, fontWeight:'900', color:'#fff', letterSpacing:-0.5 },
  heroSub:   { fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:8, textAlign:'center', fontWeight:'600' },

  // Login card
  loginCard: { backgroundColor:'#fff', marginHorizontal:16, marginTop:-24, borderRadius:24, padding:22, borderWidth:1, borderColor:'#dde8ff', shadowColor:'#1a3ecf', shadowOffset:{width:0,height:4}, shadowOpacity:0.1, shadowRadius:12, elevation:5 },

  // Tabs
  tabRow: { flexDirection:'row', backgroundColor:'#eef2ff', borderRadius:14, padding:4, gap:4, marginBottom:18 },
  tab: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:11, borderRadius:11 },
  tabActive: { backgroundColor:Theme.colors.primary, shadowColor:Theme.colors.primary, shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:6, elevation:4 },
  tabText: { fontSize:13, fontWeight:'700', color:'#6b7faa' },
  tabTextActive: { color:'#fff' },

  // Inputs
  inputLabel: { fontSize:9.5, fontWeight:'800', color:'#6b7faa', letterSpacing:0.6, marginBottom:7 },
  inputRow: { flexDirection:'row', alignItems:'center', height:48, backgroundColor:'#f8faff', borderWidth:1.5, borderColor:'#dde8ff', borderRadius:13, paddingHorizontal:14 },
  textInput: { fontSize:14, fontWeight:'600', color:'#1e293b' },

  // Buttons
  primaryBtn:         { borderRadius:14, overflow:'hidden', marginTop:20 },
  primaryBtnGradient: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, height:52 },
  primaryBtnText:     { fontSize:15, fontWeight:'900', color:'#fff' },
  secondaryBtn:       { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, height:48, borderRadius:14, borderWidth:1.5, borderColor:Theme.colors.primary, backgroundColor:'#eff6ff' },
  secondaryBtnText:   { fontSize:14, fontWeight:'800', color:Theme.colors.primary },

  // Divider
  dividerRow: { flexDirection:'row', alignItems:'center', gap:10, marginVertical:18 },
  dividerLine: { flex:1, height:1, backgroundColor:'#e2e8f0' },
  dividerText: { fontSize:11, color:'#94a3b8', fontWeight:'600' },

  // Edit profile
  editHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  backBtnDark: { width:40, height:40, borderRadius:20, backgroundColor:'#f1f5f9', justifyContent:'center', alignItems:'center' },
  editTitle: { fontSize:18, fontWeight:'900', color:'#1e293b' },
  editLogoCard: { padding:18, borderRadius:20, alignItems:'center', marginBottom:18, shadowColor:'#1a56db', shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:10, elevation:4 },
  logoIconBg: { width:52, height:52, borderRadius:26, backgroundColor:'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center', marginBottom:8 },
  editLogoTitle: { fontSize:15, fontWeight:'800', color:'#fff' },
  editLogoSub: { fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:3, fontWeight:'600' },
  editCard: { backgroundColor:'#fff', borderRadius:20, padding:18, borderWidth:1, borderColor:'#dde8ff', shadowColor:'#1a3ecf', shadowOffset:{width:0,height:3}, shadowOpacity:0.07, shadowRadius:10, elevation:3 },

  // Avatar
  avatarWrap: { width:88, height:88, borderRadius:44, borderWidth:2, borderColor:Theme.colors.primary, position:'relative', overflow:'visible' },
  avatarImg: { width:84, height:84, borderRadius:42 },
  avatarPlaceholder: { width:84, height:84, borderRadius:42, backgroundColor:'#e2e8f5', justifyContent:'center', alignItems:'center' },
  cameraIconBadge: { position:'absolute', bottom:0, right:0, width:26, height:26, borderRadius:13, backgroundColor:Theme.colors.primary, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:'#fff' },

  // Chips
  chipGrid: { flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:6 },
  chip: { paddingHorizontal:11, paddingVertical:7, borderRadius:10, backgroundColor:'#f1f5f9', borderWidth:1.5, borderColor:'#e2e8f0' },
  chipActive: { backgroundColor:'#eff6ff', borderColor:Theme.colors.primary },
  chipText: { fontSize:11, fontWeight:'700', color:'#64748b' },
  chipTextActive: { color:Theme.colors.primary },
});
