import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, Dimensions, ScrollView,
  Platform, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Theme } from '../utils/Theme';
import { useTheme } from '../utils/ThemeContext';
import { getAllBookings, updateBookingStatus, updateBookingDetails } from '../agents/bookingAgent';
import { getSectorCoords } from '../utils/mapHelper';
import { runSchedulingAgent, runCommunicationAgent } from '../agents/allAgents';
import DrawerMenu from '../components/DrawerMenu';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { triggerLocalNotification } from '../utils/notificationHelper';

const { width } = Dimensions.get('window');

const SLOTS_LIST = [
  '9:00 AM – 11:00 AM',
  '12:00 PM – 2:00 PM',
  '2:00 PM – 4:00 PM',
  '4:00 PM – 6:00 PM',
  '6:00 PM – 8:00 PM'
];

const ALL_SERVICES_CATALOG = [
  { name: 'Plumber',          emoji: '🚰', rate: 'Rs 800–1,500',   demand: 'High Demand 🔥',     desc: 'Water supply lines, drain unclogging, tap installations, and leakage repairs.' },
  { name: 'Electrician',      emoji: '⚡', rate: 'Rs 1,000–2,000', demand: 'High Demand 🔥',     desc: 'Fan installations, short circuit diagnostics, lighting fixes, and switchboards.' },
  { name: 'AC Technician',    emoji: '❄️', rate: 'Rs 1,500–3,500', demand: 'Very High Demand 🔥', desc: 'AC filter cleaning, gas refilling, compressor repair, and installation.' },
  { name: 'Carpenter',        emoji: '🪚', rate: 'Rs 1,200–2,500', demand: 'Stable Demand 📈',    desc: 'Door repairs, hinge fittings, custom shelves, and furniture restoration.' },
  { name: 'Cleaner',          emoji: '🧹', rate: 'Rs 1,000–2,200', demand: 'High Demand 🔥',     desc: 'Full deep house cleaning, kitchen scrubbing, and floor disinfection.' },
  { name: 'Tutor',            emoji: '📚', rate: 'Rs 2,500–5,000', demand: 'Stable Demand 📈',    desc: 'Bilingual subject coaching, exam preps, and home-school assistance.' },
  { name: 'Beautician',       emoji: '💅', rate: 'Rs 1,500–4,000', demand: 'Stable Demand 📈',    desc: 'Bridal makeups, haircuts, facial cleanings, and premium nail art.' },
  { name: 'Cook',             emoji: '🍳', rate: 'Rs 1,200–2,500', demand: 'Steady Market 💼',    desc: 'Daily meal preparations, special events cooking, and kitchen hygiene.' },
  { name: 'Driver',           emoji: '🚗', rate: 'Rs 1,500–2,500', demand: 'High Demand 🔥',     desc: 'Inter-city travel, personal chauffeur duties, and safe navigation.' },
  { name: 'Painter',          emoji: '🎨', rate: 'Rs 2,000–4,500', demand: 'Steady Market 💼',    desc: 'Wall putty fillings, weather-sheet coating, and premium room paints.' },
  { name: 'Mechanic',         emoji: '🔧', rate: 'Rs 1,500–3,000', demand: 'Stable Demand 📈',    desc: 'Engine diagnostics, brake pads replacement, and periodic oil change.' },
  { name: 'Appliance Repair',  emoji: '📺', rate: 'Rs 1,000–2,500', demand: 'High Demand 🔥',     desc: 'Washing machine, microwave, refrigerator, and LED television fixes.' },
  { name: 'Gardener',         emoji: '🏡', rate: 'Rs 800–1,800',   demand: 'Stable Demand 📈',    desc: 'Lawn trimming, weeding, fertilizer dosing, and plant curation.' },
  { name: 'Pest Control',     emoji: '🐜', rate: 'Rs 2,000–4,000', demand: 'Steady Market 💼',    desc: 'Fumigation services, anti-termite sprays, and insect control.' },
  { name: 'Solar Installer',  emoji: '☀️', rate: 'Rs 4,000–8,000', demand: 'Very High Demand 🔥', desc: 'Solar panels alignment, inverter configuration, and battery checks.' },
  { name: 'CCTV Technician',  emoji: '📹', rate: 'Rs 1,500–3,000', demand: 'Stable Demand 📈',    desc: 'IP camera configurations, NVR mappings, and cabling layouts.' },
  { name: 'Welder',           emoji: '🧑‍🏭', rate: 'Rs 1,200–2,500', demand: 'Steady Market 💼',    desc: 'Iron gates welding, grill repair, and custom metal fabrication.' },
  { name: 'Sofa Cleaner',     emoji: '🛋️', rate: 'Rs 1,500–3,000', demand: 'Stable Demand 📈',    desc: 'Sofa vacuuming, fabric shampooing, and leather polish care.' },
  { name: 'Locksmith',        emoji: '🔑', rate: 'Rs 1,000–2,200', demand: 'Steady Market 💼',    desc: 'Emergency key cutting, door unlocking, and smart lock setups.' },
  { name: 'Mason',            emoji: '🧱', rate: 'Rs 1,800–3,500', demand: 'Steady Market 💼',    desc: 'Concrete works, brick laying, plastering, and tile installation.' },
  { name: 'Car Washer',       emoji: '🧼', rate: 'Rs 500–1,200',   demand: 'High Demand 🔥',     desc: 'Doorstep wash, interior vacuuming, and dashboard waxing.' },
  { name: 'Tailor',           emoji: '🪡', rate: 'Rs 1,000–2,500', demand: 'Very High Demand 🔥', desc: 'Shalwar Kameez stitching, alterations, and custom suit tailors.' },
  { name: 'Photographer',     emoji: '📷', rate: 'Rs 3,000–6,000', demand: 'Stable Demand 📈',    desc: 'Event coverages, portrait shoots, and digital photo edits.' },
  { name: 'Disinfector',      emoji: '🛡️', rate: 'Rs 1,500–2,800', demand: 'Steady Market 💼',    desc: 'Anti-viral room fogging and deep contact surface sanitization.' },
  { name: 'Physiotherapist',  emoji: '💆', rate: 'Rs 2,000–4,500', demand: 'Stable Demand 📈',    desc: 'Pain recovery therapies, muscle training, and post-surgery care.' },
  { name: 'Barber',           emoji: '💈', rate: 'Rs 800–1,800',   demand: 'High Demand 🔥',     desc: 'Doorstep haircuts, clean shaves, facials, and hair oiling.' },
  { name: 'Laptop Tech',      emoji: '💻', rate: 'Rs 1,500–3,000', demand: 'High Demand 🔥',     desc: 'OS installations, hardware upgrades, and motherboard repairs.' },
  { name: 'Roofer',           emoji: '🏠', rate: 'Rs 2,500–5,000', demand: 'Steady Market 💼',    desc: 'Roof waterproofing, leakage grouting, and tiling.' },
  { name: 'Chauffeur',        emoji: '🤵', rate: 'Rs 2,000–3,500', demand: 'Stable Demand 📈',    desc: 'Long-route luxury driving, corporate transfers, and airport pickup.' },
  { name: 'Handyman',         emoji: '🔨', rate: 'Rs 800–1,800',   demand: 'High Demand 🔥',     desc: 'General home fixes, hanging paintings, curtain rods, and shelves.' }
];

export default function ProviderDashboard({ onSwitchToCustomer }) {
  const router = useRouter();
  const [provider, setProvider] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

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
  
  // Tab control: 'bookings', 'orders', 'services', 'profile'
  const [activeTab, setActiveTab] = useState('bookings');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [bookings, setBookings] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [etaModalVisible, setEtaModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Custom Success Dialog states
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');

  // Input fields
  const [etaInput, setEtaInput] = useState('25 minutes');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Ported Customer Rescheduling Mode States
  const [reschedHour, setReschedHour] = useState('09');
  const [reschedMin, setReschedMin]   = useState('00');
  
  // High-Tech Provider Online Status & GPS Calibration States
  const [isOnline, setIsOnline] = useState(true);
  const [gpsCalibrating, setGpsCalibrating] = useState(false);
  const [preciseCoords, setPreciseCoords] = useState(null);
  const [reschedAmPm, setReschedAmPm] = useState('AM');
  const [manualTime, setManualTime]   = useState('');
  const [rescheduleMode, setRescheduleMode] = useState('clock'); // 'clock', 'type', 'slots'

  // Edit Profile states
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editService, setEditService] = useState('');
  const [editSector, setEditSector] = useState('');
  const [editAvatar, setEditAvatar] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Load provider profile and active bookings
  const loadData = useCallback(async () => {
    try {
      const savedName = await AsyncStorage.getItem('@user_name');
      const savedPhone = await AsyncStorage.getItem('@user_phone');
      const savedService = await AsyncStorage.getItem('@provider_service') || 'Plumber';
      const savedSector = await AsyncStorage.getItem('@provider_sector') || 'G-11';
      const savedAvatar = await AsyncStorage.getItem('@user_avatar');

      if (!savedName) {
        router.replace('/login');
        return;
      }

      setProvider({ name: savedName, phone: savedPhone, service: savedService, sector: savedSector, avatar: savedAvatar });

      const savedOnline = await AsyncStorage.getItem('@provider_online');
      if (savedOnline !== null) {
        setIsOnline(savedOnline === 'true');
      } else {
        setIsOnline(true);
      }
      
      const savedCoords = await AsyncStorage.getItem('@provider_coords');
      if (savedCoords) {
        setPreciseCoords(JSON.parse(savedCoords));
      }

      // Fetch bookings and filter by provider's service type
      const all = await getAllBookings();
      
      const filteredActive = all.filter(
        b => (b.service?.label?.toLowerCase() === savedService.toLowerCase() || 
             b.service?.type?.toLowerCase() === savedService.toLowerCase()) &&
             b.status !== 'completed'
      );
      setBookings(filteredActive);

      const filteredCompleted = all.filter(
        b => (b.service?.label?.toLowerCase() === savedService.toLowerCase() || 
             b.service?.type?.toLowerCase() === savedService.toLowerCase()) &&
             b.status === 'completed'
      );
      setCompletedJobs(filteredCompleted);
    } catch (e) {
      console.warn('Failed to load provider bookings:', e);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    await AsyncStorage.setItem('@provider_online', String(next));
    Alert.alert("Availability Updated", next ? "🟢 You are now ONLINE and visible to customer searches." : "🔴 You are now OFFLINE. New customer requests will not rank your profile.");
  };

  const handleCalibrateGps = async () => {
    setGpsCalibrating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Please allow location access to calibrate your doorstep coordinates.");
        setGpsCalibrating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setPreciseCoords(coords);
      await AsyncStorage.setItem('@provider_coords', JSON.stringify(coords));
      Alert.alert("GPS Calibrated! 📍", `Base locked at:\nLatitude: ${coords.latitude.toFixed(5)}\nLongitude: ${coords.longitude.toFixed(5)}\n\nThis will be utilized by AI Agents for direct distance calculations.`);
    } catch (e) {
      console.warn('GPS Calibration failed:', e);
      Alert.alert("Calibration Error", "Failed to lock GPS. Please ensure your device location is enabled and try again.");
    } finally {
      setGpsCalibrating(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const showSuccessAlert = (title, message) => {
    setSuccessTitle(title);
    setSuccessMessage(message);
    setSuccessModalVisible(true);
  };

  // Departure - ETA Confirm
  const handleMarkDeparture = (booking) => {
    setSelectedBooking(booking);
    setEtaInput('25 minutes');
    setEtaModalVisible(true);
  };

  const submitDeparture = async () => {
    if (!etaInput.trim()) {
      Alert.alert('Required', 'Please enter a valid arrival time or ETA.');
      return;
    }
    setEtaModalVisible(false);

    try {
      const updatedStatus = 'en_route';

      // Call AI CommunicationAgent to generate dispatch template
      const dispatchMessage = runCommunicationAgent(
        provider.name,
        selectedBooking.userName || 'Valued Customer',
        selectedBooking.location || provider.sector,
        etaInput.trim()
      );

      await updateBookingDetails(selectedBooking.id, {
        status: updatedStatus,
        eta: etaInput.trim(),
        departureMessage: dispatchMessage,
        acknowledged: false // Reset client acknowledgment
      });

      showSuccessAlert(
        '🚀 Dispatched Successfully',
        `Urdu/English notification sent to customer:\n\n"${dispatchMessage}"`
      );
      triggerLocalNotification(
        '🚀 Dispatch Alert: En Route! 📡',
        `Assalam-o-Alaikum! Your specialist ${provider.name || 'Specialist'} is en route to Sector ${selectedBooking.location || provider.sector || 'Islamabad'}. ETA: ${etaInput.trim()}.`
      );
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to dispatch provider.');
    }
  };

  // Rescheduling Slots
  const handleOpenReschedule = (booking) => {
    setSelectedBooking(booking);
    setSelectedSlot(booking.slot || SLOTS_LIST[0]);
    setReschedHour('09');
    setReschedMin('00');
    setReschedAmPm('AM');
    setManualTime('');
    setRescheduleMode('clock');
    setRescheduleModalVisible(true);
  };

  const submitReschedule = async () => {
    let finalTime = '';
    if (rescheduleMode === 'clock') {
      finalTime = `${reschedHour}:${reschedMin} ${reschedAmPm}`;
    } else if (rescheduleMode === 'type') {
      if (!manualTime.trim()) {
        Alert.alert('Required', 'Please enter a valid time.');
        return;
      }
      finalTime = manualTime.trim();
    } else {
      if (!selectedSlot) {
        Alert.alert('Required', 'Please select a quick slot.');
        return;
      }
      finalTime = selectedSlot;
    }

    setRescheduleModalVisible(false);
    try {
      const schedulingResult = runSchedulingAgent(selectedBooking, finalTime);
      if (!schedulingResult.success) {
        showSuccessAlert('⚠️ AI Conflict Alert', schedulingResult.reasoning);
        return;
      }

      await updateBookingDetails(selectedBooking.id, {
        slot: finalTime,
        status: 'confirmed',
        timelineStep: `Slot rescheduled by provider to ${finalTime}`
      });

      showSuccessAlert(
        '⏰ Rescheduled Slot',
        `AI has resolved all scheduling matrices successfully! Slot updated to: ${finalTime}`
      );
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to reschedule slot.');
    }
  };

  // Complete Job
  const handleCompleteJob = async (booking) => {
    try {
      await updateBookingDetails(booking.id, {
        status: 'completed',
        timelineStep: 'Service completed by provider'
      });
      showSuccessAlert(
        '✅ Job Completed!',
        `Fantastic! Job #${booking.id} has been marked complete. Earnings added to your wallet.`
      );
      triggerLocalNotification(
        '✅ Job Completed successfully! 🎉',
        `Job #${booking.id} completed. Earnings have been successfully added to your wallet.`
      );
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to complete job.');
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    setEditName(provider?.name || '');
    setEditPhone(provider?.phone || '');
    setEditService(provider?.service || '');
    setEditSector(provider?.sector || '');
    setEditAvatar(provider?.avatar || null);
    setEditProfileVisible(true);
  };

  const handlePickEditAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  const handleTakeEditPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    if (!editService.trim()) {
      Alert.alert('Required', 'Please enter your service specialization.');
      return;
    }
    if (!editSector.trim()) {
      Alert.alert('Required', 'Please enter your sector (e.g. G-11).');
      return;
    }
    setSavingProfile(true);
    try {
      await AsyncStorage.setItem('@user_name', editName.trim());
      await AsyncStorage.setItem('@user_phone', editPhone.trim());
      await AsyncStorage.setItem('@provider_service', editService.trim());
      await AsyncStorage.setItem('@provider_sector', editSector.trim());
      if (editAvatar) {
        await AsyncStorage.setItem('@user_avatar', editAvatar);
      }
      setProvider({ name: editName.trim(), phone: editPhone.trim(), service: editService.trim(), sector: editSector.trim(), avatar: editAvatar });
      setEditProfileVisible(false);
      showSuccessAlert('✅ Profile Updated!', 'Your provider profile has been saved and synced across the workspace.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Logout Profile
  const handleLogout = () => {
    Alert.alert(
      '🚪 Logout Workspace',
      'Are you sure you want to sign out from the Provider Dashboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@user_role');
            await AsyncStorage.removeItem('@user_name');
            await AsyncStorage.removeItem('@user_phone');
            await AsyncStorage.removeItem('@provider_service');
            await AsyncStorage.removeItem('@provider_sector');
            router.replace('/login');
          }
        }
      ]
    );
  };

  const calculateTotalEarnings = () => {
    return completedJobs.reduce((sum, item) => sum + (parseInt(item.cost?.estimated || 0)), 0);
  };

  const renderBookingCard = ({ item }) => {
    const providerCoords = getSectorCoords(provider?.sector || 'G-11');
    const customerCoords = getSectorCoords(item.location || 'F-7');

    return (
      <View style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, item.status === 'en_route' && { backgroundColor: activeColors.primaryGlass }]}>
              <Text style={[styles.statusText, item.status === 'en_route' && { color: Theme.colors.info }]}>{item.status.toUpperCase()}</Text>
            </View>
            {item.eta ? (
              <View style={[styles.statusBadge, { backgroundColor: activeColors.primaryGlass }]}>
                <Text style={[styles.statusText, { color: Theme.colors.primary }]}>ETA: {item.eta}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.bookingId, { color: activeColors.textMuted }]}>#{item.id}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: activeColors.borderLight }]} />

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color={activeColors.textMuted} />
          <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Customer: <Text style={{ fontWeight: '800', color: activeColors.textPrimary }}>{item.userName || 'Guest User'}</Text></Text>
        </View>

        {item.userWhatsApp ? (
          <View style={styles.infoRow}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>WhatsApp: <Text style={{ fontWeight: '700', color: activeColors.textPrimary }}>{item.userWhatsApp}</Text></Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={activeColors.textMuted} />
          <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Sector: <Text style={{ fontWeight: '700', color: activeColors.textPrimary }}>{item.location}</Text></Text>
        </View>

        {item.address ? (
          <View style={styles.infoRow}>
            <Ionicons name="home-outline" size={16} color={activeColors.textMuted} />
            <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Address: <Text style={{ fontWeight: '750', color: activeColors.textPrimary }}>{item.address}</Text></Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={activeColors.textMuted} />
          <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Slot Time: <Text style={{ fontWeight: '800', color: Theme.colors.primary }}>{item.slot}</Text></Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color={activeColors.textMuted} />
          <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Job Estimate: <Text style={{ fontWeight: '800', color: Theme.colors.success }}>PKR {item.cost?.estimated}</Text></Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={16} color={Theme.colors.primary} />
          <Text style={[styles.infoText, { color: activeColors.textSecondary }]}>Payout Method: <Text style={{ fontWeight: '800', color: Theme.colors.primary }}>{item.paymentMethod || 'Cash payment'}</Text></Text>
        </View>

        {item.departureMessage && (
          <View style={[styles.dispatchMessageContainer, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
            <Text style={[styles.dispatchLabel, { color: activeColors.textPrimary }]}>💬 Dispatch Message Sent:</Text>
            <Text style={[styles.dispatchContent, { color: activeColors.textSecondary }]}>"{item.departureMessage}"</Text>
          </View>
        )}

        <View style={styles.miniMapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.miniMap}
            initialRegion={{
              latitude: (providerCoords.latitude + customerCoords.latitude) / 2,
              longitude: (providerCoords.longitude + customerCoords.longitude) / 2,
              latitudeDelta: Math.abs(providerCoords.latitude - customerCoords.latitude) * 2 || 0.05,
              longitudeDelta: Math.abs(providerCoords.longitude - customerCoords.longitude) * 2 || 0.05,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            <Marker coordinate={providerCoords} title="Your Base" pinColor="#10b981" />
            <Marker coordinate={customerCoords} title="Customer Sector" pinColor="#2563eb" />
          </MapView>
        </View>

        <TouchableOpacity 
          style={styles.navigateBtn} 
          onPress={() => {
            const dest = item.address ? `Sector ${item.location} ${item.address}` : `Sector ${item.location}`;
            const query = encodeURIComponent(`Islamabad ${dest}`);
            const url = Platform.select({
              ios: `maps://?q=${query}`,
              android: `geo:0,0?q=${query}`
            });
            Linking.openURL(url).catch(() => {
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
            });
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-circle" size={16} color="#fff" />
          <Text style={styles.navigateBtnText}>
            {item.address ? '📍 Locate & Drive to Doorstep' : '📍 Locate & Drive to Sector'}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {item.status === 'en_route' ? (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#10b981' }]} 
              onPress={() => handleCompleteJob(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Complete Job</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.departureBtn]} 
              onPress={() => handleMarkDeparture(item)}
            >
              <Ionicons name="paper-plane" size={15} color="#fff" />
              <Text style={styles.actionBtnText}>Mark Departure</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionBtn, styles.rescheduleBtn]} onPress={() => handleOpenReschedule(item)}>
            <Ionicons name="time" size={15} color="#475569" />
            <Text style={[styles.actionBtnText, { color: '#475569' }]}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCompletedCard = ({ item }) => (
    <View style={[styles.card, { borderColor: activeColors.border, backgroundColor: activeColors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: theme === 'dark' ? '#064e3b' : '#ecfdf5' }]}>
          <Text style={[styles.statusText, { color: '#10b981' }]}>COMPLETED</Text>
        </View>
        <Text style={[styles.bookingId, { color: activeColors.textMuted }]}>#{item.id}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: activeColors.borderLight }]} />
      <Text style={{ fontSize: 13, fontWeight: '750', color: activeColors.textPrimary }}>👤 Client: {item.userName}</Text>
      <Text style={{ fontSize: 11, color: activeColors.textMuted, marginTop: 4 }}>📍 Service sector: {item.location}</Text>
      <Text style={{ fontSize: 11, color: activeColors.textMuted, marginTop: 2 }}>⏰ Service slot: {item.slot}</Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10b981', marginTop: 8 }}>💼 Earnings Collected: PKR {item.cost?.estimated}</Text>
      <Text style={{ fontSize: 11, color: Theme.colors.primary, marginTop: 4, fontWeight: '700' }}>💳 Payout Method: {item.paymentMethod || 'Cash payment'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chatSessions={[]}
      />
      {/* Dynamic Main Header */}
      <LinearGradient colors={theme === 'dark' ? ['#0f172a', '#1e293b'] : ['#1e3a8a', '#3b82f6']} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={{ padding: 4 }} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Text style={styles.titleText}>Service Provider Workspace</Text>
            <Text style={styles.subText}>{provider?.name} · {provider?.service} Specialist</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.switchBtn} 
          onPress={() => {
            if (onSwitchToCustomer) {
              onSwitchToCustomer();
            } else {
              router.push('/(tabs)/chat');
            }
          }} 
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={16} color="#fff" />
          <Text style={styles.switchText}>Customer Mode</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Structured Segmented Tab Control */}
      <View style={[styles.tabContainer, { backgroundColor: activeColors.surface, borderBottomColor: activeColors.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'bookings' && styles.activeTab, activeTab !== 'bookings' && { backgroundColor: activeColors.surface }]}
          onPress={() => setActiveTab('bookings')}
        >
          <Ionicons name="clipboard-outline" size={14} color={activeTab === 'bookings' ? '#fff' : activeColors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText, activeTab !== 'bookings' && { color: activeColors.textSecondary }]}>Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'orders' && styles.activeTab, activeTab !== 'orders' && { backgroundColor: activeColors.surface }]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons name="checkmark-done" size={14} color={activeTab === 'orders' ? '#fff' : activeColors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText, activeTab !== 'orders' && { color: activeColors.textSecondary }]}>Completed</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'services' && styles.activeTab, activeTab !== 'services' && { backgroundColor: activeColors.surface }]}
          onPress={() => setActiveTab('services')}
        >
          <Ionicons name="search" size={14} color={activeTab === 'services' ? '#fff' : activeColors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText, activeTab !== 'services' && { color: activeColors.textSecondary }]}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'profile' && styles.activeTab, activeTab !== 'profile' && { backgroundColor: activeColors.surface }]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons name="construct-outline" size={14} color={activeTab === 'profile' ? '#fff' : activeColors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText, activeTab !== 'profile' && { color: activeColors.textSecondary }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Switching */}
      {activeTab === 'bookings' && (
        bookings.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: activeColors.background }]}>
            <Ionicons name="notifications-off-outline" size={56} color={activeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: activeColors.textPrimary }]}>All caught up!</Text>
            <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>No active booking requests in G-11/Islamabad sector right now.</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            renderItem={renderBookingCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )
      )}

      {activeTab === 'orders' && (
        completedJobs.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: activeColors.background }]}>
            <Ionicons name="cash-outline" size={56} color={activeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: activeColors.textPrimary }]}>No Completed Jobs</Text>
            <Text style={[styles.emptyText, { color: activeColors.textSecondary }]}>Complete active jobs from your requests screen to register earnings and review scores.</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Wallet Earnings Banner */}
            <LinearGradient colors={['#10b981', '#059669']} style={styles.walletBanner}>
              <Ionicons name="wallet" size={32} color="#fff" />
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '850', color: 'rgba(255,255,255,0.75)' }}>TOTAL PKR WALLET EARNINGS</Text>
                <Text style={{ fontSize: 22, fontWeight: '950', color: '#fff', marginTop: 2 }}>PKR {calculateTotalEarnings()}</Text>
              </View>
            </LinearGradient>

            {/* Target Progress Meter */}
            <View style={{ backgroundColor: activeColors.surface, marginHorizontal: 12, marginTop: 8, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: activeColors.border, ...Theme.shadows.card }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '900', color: activeColors.textSecondary }}>🎯 Monthly target progress (PKR 50,000)</Text>
                <Text style={{ fontSize: 10.5, fontWeight: '950', color: Theme.colors.success }}>
                  {Math.round(Math.min(100, (calculateTotalEarnings() / 50000) * 100))}%
                </Text>
              </View>
              {/* Progress track */}
              <View style={{ height: 8, backgroundColor: activeColors.backgroundAlt, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: '#10b981', width: `${Math.min(100, (calculateTotalEarnings() / 50000) * 100)}%` }} />
              </View>
              
              {/* Specialization Milestones Row */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                <View style={{ backgroundColor: theme === 'dark' ? '#064e3b' : '#f0fdf4', borderWidth: 1, borderColor: theme === 'dark' ? '#047857' : '#bbf7d0', borderRadius: 8, padding: 6, flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#16a34a' }}>TOP SPECIALIST</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: '950', color: '#15803d', marginTop: 2 }}>🏆 Active Badge</Text>
                </View>
                <View style={{ backgroundColor: theme === 'dark' ? '#0c4a6e' : '#eff6ff', borderWidth: 1, borderColor: theme === 'dark' ? '#1d4ed8' : '#bfdbfe', borderRadius: 8, padding: 6, flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#2563eb' }}>RESPONSE SPEED</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: '950', color: '#1d4ed8', marginTop: 2 }}>⚡ Swift (5m)</Text>
                </View>
                <View style={{ backgroundColor: theme === 'dark' ? '#701a75' : '#fdf2f8', borderWidth: 1, borderColor: theme === 'dark' ? '#db2777' : '#fbcfe8', borderRadius: 8, padding: 6, flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#db2777' }}>JOB RETENTION</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: '950', color: '#be185d', marginTop: 2 }}>💯 100% Rate</Text>
                </View>
              </View>
            </View>
            <FlatList
              data={completedJobs}
              renderItem={renderCompletedCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          </View>
        )
      )}

      {activeTab === 'profile' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={[styles.profileCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <View style={[styles.avatarCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(59, 130, 246, 0.12)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.2)' }]}>
              {provider?.avatar ? (
                <Image source={{ uri: provider.avatar }} style={{ width: 60, height: 60, borderRadius: 30 }} />
              ) : (
                <Ionicons name="construct" size={36} color={isDark ? '#fff' : Theme.colors.primary} />
              )}
            </View>
            <Text style={[styles.providerProfileName, { color: activeColors.textPrimary }]}>{provider?.name}</Text>
            <Text style={[styles.providerProfileService, { color: activeColors.textSecondary }]}>{provider?.service} Specialist</Text>
            <Text style={[styles.providerProfileSector, { color: activeColors.textMuted }]}>Islamabad Sector {provider?.sector}</Text>
            
            {/* Glowing Availability Badge inside profile card */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? '#10b981' : '#ef4444' }} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: isOnline ? '#34d399' : '#f87171' }}>
                {isOnline ? '🟢 ONLINE & ACCEPTING DISPATCHES' : '🔴 OFFLINE (PAUSED)'}
              </Text>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 16,
                backgroundColor: Theme.colors.primary,
                paddingVertical: 11,
                paddingHorizontal: 28,
                borderRadius: 14,
                shadowColor: Theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={handleOpenEditProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={17} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Operational Control Center */}
          <View style={[styles.statsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statsTitle, { color: activeColors.textPrimary }]}>OPERATIONAL CONTROL CENTER</Text>
            
            {/* Live Availability Toggle Switch Button */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isOnline ? (theme === 'dark' ? '#064e3b' : '#ecfdf5') : (theme === 'dark' ? '#7f1d1d' : '#fef2f2'), borderWidth: 1.5, borderColor: isOnline ? (theme === 'dark' ? '#047857' : '#a7f3d0') : (theme === 'dark' ? '#b91c1c' : '#fecaca'), padding: 14, borderRadius: 16, marginBottom: 12 }} 
              onPress={handleToggleOnline}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={isOnline ? "radio" : "ellipse-outline"} size={22} color={isOnline ? "#10b981" : "#ef4444"} />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: isOnline ? (theme === 'dark' ? '#a7f3d0' : '#065f46') : (theme === 'dark' ? '#fca5a5' : '#991b1b') }}>Duty Status</Text>
                  <Text style={{ fontSize: 10.5, color: isOnline ? (theme === 'dark' ? '#34d399' : '#047857') : (theme === 'dark' ? '#ef4444' : '#b91c1c'), fontWeight: '600', marginTop: 1 }}>
                    {isOnline ? 'Tap to go Offline (Hidden)' : 'Tap to go Online (Visible)'}
                  </Text>
                </View>
              </View>
              <Ionicons name={isOnline ? "checkmark-circle" : "close-circle"} size={24} color={isOnline ? "#10b981" : "#ef4444"} />
            </TouchableOpacity>

            {/* GPS Base Calibration Button */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme === 'dark' ? '#0c4a6e' : '#eff6ff', borderWidth: 1.5, borderColor: theme === 'dark' ? '#1d4ed8' : '#bfdbfe', padding: 14, borderRadius: 16 }} 
              onPress={handleCalibrateGps}
              disabled={gpsCalibrating}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="location-sharp" size={22} color="#2563eb" />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: theme === 'dark' ? '#bfdbfe' : '#1e3a8a' }}>GPS Doorstep Calibration</Text>
                  <Text style={{ fontSize: 10.5, color: theme === 'dark' ? '#60a5fa' : '#1d4ed8', fontWeight: '600', marginTop: 1 }}>
                    {gpsCalibrating ? 'Acquiring GPS Lock...' : preciseCoords ? '📍 Precise Coords Locked!' : 'Calibrate precise GPS base location'}
                  </Text>
                </View>
              </View>
              <Ionicons name="sync" size={18} color="#2563eb" style={{ transform: [{ rotate: gpsCalibrating ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {/* Dynamic HSL-Tinted Dark Mode Switcher Row */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1e1b4b' : '#faf5ff', borderWidth: 1.5, borderColor: isDark ? '#4338ca' : '#e9d5ff', padding: 14, borderRadius: 16, marginTop: 12 }} 
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={22} color={isDark ? "#818cf8" : "#a855f7"} />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: isDark ? '#e0e7ff' : '#6b21a8' }}>Workspace Theme</Text>
                  <Text style={{ fontSize: 10.5, color: isDark ? '#c7d2fe' : '#7e22ce', fontWeight: '600', marginTop: 1 }}>
                    {isDark ? 'Dark Mode Active (Tap to swap)' : 'Light Mode Active (Tap to swap)'}
                  </Text>
                </View>
              </View>
              <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: isDark ? '#4f46e5' : '#cbd5e1', padding: 2, justifyContent: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignSelf: isDark ? 'flex-end' : 'flex-start', elevation: 1 }} />
              </View>
            </TouchableOpacity>

            {preciseCoords && (
              <View style={{ marginTop: 10, backgroundColor: activeColors.backgroundAlt, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: activeColors.border }}>
                <Text style={{ fontSize: 10, fontWeight: '850', color: activeColors.textMuted }}>CALIBRATED GPS LOCATION:</Text>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: activeColors.textPrimary, marginTop: 4 }}>Lat: {preciseCoords.latitude.toFixed(6)} · Lng: {preciseCoords.longitude.toFixed(6)}</Text>
              </View>
            )}
          </View>

          <View style={[styles.statsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.statsTitle, { color: activeColors.textPrimary }]}>OPERATIONAL ANALYTICS</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
                <Text style={[styles.statLabel, { color: activeColors.textMuted }]}>COMPLETED</Text>
                <Text style={[styles.statVal, { color: activeColors.textPrimary }]}>{completedJobs.length} Jobs</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
                <Text style={[styles.statLabel, { color: activeColors.textMuted }]}>RATING</Text>
                <Text style={[styles.statVal, { color: activeColors.textPrimary }]}>4.9 ★</Text>
              </View>
            </View>

            <View style={[styles.divider, { marginVertical: 14, backgroundColor: activeColors.borderLight }]} />
            <Text style={[styles.statsTitle, { marginBottom: 6, color: activeColors.textPrimary }]}>Registered Mobile</Text>
            <Text style={{ fontSize: 14, fontWeight: '750', color: activeColors.textPrimary }}>📞 {provider?.phone}</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.logoutBtnText}>Sign Out from Workspace</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'services' && (
        <View style={{ flex: 1 }}>
          {/* Beautiful Services Directory Search Area */}
          <View style={[styles.searchBarContainer, { backgroundColor: activeColors.surface, borderBottomColor: activeColors.border }]}>
            <View style={[styles.searchBarInner, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
              <Ionicons name="search" size={18} color={activeColors.textMuted} />
              <TextInput
                style={[styles.searchInputField, { color: activeColors.textPrimary }]}
                placeholder="Search 30+ home services..."
                placeholderTextColor={activeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={activeColors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={ALL_SERVICES_CATALOG.filter(s =>
              s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.desc.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={item => item.name}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.serviceItemCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={styles.serviceItemHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.serviceEmojiCircle, { backgroundColor: activeColors.backgroundAlt }]}>
                      <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                    </View>
                    <View>
                      <Text style={[styles.serviceItemName, { color: activeColors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.serviceItemRate, { color: activeColors.textSecondary }]}>Market Rate: {item.rate}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.demandBadge, 
                    item.demand.includes('Very High') ? { backgroundColor: '#fef2f2' } :
                    item.demand.includes('High') ? { backgroundColor: '#fff7ed' } : { backgroundColor: '#f0fdf4' }
                  ]}>
                    <Text style={[
                      styles.demandText,
                      item.demand.includes('Very High') ? { color: '#ef4444' } :
                      item.demand.includes('High') ? { color: '#f97316' } : { color: '#16a34a' }
                    ]}>{item.demand}</Text>
                  </View>
                </View>
                <Text style={[styles.serviceItemDesc, { color: activeColors.textMuted }]}>{item.desc}</Text>
              </View>
            )}
          />
        </View>
      )}

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editProfileVisible} transparent animationType="slide" onRequestClose={() => setEditProfileVisible(false)}>
        <View style={[styles.modalBackdrop, { justifyContent: 'flex-end' }]}>
          <View style={[styles.modalContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border, maxHeight: '92%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: activeColors.textPrimary }]}>✏️ Edit Provider Profile</Text>
              <Text style={[styles.modalDesc, { color: activeColors.textSecondary }]}>Update your professional details. Changes will sync across the workspace immediately.</Text>

              {/* Avatar Picker */}
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: activeColors.backgroundAlt, borderWidth: 2, borderColor: Theme.colors.primary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                  {editAvatar ? (
                    <Image source={{ uri: editAvatar }} style={{ width: 80, height: 80 }} />
                  ) : (
                    <Ionicons name="construct" size={36} color={Theme.colors.primary} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: activeColors.backgroundAlt, borderWidth: 1, borderColor: activeColors.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}
                    onPress={handleTakeEditPhoto}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={15} color={Theme.colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: Theme.colors.primary }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: activeColors.backgroundAlt, borderWidth: 1, borderColor: activeColors.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}
                    onPress={handlePickEditAvatar}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={15} color={Theme.colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: Theme.colors.primary }}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name */}
              <Text style={[styles.modalLabel, { color: activeColors.textMuted }]}>FULL NAME</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border, color: activeColors.textPrimary }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Ali Hassan"
                placeholderTextColor={activeColors.textMuted}
              />

              {/* Phone */}
              <Text style={[styles.modalLabel, { color: activeColors.textMuted }]}>PHONE NUMBER</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border, color: activeColors.textPrimary }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. 03001234567"
                placeholderTextColor={activeColors.textMuted}
                keyboardType="phone-pad"
              />

              {/* Service */}
              <Text style={[styles.modalLabel, { color: activeColors.textMuted }]}>SERVICE SPECIALIZATION</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border, color: activeColors.textPrimary }]}
                value={editService}
                onChangeText={setEditService}
                placeholder="e.g. Electrician"
                placeholderTextColor={activeColors.textMuted}
              />

              {/* Sector */}
              <Text style={[styles.modalLabel, { color: activeColors.textMuted }]}>HOME SECTOR (ISLAMABAD)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border, color: activeColors.textPrimary }]}
                value={editSector}
                onChangeText={setEditSector}
                placeholder="e.g. G-11"
                placeholderTextColor={activeColors.textMuted}
              />

              <View style={[styles.modalBtnRow, { marginTop: 8 }]}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelModalBtn]} onPress={() => setEditProfileVisible(false)} disabled={savingProfile}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.confirmModalBtn, savingProfile && { opacity: 0.7 }]} onPress={handleSaveProfile} disabled={savingProfile}>
                  <Text style={styles.confirmModalText}>{savingProfile ? 'Saving...' : '💾 Save Profile'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ETA MODAL */}
      <Modal visible={etaModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.modalTitle, { color: activeColors.textPrimary }]}>🚀 Confirm Departure</Text>
            <Text style={[styles.modalDesc, { color: activeColors.textSecondary }]}>Specify your estimated arrival time (ETA) or how long you will take to arrive at the customer location.</Text>
            
            <Text style={[styles.modalLabel, { color: activeColors.textMuted }]}>ESTIMATED ARRIVAL TIME (ETA)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border, color: activeColors.textPrimary }]}
              value={etaInput}
              onChangeText={setEtaInput}
              placeholder="e.g. 25 minutes or 2:30 PM"
              placeholderTextColor={activeColors.textMuted}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelModalBtn]} onPress={() => setEtaModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmModalBtn]} onPress={submitDeparture}>
                <Text style={styles.confirmModalText}>Confirm & SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RESCHEDULE MODAL */}
      <Modal visible={rescheduleModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
            <Text style={[styles.modalTitle, { color: activeColors.textPrimary }]}>⏰ Reschedule Time Slot</Text>
            <Text style={[styles.modalDesc, { color: activeColors.textSecondary }]}>Choose an interactive, custom, or quick slot. Our AI Scheduling Agent will verify constraints instantly.</Text>

            {/* Custom Mode Tabs */}
            <View style={styles.clockToggleRow}>
              <TouchableOpacity 
                style={[styles.clockToggleBtn, { backgroundColor: activeColors.backgroundAlt }, rescheduleMode === 'clock' && { backgroundColor: Theme.colors.primary }]} 
                onPress={() => setRescheduleMode('clock')}
              >
                <Text style={[styles.clockToggleText, { color: activeColors.textSecondary }, rescheduleMode === 'clock' && { color: '#fff' }]}>🕒 Clock</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.clockToggleBtn, { backgroundColor: activeColors.backgroundAlt }, rescheduleMode === 'type' && { backgroundColor: Theme.colors.primary }]} 
                onPress={() => setRescheduleMode('type')}
              >
                <Text style={[styles.clockToggleText, { color: activeColors.textSecondary }, rescheduleMode === 'type' && { color: '#fff' }]}>✍️ Type</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.clockToggleBtn, { backgroundColor: activeColors.backgroundAlt }, rescheduleMode === 'slots' && { backgroundColor: Theme.colors.primary }]} 
                onPress={() => setRescheduleMode('slots')}
              >
                <Text style={[styles.clockToggleText, { color: activeColors.textSecondary }, rescheduleMode === 'slots' && { color: '#fff' }]}>📋 Slots</Text>
              </TouchableOpacity>
            </View>

            {rescheduleMode === 'clock' && (
              <View>
                <View style={styles.clockWidget}>
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity 
                      style={styles.chevronBtn} 
                      onPress={() => {
                        const nextHour = (parseInt(reschedHour) % 12) + 1;
                        setReschedHour(nextHour.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-up" size={20} color={Theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={[styles.flipCard, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
                      <Text style={[styles.flipValText, { color: activeColors.textPrimary }]}>{reschedHour}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.chevronBtn} 
                      onPress={() => {
                        const prevHour = parseInt(reschedHour) - 1;
                        const finalHour = prevHour === 0 ? 12 : prevHour;
                        setReschedHour(finalHour.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-down" size={20} color={Theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.colonSeparator, { color: activeColors.textPrimary }]}>:</Text>

                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity 
                      style={styles.chevronBtn} 
                      onPress={() => {
                        const nextMin = (parseInt(reschedMin) + 5) % 60;
                        setReschedMin(nextMin.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-up" size={20} color={Theme.colors.primary} />
                    </TouchableOpacity>
                    <View style={[styles.flipCard, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
                      <Text style={[styles.flipValText, { color: activeColors.textPrimary }]}>{reschedMin}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.chevronBtn} 
                      onPress={() => {
                        const prevMin = (parseInt(reschedMin) - 5 + 60) % 60;
                        setReschedMin(prevMin.toString().padStart(2, '0'));
                      }}
                    >
                      <Ionicons name="chevron-down" size={20} color={Theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.ampmContainer}>
                    <TouchableOpacity 
                      style={[styles.ampmBtn, { backgroundColor: activeColors.backgroundAlt }, reschedAmPm === 'AM' && styles.ampmActive]} 
                      onPress={() => setReschedAmPm('AM')}
                    >
                      <Text style={[styles.ampmText, { color: activeColors.textSecondary }, reschedAmPm === 'AM' && styles.ampmActiveText]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.ampmBtn, { backgroundColor: activeColors.backgroundAlt }, reschedAmPm === 'PM' && styles.ampmActive]} 
                      onPress={() => setReschedAmPm('PM')}
                    >
                      <Text style={[styles.ampmText, { color: activeColors.textSecondary }, reschedAmPm === 'PM' && styles.ampmActiveText]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {rescheduleMode === 'type' && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.inputLabel, { color: activeColors.textMuted }]}>ENTER BOOKING TIME DIRECTLY</Text>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border, color: activeColors.textPrimary }]} 
                  placeholder="e.g. 04:30 PM" 
                  placeholderTextColor={activeColors.textMuted} 
                  value={manualTime} 
                  onChangeText={setManualTime} 
                />
              </View>
            )}

            {rescheduleMode === 'slots' && (
              <ScrollView style={{ maxHeight: 150, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
                {SLOTS_LIST.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotItem, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }, selectedSlot === slot && { backgroundColor: activeColors.primaryGlass, borderColor: Theme.colors.primary }]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[styles.slotItemText, { color: activeColors.textSecondary }, selectedSlot === slot && { color: Theme.colors.primary, fontWeight: '750' }]}>{slot}</Text>
                    {selectedSlot === slot && <Ionicons name="checkmark-circle" size={16} color={Theme.colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelModalBtn]} onPress={() => setRescheduleModalVisible(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmModalBtn]} onPress={submitReschedule}>
                <Text style={styles.confirmModalText}>Reschedule Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PREMIUM CUSTOM DIALOG */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: activeColors.surface, borderColor: activeColors.border, alignItems: 'center', padding: 24 }]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={44} color="#10b981" />
            </View>
            <Text style={[styles.successTitleText, { color: activeColors.textPrimary }]}>{successTitle}</Text>
            <Text style={[styles.successDescText, { color: activeColors.textSecondary }]}>{successMessage}</Text>
            <TouchableOpacity 
              style={styles.successCloseBtn}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.successCloseBtnText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: '950', color: '#fff' },
  subText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  switchText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  
  // Tab styles
  tabContainer: { flexDirection: 'row', backgroundColor: Theme.colors.backgroundAlt, margin: 12, padding: 4, borderRadius: 16, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  activeTab: { backgroundColor: Theme.colors.primary, ...Theme.shadows.soft },
  tabText: { fontSize: 10.5, fontWeight: '800', color: Theme.colors.textSecondary },
  activeTabText: { color: '#fff' },

  // List card styles
  listContent: { padding: 12, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: Theme.colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: Theme.colors.border, ...Theme.shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  statusBadge: { backgroundColor: Theme.colors.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: '900', color: Theme.colors.success },
  bookingId: { fontSize: 11, fontWeight: '900', color: Theme.colors.primary },
  divider: { height: 1, backgroundColor: Theme.colors.borderLight, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  infoText: { fontSize: 12.5, color: Theme.colors.textSecondary, fontWeight: '600' },
  
  dispatchMessageContainer: { backgroundColor: '#eff6ff', padding: 10, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: Theme.colors.primary, marginVertical: 8 },
  dispatchLabel: { fontSize: 9.5, fontWeight: '850', color: Theme.colors.primary, marginBottom: 3 },
  dispatchContent: { fontSize: 11.5, color: '#1e40af', fontStyle: 'italic', fontWeight: '700', lineHeight: 16 },
  
  miniMapContainer: { height: 240, borderRadius: 14, overflow: 'hidden', marginVertical: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  miniMap: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10 },
  departureBtn: { backgroundColor: Theme.colors.primary },
  rescheduleBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  actionBtnText: { fontSize: 11.5, fontWeight: '850', color: '#fff' },

  // Navigate Button
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 42,
    marginTop: 10,
    marginBottom: 4,
    ...Theme.shadows.soft,
  },
  navigateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },

  // Services Directory Styles
  searchBarContainer: {
    padding: 12,
    backgroundColor: Theme.colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    gap: 8
  },
  searchInputField: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary
  },
  serviceItemCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 8,
    ...Theme.shadows.card
  },
  serviceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  serviceEmojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dde3f5'
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.textPrimary
  },
  serviceItemRate: {
    fontSize: 11,
    color: Theme.colors.primary,
    fontWeight: '750',
    marginTop: 2
  },
  demandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  demandText: {
    fontSize: 9.5,
    fontWeight: '850'
  },
  serviceItemDesc: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
    fontWeight: '500'
  },

  // Orders styles
  walletBanner: { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, padding: 18, borderRadius: 20, ...Theme.shadows.medium },
  
  // Profile tab styles
  profileCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, alignItems: 'center', ...Theme.shadows.medium },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  providerProfileName: { fontSize: 16, fontWeight: '950', color: '#fff' },
  providerProfileService: { fontSize: 12, color: '#38bdf8', marginTop: 4, fontWeight: '750' },
  providerProfileSector: { fontSize: 10.5, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  
  statsCard: { backgroundColor: Theme.colors.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: Theme.colors.border, marginTop: 14, ...Theme.shadows.card },
  statsTitle: { fontSize: 11, fontWeight: '850', color: Theme.colors.textMuted, letterSpacing: 0.5, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: Theme.colors.backgroundAlt, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 14, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 8.5, fontWeight: '800', color: Theme.colors.textSecondary },
  statVal: { fontSize: 14, fontWeight: '900', color: Theme.colors.textPrimary, marginTop: 4 },
 
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, backgroundColor: Theme.colors.error, borderRadius: 14, marginTop: 14, ...Theme.shadows.soft },
  logoutBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
 
  // Empty requests
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: Theme.colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 12.5, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
 
  // Modal styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 31, 92, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: Theme.colors.surface, borderRadius: 24, padding: 20, ...Theme.shadows.premium },
  modalTitle: { fontSize: 15, fontWeight: '950', color: Theme.colors.textPrimary, marginBottom: 8 },
  modalDesc: { fontSize: 11.5, color: Theme.colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  modalLabel: { fontSize: 9.5, fontWeight: '800', color: Theme.colors.textMuted, letterSpacing: 0.6, marginBottom: 6 },
  modalInput: { height: 46, backgroundColor: Theme.colors.backgroundAlt, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 13, fontWeight: '600', color: Theme.colors.textPrimary, marginBottom: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 8 },
  modalBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelModalBtn: { backgroundColor: Theme.colors.backgroundAlt },
  confirmModalBtn: { backgroundColor: Theme.colors.primary },
  cancelModalText: { fontSize: 12, fontWeight: '850', color: Theme.colors.textSecondary },
  confirmModalText: { fontSize: 12, fontWeight: '850', color: '#fff' },
  slotItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 6, backgroundColor: Theme.colors.backgroundAlt, borderWidth: 1, borderColor: Theme.colors.border },
  activeSlotItem: { borderColor: Theme.colors.primary, backgroundColor: Theme.colors.primaryGlass },
  slotItemText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textSecondary },
  activeSlotItemText: { color: Theme.colors.primary },
 
  // Success modal styles
  successIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Theme.colors.successLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTitleText: { fontSize: 16, fontWeight: '950', color: Theme.colors.textPrimary, textAlign: 'center' },
  successDescText: { fontSize: 12.5, color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 10 },
  successCloseBtn: { marginTop: 24, width: '100%', height: 46, backgroundColor: Theme.colors.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  successCloseBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
 
  // Clock interactive styles
  clockToggleRow:  { flexDirection: 'row', backgroundColor: Theme.colors.backgroundAlt, borderRadius: 12, padding: 4, marginBottom: 16 },
  clockToggleBtn:  { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  clockToggleActive:{ backgroundColor: Theme.colors.surface, ...Theme.shadows.soft },
  clockToggleText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  clockToggleActiveText: { color: Theme.colors.primary, fontWeight: '800' },
  clockWidget:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 10 },
  flipCard:        { backgroundColor: Theme.colors.backgroundAlt, padding: 12, borderRadius: 16, alignItems: 'center', width: 70, borderWidth: 1, borderColor: Theme.colors.border },
  flipValText:     { fontSize: 28, fontWeight: '900', color: Theme.colors.primary },
  chevronBtn:      { padding: 4 },
  colonSeparator:  { fontSize: 28, fontWeight: '900', color: '#64748b' },
  ampmContainer:   { flexDirection: 'row', backgroundColor: Theme.colors.backgroundAlt, borderRadius: 10, padding: 3, gap: 4 },
  ampmBtn:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  ampmActive:      { backgroundColor: Theme.colors.primary },
  ampmText:        { fontSize: 12, fontWeight: '700', color: '#64748b' },
  ampmActiveText:  { color: '#fff', fontWeight: '800' },
  inputLabel:      { fontSize: 10, fontWeight: '800', color: Theme.colors.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  textInput:       { backgroundColor: Theme.colors.backgroundAlt, borderWidth: 1.5, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Theme.colors.textPrimary, fontWeight: '600' }
});
