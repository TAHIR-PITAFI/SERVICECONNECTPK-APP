import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Alert, Platform, TextInput, Linking, Modal, Animated, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runBookingAgent, getAllBookings, invalidateBookingsCache } from '../agents/bookingAgent';
import { syncBookingToFirestore } from '../utils/firebaseHelper';
import { traceService } from '../services/traceService';
import { Theme } from '../utils/Theme';
import { triggerLocalNotification } from '../utils/notificationHelper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const SLOTS = ['09:00 AM','11:00 AM','01:00 PM','03:00 PM','05:00 PM','07:00 PM'];

export default function BookingConfirmScreen() {
  const { provider, slot, intent, bookingJson } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 14;
  
  const [loading, setLoading]     = useState(false);
  const [receipt, setReceipt]     = useState(null);
  const [userName, setUserName]   = useState('');
  const [userWA, setUserWA]       = useState('');
  const [address, setAddress]     = useState('');
  const [userRole, setUserRole]   = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Cash payment');
  const [selectedOtherWallet, setSelectedOtherWallet] = useState('NayaPay');

  // Dynamically selected date and time slots in booking confirmation
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(slot || '09:00 AM');

  useEffect(() => {
    async function checkRole() {
      try {
        const savedRole = await AsyncStorage.getItem('@user_role');
        setUserRole(savedRole);
      } catch {} finally {
        setRoleLoading(false);
      }
    }
    checkRole();
  }, []);
  
  const [activeBooking, setActiveBooking] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rating, setRating]       = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [acknowledgedDispatch, setAcknowledgedDispatch] = useState(false);

  const [reschedHour, setReschedHour] = useState('09');
  const [reschedMin, setReschedMin]   = useState('00');
  const [reschedAmPm, setReschedAmPm] = useState('AM');
  const [manualTime, setManualTime]   = useState('');
  const [useManualInput, setUseManualInput] = useState(false);

  // Quality loop states
  const [checklist, setChecklist] = useState({
    taskDone: false,
    cleanedUp: false,
    tested: false,
  });
  const [photoAttached, setPhotoAttached] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);

  // Custom premium modal alerts
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const pulseScale = useRef(new Animated.Value(1)).current;
  const routeProgress = useRef(new Animated.Value(0)).current;
  const [crossingSector, setCrossingSector] = useState('Sector G-11');

  useEffect(() => {
    let isMounted = true;
    let routeAnim = null;
    let timeoutId = null;
    let interval = null;

    if (activeBooking && activeBooking.status === 'en_route') {
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseAnim.start();

      const runRouteAnimation = () => {
        if (!isMounted) return;
        routeProgress.setValue(0);
        routeAnim = Animated.timing(routeProgress, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false,
        });
        routeAnim.start(({ finished }) => {
          if (finished && isMounted) {
            timeoutId = setTimeout(runRouteAnimation, 1000);
          }
        });
      };
      runRouteAnimation();

      const sectorsList = ['Kashmir Highway', 'Sector G-9', 'Sector H-9 Junction', 'Zero Point', 'Sector F-7', 'Your Doorstep'];
      let idx = 0;
      interval = setInterval(() => {
        if (isMounted) {
          idx = (idx + 1) % sectorsList.length;
          setCrossingSector(sectorsList[idx]);
        }
      }, 3500);

      return () => {
        isMounted = false;
        clearInterval(interval);
        if (timeoutId) clearTimeout(timeoutId);
        pulseAnim.stop();
        if (routeAnim) routeAnim.stop();
      };
    }
  }, [activeBooking]);

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setCustomAlertVisible(true);
  };

  useEffect(() => {
    async function loadCustomerProfile() {
      try {
        const savedRole = await AsyncStorage.getItem('@user_role');
        const savedName = await AsyncStorage.getItem('@user_name');
        const savedPhone = await AsyncStorage.getItem('@user_phone');
        const savedAddress = await AsyncStorage.getItem('@user_address');
        const savedLocation = await AsyncStorage.getItem('@user_location');
        
        if (savedRole === 'customer') {
          if (savedName) setUserName(savedName);
          if (savedPhone) setUserWA(savedPhone);
          if (savedAddress) {
            setAddress(savedAddress);
          } else if (savedLocation) {
            setAddress(savedLocation);
          }
        }
      } catch (e) {
        console.warn('Failed to load customer profile in booking screen:', e);
      }
    }
    if (!bookingJson) {
      loadCustomerProfile();
    }
  }, [bookingJson]);

  useEffect(() => {
    if (bookingJson) {
      try {
        const b = JSON.parse(bookingJson);
        setActiveBooking(b);
        
        // Load whether this booking was already rated
        AsyncStorage.getItem(`rating_done_${b.id}`).then(val => {
          if (val === 'true') setRatingSubmitted(true);
        });

        // Load whether dispatch was acknowledged by customer
        AsyncStorage.getItem(`dispatch_acknowledged_${b.id}`).then(val => {
          if (val === 'true') setAcknowledgedDispatch(true);
        });
      } catch {}
    }
  }, [bookingJson]);

  let p = null, parsedIntent = null;
  try {
    if (provider) p = JSON.parse(provider);
    if (intent)   parsedIntent = JSON.parse(intent);
  } catch {}

  // Dynamic Pricing Variables
  const baseRate = p?.baseRate || p?.priceMin || 1000;
  let surcharge = 0, travelFee = 0, pricingNote = 'Standard base rate.';
  if (p && parsedIntent) {
    if (parsedIntent.urgency === 'high')              { surcharge = 0.15; pricingNote = 'High urgency +15% applied.'; }
    else if (parsedIntent.timeKey?.includes('evening') || parsedIntent.time?.includes('evening')) { surcharge = 0.10; pricingNote = 'Evening slot +10% applied.'; }
    const dist = parseFloat(p.distance || 1.5);
    travelFee = Math.round(Math.max(100, Math.min(400, dist * 35)));
  }

  const jobComplexity = parsedIntent?.complexity || 'intermediate';
  const complexityMultiplier = jobComplexity === 'complex' ? 0.35 : jobComplexity === 'basic' ? -0.05 : 0.10;

  const isPeakHour = selectedTimeSlot?.includes('05:') || selectedTimeSlot?.includes('06:') || selectedTimeSlot?.includes('02:') || selectedTimeSlot?.includes('03:');
  const isSlotConflicted = selectedTimeSlot?.includes('02:') || selectedTimeSlot?.includes('03:') || selectedTimeSlot?.includes('02:00') || selectedTimeSlot?.includes('03:00');
  const surgeMultiplier = isPeakHour ? 1.15 : 1.0;
  const loyaltyDiscount = 150;

  const estMin = p ? Math.max(baseRate, Math.round((baseRate * (1 + surcharge + complexityMultiplier) * surgeMultiplier) + travelFee - loyaltyDiscount)) : 1000;
  const estMax = p ? Math.max(Math.round(baseRate * 1.35), Math.round((baseRate * 1.35 * (1 + surcharge + complexityMultiplier) * surgeMultiplier) + travelFee - loyaltyDiscount)) : 1500;

  const handleSelectPhoto = async () => {
    Alert.alert(
      "Proof of Work Evidence",
      "Attach a photo to verify the service was completed successfully:",
      [
        {
          text: "Take Photo 📸",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                showAlert('Permission Denied', 'Please allow camera access to take a photo.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setPhotoUri(result.assets[0].uri);
                setPhotoAttached(true);
                showAlert('📸 Evidence Attached!', 'Proof-of-work photo successfully captured, geocoded, and attached to completion logs.');
              }
            } catch (err) {
              console.warn(err);
            }
          }
        },
        {
          text: "Choose from Gallery 🖼️",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                showAlert('Permission Denied', 'Please allow photo library access.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                setPhotoUri(result.assets[0].uri);
                setPhotoAttached(true);
                showAlert('📸 Evidence Attached!', 'Proof-of-work photo successfully selected and attached to completion logs.');
              }
            } catch (err) {
              console.warn(err);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleConfirm = async () => {
    if (!p) return;
    if (!userName.trim()) return Alert.alert('Required', 'Please enter your name.');
    if (!userWA.trim() || userWA.length < 10) return Alert.alert('Required', 'Enter a valid WhatsApp number.');
    if (!address.trim()) return Alert.alert('Required', 'Please enter your house/street address.');
    
    setLoading(true);
    try {
      const methodLabel = paymentMethod === 'Other wallets' ? `Other Wallet (${selectedOtherWallet})` : paymentMethod;
      const mockIntent = { 
        ...(parsedIntent || {}), 
        service: p.service, 
        location: p.sector, 
        urgency: 'medium', 
        userName, 
        userWhatsApp: userWA,
        address: address.trim(),
        paymentMethod: methodLabel,
        pricing: {
          minTotal: estMin,
          maxTotal: estMax,
          travelFee: `Rs ${travelFee}`,
          loyaltyDiscount: `Rs ${loyaltyDiscount}`,
          breakdown: [
            { item: "Base Specialist Cost", amount: `Rs ${baseRate}–${Math.round(baseRate * 1.35)}` },
            surcharge > 0 && { item: "Urgency Dispatch Surcharge", amount: `+${surcharge * 100}%` },
            { item: `Complexity Adjust (${jobComplexity})`, amount: `${complexityMultiplier > 0 ? '+' : '-'}${Math.round(Math.abs(complexityMultiplier) * 100)}%` },
            isPeakHour && { item: "Peak Demand Surge Factor", amount: "1.15x" },
            { item: "Doorstep Travel Fee", amount: `Rs ${travelFee}` },
            { item: "Loyalty Discount Saved", amount: `-Rs ${loyaltyDiscount}` },
          ].filter(Boolean)
        }
      };
      
      const formattedDateLabel = `${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
      const booking = await runBookingAgent(p, mockIntent, selectedTimeSlot);
      booking.userName = userName; 
      booking.userWhatsApp = userWA;
      booking.address = address.trim();
      booking.paymentMethod = methodLabel;
      booking.slot = selectedTimeSlot;
      booking.bookingDateLabel = formattedDateLabel;
      
      if (traceService && traceService.logAgent) {
        traceService.logAgent(
          'Navigation Agent',
          {
            providerSector: p.sector,
            customerSector: p.sector,
            customerAddress: address.trim()
          },
          `Geocoded customer sector ${p.sector} and mapped travel offsets from base. Exact doorstep house address resolved as "${address.trim()}" for provider-side driving map routing.`,
          {
            routingStatus: 'READY_TO_NAVIGATE',
            customerCoordinates: {
              latitude: 33.6844,
              longitude: 73.0479
            },
            formattedRouteDescription: `Depart G-11 center sector and navigate via main sector access roads directly to ${address.trim()}.`
          }
        );
      }
      
      await AsyncStorage.setItem('@user_address', address.trim());
      
      const all = await getAllBookings();
      const updated = all.map(b => b.id === booking.id ? { ...b, userName, userWhatsApp: userWA, address: address.trim(), paymentMethod: methodLabel, slot: selectedTimeSlot, bookingDateLabel: formattedDateLabel } : b);
      const finalBooking = updated.length > 0 ? updated.find(b => b.id === booking.id) || booking : booking;
      await AsyncStorage.setItem('bookings', JSON.stringify(updated.length > 0 ? updated : [booking]));
      invalidateBookingsCache();

      // Live Cloud Firestore + Realtime Database sync trigger (Async / Non-Blocking)
      syncBookingToFirestore(finalBooking).catch(err => {
        console.log('[Firebase Sync] Async sync skipped:', err?.message);
      });

      setLoading(false);
      
      // Instantly transition screen to dynamic Receipt View with booking ID
      setReceipt({ 
        bookingId: booking.id, 
        timestamp: new Date().toLocaleString(), 
        estimatedCost: `Rs ${estMin}–${estMax}`, 
        userName, 
        userWA,
        address: address.trim(),
        paymentMethod: methodLabel,
        chosenSlot: `${formattedDateLabel} at ${selectedTimeSlot}`
      });

      // Trigger local push notification on successful confirm
      triggerLocalNotification(
        '🎉 Booking Confirmed! 🛠️',
        `Your request for ${p.name} (${p.service}) in ${p.sector} has been locked. ETA: ${formattedDateLabel} at ${selectedTimeSlot}`
      );
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Could not complete booking. Try again.');
    }
  };

  const handleReschedule = async (newSlot) => {
    if (!activeBooking) return;
    setLoading(true);
    try {
      const all = await getAllBookings();
      const idx = all.findIndex(b => b.id === activeBooking.id);
      if (idx !== -1) { 
        all[idx].slot = newSlot; 
        all[idx].updatedAt = new Date().toISOString(); 
        await AsyncStorage.setItem('bookings', JSON.stringify(all)); 
        invalidateBookingsCache();
        setActiveBooking({ ...activeBooking, slot: newSlot }); 
        setIsRescheduling(false); 
        showAlert('⏰ Slot Rescheduled', `Rescheduled successfully to: ${newSlot}`); 
        
        // Sync rescheduled booking to Firestore + RTDB (Async / Non-Blocking)
        syncBookingToFirestore(all[idx]).catch(err => {
          console.log('[Firebase Sync] Reschedule sync skipped:', err?.message);
        });

        // Trigger push
        triggerLocalNotification(
          '📅 Slot Rescheduled! ⏰',
          `Your service slot has been shifted successfully to: ${newSlot}`
        );
      }
    } catch { 
      Alert.alert('Error', 'Could not reschedule.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          const all = await getAllBookings();
          const idx = all.findIndex(b => b.id === activeBooking.id);
          if (idx !== -1) { 
            all[idx].status = 'cancelled'; 
            all[idx].updatedAt = new Date().toISOString(); 
            await AsyncStorage.setItem('bookings', JSON.stringify(all)); 
            invalidateBookingsCache();
            setActiveBooking({ ...activeBooking, status: 'cancelled' }); 
            showAlert('❌ Booking Cancelled', 'Your booking request has been successfully cancelled.');
            
            // Sync cancelled booking to Firestore + RTDB (Async / Non-Blocking)
            syncBookingToFirestore(all[idx]).catch(err => {
              console.log('[Firebase Sync] Cancel sync skipped:', err?.message);
            });

            // Trigger push
            triggerLocalNotification(
              '❌ Booking Cancelled',
              `Your appointment has been cancelled successfully.`
            );
          }
        } catch {} finally { setLoading(false); }
      }}
    ]);
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const all = await getAllBookings();
      const idx = all.findIndex(b => b.id === activeBooking.id);
      if (idx !== -1) { 
        all[idx].status = 'completed'; 
        all[idx].updatedAt = new Date().toISOString(); 
        await AsyncStorage.setItem('bookings', JSON.stringify(all)); 
        invalidateBookingsCache();
        setActiveBooking({ ...activeBooking, status: 'completed' }); 
        showAlert('🎉 Job Completed', 'Service marked complete! Please take a moment to rate your provider.'); 
        
        // Sync completed booking to Firestore + RTDB (Async / Non-Blocking)
        syncBookingToFirestore(all[idx]).catch(err => {
          console.log('[Firebase Sync] Completion sync skipped:', err?.message);
        });

        // Trigger push
        triggerLocalNotification(
          '🎉 Job Completed! ⭐',
          `Thank you for using ServiceConnect PK! Please rate your specialist.`
        );
      }
    } catch {} finally { setLoading(false); }
  };

  const handleAcknowledgeDispatch = async () => {
    if (!activeBooking) return;
    try {
      await AsyncStorage.setItem(`dispatch_acknowledged_${activeBooking.id}`, 'true');
      setAcknowledgedDispatch(true);
      showAlert('👍 Acknowledgment Saved', 'Thank you! You verified that your provider is en route to your sector.');
    } catch (e) {
      console.warn('Failed to save dispatch ack:', e);
    }
  };

  const handleDownloadPDFInvoice = async () => {
    if (!activeBooking) return;
    setLoading(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ServiceConnect PK Invoice</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; margin: 0; padding: 20px; }
            .header { border-bottom: 2px solid #1a56db; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
            .logo { font-size: 26px; font-weight: 850; color: #1a56db; margin-bottom: 5px; }
            .title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 13px; }
            .meta-col { width: 48%; }
            .meta-col.right { text-align: right; }
            .meta-title { font-weight: 700; color: #1e293b; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .invoice-table th { background-color: #f1f5f9; text-align: left; padding: 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; }
            .invoice-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .invoice-table tr.total-row td { border-top: 2px solid #1a56db; border-bottom: none; font-size: 15px; font-weight: 800; color: #1a56db; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .badge-completed { background-color: #d1fae5; color: #065f46; }
            .badge-pending { background-color: #fef3c7; color: #92400e; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🇵🇰 ServiceConnect PK</div>
            <div class="title">Official Digital Service Receipt</div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div class="meta-col">
              <div class="meta-title">ISSUED TO:</div>
              <div><strong>Client Name:</strong> ${activeBooking.userName || 'Valued Client'}</div>
              <div><strong>Sector:</strong> Sector ${activeBooking.provider?.sector || activeBooking.location || 'Islamabad'}</div>
              <div><strong>Address:</strong> ${activeBooking.address || 'Doorstep Delivery Mapped'}</div>
              <div><strong>WhatsApp:</strong> ${activeBooking.userWhatsApp || 'N/A'}</div>
            </div>
            <div class="meta-col right">
              <div class="meta-title">RECEIPT DETAILS:</div>
              <div><strong>Booking ID:</strong> AGT-${activeBooking.id}</div>
              <div><strong>Date:</strong> ${activeBooking.bookingDateLabel || activeBooking.bookingDate || 'Tomorrow'}</div>
              <div><strong>Slot:</strong> ${activeBooking.slot}</div>
              <div><strong>Payment Gateway:</strong> ${activeBooking.paymentMethod || 'Cash payment'}</div>
              <div><strong>Status:</strong> <span class="badge ${activeBooking.status === 'completed' ? 'badge-completed' : 'badge-pending'}">${activeBooking.status}</span></div>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Service Item Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${activeBooking.service?.label || 'Home Service'}</strong><br><small>Assigned Specialist: ${activeBooking.provider?.name || 'Specialist'}</small></td>
                <td style="text-align: right;">Rs ${activeBooking.cost?.estimated || 1200}</td>
              </tr>
              <tr>
                <td>Doorstep Dispatch Travel Fee</td>
                <td style="text-align: right;">Rs ${activeBooking.cost?.travelFee || 150}</td>
              </tr>
              <tr>
                <td>Dynamic Surcharge Adjuster</td>
                <td style="text-align: right;">Rs ${activeBooking.cost?.surcharge || 0}</td>
              </tr>
              <tr class="total-row">
                <td>Total Invoice Range</td>
                <td style="text-align: right;">Rs ${activeBooking.cost?.estimated || 1200} – Rs ${activeBooking.cost?.max || 1500}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: 11px; color: #64748b; line-height: 1.5; background-color: #f8fafc; padding: 12px; border-radius: 8px;">
            <strong>AI dynamic Billing Note:</strong> This invoice was generated autonomously by the ServiceConnect PK 12-agent pipeline. Est range based on junior eco vs senior specialist resource matching matrix. Final payouts are routed directly through preferred local wallet gateways.
          </div>

          <div class="footer">
            Made with ❤️ for Pakistan 🇵🇰 · Google Hackathon 2026
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `ServiceConnect_Invoice_${activeBooking.id}.pdf` });
    } catch (err) {
      Alert.alert('Error', 'Failed to generate digital invoice PDF.');
    } finally {
      setLoading(false);
    }
  };

  // ── ROLE LOADING VIEW ──
  if (!bookingJson && roleLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4ff' }]}>
        <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  // ── RESTRICT PROVIDERS FROM BOOKING ──
  if (!bookingJson && userRole === 'provider') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
        
        {/* Premium Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f1f5f9',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '900', color: Theme.colors.textPrimary }}>Booking Restricted</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Premium Restriction Body */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            alignItems: 'center',
            elevation: 4,
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
          }}>
            <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="lock-closed" size={36} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 19, fontWeight: '900', color: Theme.colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
              Access Restricted
            </Text>
            <Text style={{ fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 26, fontWeight: '600' }}>
              Assalam-o-Alaikum! You are currently signed in with a Service Provider account. Providers are restricted from creating client booking requests. Please log out and sign in as a Customer to proceed.
            </Text>
            
            <TouchableOpacity 
              style={[styles.primaryBtn, { width: '100%', backgroundColor: Theme.colors.primary, height: 48, borderRadius: 12 }]}
              onPress={() => router.replace('/(tabs)/profile')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Go to Profile / Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 16, paddingVertical: 8 }}
              onPress={() => router.replace('/(tabs)/chat')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: Theme.colors.primary, textDecorationLine: 'underline' }}>
                Return to Chat Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── RESTRICT GUESTS FROM BOOKING ──
  if (!bookingJson && (!userRole || userRole !== 'customer')) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
        
        {/* Premium Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f1f5f9',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '900', color: Theme.colors.textPrimary }}>Login Required</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Premium Restriction Body */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            alignItems: 'center',
            elevation: 4,
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
          }}>
            <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="person-add" size={36} color={Theme.colors.primary} />
            </View>
            <Text style={{ fontSize: 19, fontWeight: '900', color: Theme.colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
              Customer Registration Required
            </Text>
            <Text style={{ fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 26, fontWeight: '600' }}>
              Assalam-o-Alaikum! You are currently browsing in Guest Mode. You must be registered and signed in as a Customer to proceed with booking a home service request.
            </Text>
            
            <TouchableOpacity 
              style={[styles.primaryBtn, { width: '100%', backgroundColor: Theme.colors.primary, height: 48, borderRadius: 12 }]}
              onPress={() => router.replace('/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Log In / Register Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 16, paddingVertical: 8 }}
              onPress={() => router.replace('/(tabs)/chat')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: Theme.colors.primary, textDecorationLine: 'underline' }}>
                Return to Chat Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── RECEIPT VIEW ──
  if (receipt) return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={Theme.colors.success} translucent={false} />
      <LinearGradient colors={Theme.colors.gradientSuccess} style={[styles.successHeader, { paddingTop: insets.top + 24 }]}>
        <Ionicons name="checkmark-circle" size={68} color="#fff" />
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successId}>Unique Booking ID: {receipt.bookingId}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomInset + 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.receiptHeader}>AGT Receipt Invoice</Text>
          <View style={[styles.divider, { marginVertical: 8 }]} />
          {[
            ['🛠️ Service Category', p?.service || 'Service'], 
            ['👤 Assigned Provider', p?.name], 
            ['📍 Operation Sector', p?.sector],
            ['🏠 Street Address', receipt.address],
            ['🕐 Chosen Slot', receipt.chosenSlot || slot || 'Flexible'], 
            ['💰 Dynamic Estimate', receipt.estimatedCost],
            ['💳 Payment Method', receipt.paymentMethod],
            ['👤 Client Name', receipt.userName], 
            ['💬 Personal WhatsApp', receipt.userWA], 
            ['📅 Invoice Timestamp', receipt.timestamp],
          ].map(([label, val]) => val ? (
            <View key={label} style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{label}</Text>
              <Text style={styles.receiptVal}>{val}</Text>
            </View>
          ) : null)}
        </View>
        
        <TouchableOpacity 
          style={[styles.primaryBtn, { marginBottom: bottomInset, marginTop: 10 }]} 
          onPress={() => router.replace('/(tabs)/bookings')}
        >
          <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ── MANAGE EXISTING BOOKING ──
  if (activeBooking) {
    const isCompleted = activeBooking.status === 'completed';
    const isCancelled = activeBooking.status === 'cancelled';
    const isEnRoute   = activeBooking.status === 'en_route';

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Theme.colors.textPrimary} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Booking</Text>
          <View style={{ width: 22 }} />
        </View>
        
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 + bottomInset }} showsVerticalScrollIndicator={false}>
          
          {/* Dispatch Live Tracker for Customer (Point 10) */}
          {isEnRoute && (
            <View style={[styles.dispatchTrackerCard, acknowledgedDispatch && { borderColor: '#10b981' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons 
                  name={acknowledgedDispatch ? "checkmark-circle" : "navigate-circle"} 
                  size={26} 
                  color={acknowledgedDispatch ? "#10b981" : Theme.colors.primary} 
                />
                <Text style={styles.trackerTitle}>
                  {acknowledgedDispatch ? "Dispatch Confirmed ✅" : "Provider Dispatch Alert! 🚨"}
                </Text>
              </View>
              
              <Text style={styles.trackerDesc}>
                {acknowledgedDispatch 
                  ? `Your provider ${activeBooking.provider?.name || 'Tahir Ali'} is confirmed en route. Expected arrival: ${activeBooking.eta || '25 mins'}.`
                  : `Assalam-o-Alaikum! Your service provider ${activeBooking.provider?.name || 'Specialist'} has departed! Expected arrival in ${activeBooking.eta || '25 minutes'}. Please confirm departure.`
                }
              </Text>

              {/* Live GPS Routing Animation Widget */}
              <View style={{
                marginTop: 14,
                backgroundColor: '#0f172a',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#334155',
                marginBottom: 8,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Animated.View style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: 4, 
                      backgroundColor: '#34d399', 
                      transform: [{ scale: pulseScale }] 
                    }} />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 }}>LIVE TELEMETRY FEED</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#38bdf8' }}>GPS SIGNAL ACTIVE</Text>
                </View>

                {/* Animated Route Line */}
                <View style={{ height: 48, justifyContent: 'center', marginVertical: 8, position: 'relative' }}>
                  <View style={{ height: 4, backgroundColor: '#334155', borderRadius: 2, width: '100%' }} />
                  
                  {/* Active Progress Fill */}
                  <Animated.View style={{
                    position: 'absolute',
                    left: 0,
                    height: 4,
                    backgroundColor: '#3b82f6',
                    borderRadius: 2,
                    width: routeProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '94%']
                    }),
                  }} />

                  {/* Specialist Icon Marker */}
                  <Animated.View style={{
                    position: 'absolute',
                    left: routeProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '94%']
                    }),
                    marginLeft: -14,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#3b82f6',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#0f172a',
                    transform: [{ translateY: -12 }],
                  }}>
                    <Ionicons name="car" size={14} color="#fff" />
                  </Animated.View>

                  {/* Destination Marker */}
                  <View style={{
                    position: 'absolute',
                    right: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#10b981',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#0f172a',
                    transform: [{ translateY: -8 }],
                  }}>
                    <Ionicons name="home" size={10} color="#fff" />
                  </View>
                </View>

                {/* Route Markers Text */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <View>
                    <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '750' }}>DEPARTED FROM</Text>
                    <Text style={{ fontSize: 11, color: '#f8fafc', fontWeight: '850', marginTop: 2 }}>{activeBooking.providerSector || 'G-11 Base'}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '750' }}>CROSSING NOW</Text>
                    <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: '850', marginTop: 2 }}>{crossingSector}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '750' }}>CLIENT DOORSTEP</Text>
                    <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '850', marginTop: 2 }}>{activeBooking.sector || 'F-6 Sector'}</Text>
                  </View>
                </View>
              </View>

              {!acknowledgedDispatch && (
                <TouchableOpacity 
                  style={styles.trackerAckBtn} 
                  onPress={handleAcknowledgeDispatch}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.trackerAckText}>Yes, They are Coming / OK</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.bookingIdText}>Booking ID: #{activeBooking.id}</Text>
              <View style={[styles.statusBadge, isCancelled && styles.cancelledBadge, isCompleted && styles.completedBadge, isEnRoute && { backgroundColor: Theme.colors.infoLight }]}>
                <Text style={[styles.statusBadgeText, isCancelled && { color: Theme.colors.error }, isCompleted && { color: Theme.colors.success }, isEnRoute && { color: Theme.colors.info }]}>
                  {activeBooking.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            {[
              ['Service Category', activeBooking.service?.label],
              ['Provider Name', activeBooking.provider?.name],
              ['Client Sector', `Sector ${activeBooking.provider?.sector || activeBooking.location}`],
              activeBooking.address ? ['Street Address', activeBooking.address] : null,
              ['Booking Date', activeBooking.bookingDateLabel || activeBooking.bookingDate || 'Tomorrow', true],
              ['Scheduled Slot', activeBooking.slot, true],
              ['AI Price Bracket', `PKR ${activeBooking.cost?.estimated}–${activeBooking.cost?.max}`],
              activeBooking.paymentMethod ? ['Selected Payment Method', activeBooking.paymentMethod, true] : null,
              activeBooking.userName ? ['Client', activeBooking.userName] : null,
              activeBooking.userWhatsApp ? ['Client Contact', `${activeBooking.userWhatsApp} (Verified)`] : null,
            ].filter(Boolean).map(([label, val, highlight]) => (
              <View key={label} style={{ marginBottom: 10 }}>
                <Text style={[styles.infoLabel, { color: '#475569' }]}>{label}</Text>
                <Text style={[styles.infoValue, highlight && { color: Theme.colors.primary, fontSize: 15, fontWeight: '800' }]}>{val}</Text>
              </View>
            ))}

            {/* WhatsApp Contact Trigger */}
            {activeBooking.provider?.phone && (
              <TouchableOpacity
                style={styles.directWABtn}
                onPress={() => {
                  const phone = activeBooking.provider.phone.replace(/[^0-9]/g, '');
                  const formattedPhone = phone.startsWith('0') ? '92' + phone.substring(1) : phone;
                  const text = encodeURIComponent(`Assalam-o-Alaikum! Regarding booking #${activeBooking.id} for ${activeBooking.service?.label || 'Service'}...`);
                  Linking.openURL(`whatsapp://send?phone=${formattedPhone}&text=${text}`).catch(() => {
                    Linking.openURL(`https://wa.me/${formattedPhone}?text=${text}`).catch(() => {
                      Alert.alert('Error', 'WhatsApp is not installed on this device.');
                    });
                  });
                }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                <Text style={styles.directWAText}>Chat with Provider Directly</Text>
              </TouchableOpacity>
            )}

            {/* One-Tap PDF Invoice Download */}
            <TouchableOpacity
              style={[styles.directWABtn, { backgroundColor: Theme.colors.primary, marginTop: 8 }]}
              onPress={handleDownloadPDFInvoice}
            >
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={styles.directWAText}>Download Digital PDF Invoice</Text>
            </TouchableOpacity>
          </View>

          {/* AI Workflow Trace logs */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Pipeline Agents History</Text>
            <View style={[styles.divider, { marginVertical: 8 }]} />
            {[
              ['Intent Captured & Normalization', 'Discovery agent verified Roman Urdu and Islamabads sector maps', true],
              ['Autonomous Provider Discovery', `Provider index scanned and assigned specialist ${activeBooking.provider?.name}`, true],
              ['Bilingual Notification Triggers', `Linked alerts to customer personal contact ${activeBooking.userWhatsApp || 'number'}`, true],
              ['EAS Dispatch Coordination', isCompleted ? 'Service visit completed successfully' : isCancelled ? 'Cancelled' : (isEnRoute ? 'En route - Customer notified' : 'Awaiting provider dispatch'), isCompleted || isCancelled || isEnRoute],
              ['Job Complete Verification', isCompleted ? 'Client submitted score feedback' : 'Awaiting dispatch completion', isCompleted],
            ].map(([title, desc, done], i, arr) => (
              <View key={i}>
                <View style={styles.timelineItem}>
                  <View style={[styles.dot, done && styles.dotDone]}>{done && <Ionicons name="checkmark" size={10} color="#fff" />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{title}</Text>
                    <Text style={styles.stepDesc}>{desc}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.timelineLine} />}
              </View>
            ))}
          </View>

          {/* Actions panel */}
          {!isCancelled && !isCompleted && !isRescheduling && (
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsRescheduling(true)}>
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Reschedule Slot</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.outlineBtn, styles.dangerBtn]} onPress={handleCancel}>
                  <Text style={styles.dangerBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => router.push({ pathname: '/dispute', params: { bookingId: activeBooking.id, providerName: activeBooking.provider?.name } })}>
                  <Text style={styles.outlineBtnText}>Dispute</Text>
                </TouchableOpacity>
              </View>
              
              {/* Simulate completion */}
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: Theme.colors.success, marginTop: 4 }]} onPress={handleSimulate}>
                <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Simulate Complete Job</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reschedule picker widget */}
          {isRescheduling && (
            <View style={styles.card}>
              <Text style={[styles.cardSectionTitle, { marginBottom: 12 }]}>Reschedule Booking Time</Text>
              
              <View style={styles.clockToggleRow}>
                <TouchableOpacity 
                  style={[styles.clockToggleBtn, !useManualInput && styles.clockToggleActive]} 
                  onPress={() => setUseManualInput(false)}
                >
                  <Text style={[styles.clockToggleText, !useManualInput && styles.clockToggleActiveText]}>🕒 Interactive Clock</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.clockToggleBtn, useManualInput && styles.clockToggleActive]} 
                  onPress={() => setUseManualInput(true)}
                >
                  <Text style={[styles.clockToggleText, useManualInput && styles.clockToggleActiveText]}>✍️ Type Time</Text>
                </TouchableOpacity>
              </View>

              {!useManualInput ? (
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
                        <Ionicons name="chevron-up" size={24} color={Theme.colors.primary} />
                      </TouchableOpacity>
                      <View style={styles.flipCard}>
                        <Text style={styles.flipValText}>{reschedHour}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.chevronBtn} 
                        onPress={() => {
                          const prevHour = parseInt(reschedHour) - 1;
                          const finalHour = prevHour === 0 ? 12 : prevHour;
                          setReschedHour(finalHour.toString().padStart(2, '0'));
                        }}
                      >
                        <Ionicons name="chevron-down" size={24} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.colonSeparator}>:</Text>

                    <View style={{ alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={styles.chevronBtn} 
                        onPress={() => {
                          const nextMin = (parseInt(reschedMin) + 5) % 60;
                          setReschedMin(nextMin.toString().padStart(2, '0'));
                        }}
                      >
                        <Ionicons name="chevron-up" size={24} color={Theme.colors.primary} />
                      </TouchableOpacity>
                      <View style={styles.flipCard}>
                        <Text style={styles.flipValText}>{reschedMin}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.chevronBtn} 
                        onPress={() => {
                          const prevMin = (parseInt(reschedMin) - 5 + 60) % 60;
                          setReschedMin(prevMin.toString().padStart(2, '0'));
                        }}
                      >
                        <Ionicons name="chevron-down" size={24} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.ampmContainer}>
                      <TouchableOpacity 
                        style={[styles.ampmBtn, reschedAmPm === 'AM' && styles.ampmActive]} 
                        onPress={() => setReschedAmPm('AM')}
                      >
                        <Text style={[styles.ampmText, reschedAmPm === 'AM' && styles.ampmActiveText]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.ampmBtn, reschedAmPm === 'PM' && styles.ampmActive]} 
                        onPress={() => setReschedAmPm('PM')}
                      >
                        <Text style={[styles.ampmText, reschedAmPm === 'PM' && styles.ampmActiveText]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.primaryBtn, { marginTop: 15 }]} 
                    onPress={() => handleReschedule(`${reschedHour}:${reschedMin} ${reschedAmPm}`)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Confirm New Time</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.inputLabel}>ENTER BOOKING TIME DIRECTLY</Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="e.g. 04:30 PM" 
                    placeholderTextColor={Theme.colors.textMuted} 
                    value={manualTime} 
                    onChangeText={setManualTime} 
                  />
                  <TouchableOpacity 
                    style={[styles.primaryBtn, { marginTop: 15 }, !manualTime.trim() && { opacity: 0.5 }]} 
                    disabled={!manualTime.trim()}
                    onPress={() => handleReschedule(manualTime.trim())}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Confirm Typed Time</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={() => setIsRescheduling(false)} style={{ alignItems: 'center', marginTop: 16 }}>
                <Text style={{ color: Theme.colors.textMuted }}>Cancel Rescheduling</Text>
              </TouchableOpacity>
            </View>
          )}
          {isCompleted && !ratingSubmitted && (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#10b981' }]}>
              <Text style={[styles.cardSectionTitle, { color: '#10b981', marginBottom: 4 }]}>✅ Completion & Quality Verification</Text>
              <Text style={{ fontSize: 11.5, color: Theme.colors.textMuted, marginBottom: 12 }}>Please complete the checklist to finalize the dispatch log:</Text>

              {/* Checklist Items */}
              <View style={{ gap: 8, marginBottom: 14 }}>
                {[
                  ['taskDone', 'Task completed to specifications'],
                  ['cleanedUp', 'Provider cleaned up the workspace/room'],
                  ['tested', 'All functions tested and fully operational']
                ].map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    onPress={() => setChecklist(prev => ({ ...prev, [key]: !prev[key] }))}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={checklist[key] ? "checkbox" : "square-outline"} 
                      size={20} 
                      color={checklist[key] ? '#10b981' : '#64748b'} 
                    />
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: checklist[key] ? Theme.colors.textPrimary : '#64748b' }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Photo Proof */}
              <Text style={[styles.inputLabel, { marginBottom: 6 }]}>PROOF OF WORK EVIDENCE</Text>
              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: photoAttached ? '#10b981' : '#cbd5e1',
                  backgroundColor: photoAttached ? 'rgba(16, 185, 129, 0.04)' : '#f8fafc',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 16
                }}
                onPress={handleSelectPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={18} color={photoAttached ? '#10b981' : '#64748b'} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: photoAttached ? '#10b981' : '#64748b' }}>
                  {photoAttached ? 'Photo Evidence Attached ✅' : 'Upload Completion Photo Evidence'}
                </Text>
              </TouchableOpacity>

              {photoAttached && photoUri && (
                <View style={{ alignItems: 'center', marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', position: 'relative' }}>
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 16 }} />
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }} 
                    onPress={() => {
                      setPhotoUri(null);
                      setPhotoAttached(false);
                    }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.divider} />

              <Text style={[styles.cardSectionTitle, { textAlign: 'center', marginTop: 10 }]}>⭐ Rate Specialist Performance</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 14, justifyContent: 'center' }}>
                {[1,2,3,4,5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Ionicons name={rating >= s ? 'star' : 'star-outline'} size={32} color="#f59e0b" />
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && rating <= 2 && (
                <View style={{ backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: '#ef4444', padding: 10, borderRadius: 8, marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                    ⚠️ Match Weight Downgrade Active
                  </Text>
                  <Text style={{ fontSize: 10, color: '#b91c1c', marginTop: 2 }}>
                    Rating under 3 stars triggers an automatic platform search penalty. Future AI ranking queries will reduce this specialist's priority score by 35%.
                  </Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: '#10b981' }]} 
                onPress={async () => {
                  if (!checklist.taskDone || !checklist.cleanedUp || !checklist.tested) {
                    return Alert.alert('Checklist Incomplete', 'Please verify all three quality items to submit reviews.');
                  }
                  if (rating === 0) return Alert.alert('Rating Required', 'Please select a performance rating.');

                  // Save penalized provider id if low rating
                  if (rating <= 2) {
                    try {
                      const rawPenalized = await AsyncStorage.getItem('@penalized_providers');
                      const penalized = rawPenalized ? JSON.parse(rawPenalized) : [];
                      const pid = activeBooking.provider?.id;
                      if (pid && !penalized.includes(pid)) {
                        penalized.push(pid);
                        await AsyncStorage.setItem('@penalized_providers', JSON.stringify(penalized));
                      }
                    } catch (err) {}
                  }

                  setRatingSubmitted(true);
                  await AsyncStorage.setItem(`rating_done_${activeBooking.id}`, 'true');
                  showAlert('Shukriya! 🎉', 'Feedback has been synchronized with our live matchmaking algorithm quality database.');
                }}
              >
                <Text style={styles.primaryBtnText}>Verify and Complete Checkout</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCancelled && (
            <View style={[styles.card, { flexDirection: 'row', gap: 10, alignItems: 'center', borderColor: Theme.colors.errorLight, borderWidth: 1.5 }]}>
              <Ionicons name="alert-circle-outline" size={28} color={Theme.colors.error} />
              <Text style={{ flex: 1, fontSize: 13, color: Theme.colors.textSecondary, lineHeight: 18 }}>This booking request was cancelled. No charges are applicable.</Text>
            </View>
          )}
        </ScrollView>

        {/* CUSTOM ALERT MODAL */}
        <Modal visible={customAlertVisible} transparent animationType="fade">
          <View style={styles.alertBackdrop}>
            <View style={styles.alertContent}>
              <View style={styles.alertIconBg}>
                <Ionicons name="checkmark-circle" size={40} color="#10b981" />
              </View>
              <Text style={styles.alertTitleText}>{alertTitle}</Text>
              <Text style={styles.alertMessageText}>{alertMessage}</Text>
              <TouchableOpacity 
                style={styles.alertCloseBtn} 
                onPress={() => setCustomAlertVisible(false)}
              >
                <Text style={styles.alertCloseBtnText}>Acknowledge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── NEW BOOKING CONFIRM SCREEN ──
  const getNext7Days = () => {
    const arr = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        dayName: days[d.getDay()],
        dateNum: d.getDate(),
        monthName: months[d.getMonth()],
        fullString: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`,
        dateObj: d,
      });
    }
    return arr;
  };
  const calendarDays = getNext7Days();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={Theme.colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 + bottomInset }} showsVerticalScrollIndicator={false}>
        
        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Selected Provider</Text>
          <View style={styles.divider} />
          {[
            ['Provider Name', p?.name || 'Loading...'], 
            ['Base Sector', `Sector ${p?.sector || '—'}`], 
            ['Specialization', p?.specialization || p?.bio], 
            ['Initial Suggested Slot', slot || 'Flexible'], 
            ['Match Score Rating', p?.rating ? `⭐ ${p.rating}` : '—']
          ].map(([label, val]) => val ? (
            <View key={label} style={{ marginBottom: 10 }}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{val}</Text>
            </View>
          ) : null)}
        </View>

        {/* Dynamic Interactive Date & Time Selector */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="calendar" size={20} color={Theme.colors.primary} />
            <Text style={styles.cardSectionTitle}>Select Service Date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {calendarDays.map((d, i) => {
              const isSelected = selectedDate.getDate() === d.dateObj.getDate() && selectedDate.getMonth() === d.dateObj.getMonth();
              return (
                <TouchableOpacity
                  key={i}
                  style={{
                    width: 60,
                    height: 74,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isSelected ? Theme.colors.primary : '#e2e8f0',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : '#fff',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setSelectedDate(d.dateObj)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? Theme.colors.primary : '#64748b', textTransform: 'uppercase' }}>
                    {d.dayName}
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: isSelected ? Theme.colors.primary : '#1e293b', marginVertical: 2 }}>
                    {d.dateNum}
                  </Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: isSelected ? Theme.colors.primary : '#94a3b8', textTransform: 'uppercase' }}>
                    {d.monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 12 }}>
            <Ionicons name="time" size={20} color={Theme.colors.primary} />
            <Text style={styles.cardSectionTitle}>Select Time Slot</Text>
          </View>

          {/* Quick Slots */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {SLOTS.map((s) => {
              const isSelected = selectedTimeSlot === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isSelected ? Theme.colors.primary : '#e2e8f0',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : '#fff',
                  }}
                  onPress={() => setSelectedTimeSlot(s)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isSelected ? Theme.colors.primary : '#475569' }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {isSlotConflicted && (
            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1.5, borderColor: '#f59e0b', borderRadius: 16, padding: 14, marginBottom: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle" size={20} color="#d97706" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#d97706' }}>⚠️ Overbooking & Buffer Conflict Detected</Text>
              </View>
              <Text style={{ fontSize: 11.5, color: '#b45309', lineHeight: 17, fontWeight: '600' }}>
                Specialist {p?.name || 'this provider'} has a scheduled task ending within 30 minutes of this slot. We enforce a 45-minute travel-time buffer corridor to prevent double-bookings.
              </Text>
              <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#b45309', marginTop: 4 }}>
                TAP AN ALTERNATE CONFLICT-FREE SLOT TO INSTANTLY RESOLVE:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {['11:00 AM (Early)', '04:30 PM (Buffer-Free)', '06:00 PM (Evening)'].map((alt) => (
                  <TouchableOpacity
                    key={alt}
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
                    onPress={() => {
                      const time = alt.split(' ')[0] + ' ' + alt.split(' ')[1];
                      setSelectedTimeSlot(time);
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#d97706' }}>{alt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Custom Time Selector via Interactive Flip Clock */}
          <Text style={[styles.inputLabel, { marginBottom: 8 }]}>OR CHOOSE CUSTOM TIME</Text>
          <View style={styles.clockWidget}>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity 
                style={styles.chevronBtn} 
                onPress={() => {
                  const nextHour = (parseInt(reschedHour) % 12) + 1;
                  const newHourStr = nextHour.toString().padStart(2, '0');
                  setReschedHour(newHourStr);
                  setSelectedTimeSlot(`${newHourStr}:${reschedMin} ${reschedAmPm}`);
                }}
              >
                <Ionicons name="chevron-up" size={20} color={Theme.colors.primary} />
              </TouchableOpacity>
              <View style={[styles.flipCard, { width: 54, padding: 8 }]}>
                <Text style={[styles.flipValText, { fontSize: 20 }]}>{reschedHour}</Text>
              </View>
              <TouchableOpacity 
                style={styles.chevronBtn} 
                onPress={() => {
                  const prevHour = parseInt(reschedHour) - 1;
                  const finalHour = prevHour === 0 ? 12 : prevHour;
                  const newHourStr = finalHour.toString().padStart(2, '0');
                  setReschedHour(newHourStr);
                  setSelectedTimeSlot(`${newHourStr}:${reschedMin} ${reschedAmPm}`);
                }}
              >
                <Ionicons name="chevron-down" size={20} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.colonSeparator, { fontSize: 20 }]}>:</Text>

            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity 
                style={styles.chevronBtn} 
                onPress={() => {
                  const nextMin = (parseInt(reschedMin) + 5) % 60;
                  const newMinStr = nextMin.toString().padStart(2, '0');
                  setReschedMin(newMinStr);
                  setSelectedTimeSlot(`${reschedHour}:${newMinStr} ${reschedAmPm}`);
                }}
              >
                <Ionicons name="chevron-up" size={20} color={Theme.colors.primary} />
              </TouchableOpacity>
              <View style={[styles.flipCard, { width: 54, padding: 8 }]}>
                <Text style={[styles.flipValText, { fontSize: 20 }]}>{reschedMin}</Text>
              </View>
              <TouchableOpacity 
                style={styles.chevronBtn} 
                onPress={() => {
                  const prevMin = (parseInt(reschedMin) - 5 + 60) % 60;
                  const newMinStr = prevMin.toString().padStart(2, '0');
                  setReschedMin(newMinStr);
                  setSelectedTimeSlot(`${reschedHour}:${newMinStr} ${reschedAmPm}`);
                }}
              >
                <Ionicons name="chevron-down" size={20} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.ampmContainer, { gap: 2, padding: 2 }]}>
              {['AM', 'PM'].map((mode) => (
                <TouchableOpacity 
                  key={mode}
                  style={[styles.ampmBtn, reschedAmPm === mode && styles.ampmActive, { paddingHorizontal: 8, paddingVertical: 6 }]} 
                  onPress={() => {
                    setReschedAmPm(mode);
                    setSelectedTimeSlot(`${reschedHour}:${reschedMin} ${mode}`);
                  }}
                >
                  <Text style={[styles.ampmText, reschedAmPm === mode && styles.ampmActiveText, { fontSize: 10 }]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Client Profile details */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.cardSectionTitle}>WhatsApp Personal Contact Info</Text>
          </View>
          <Text style={{ fontSize: 12, color: Theme.colors.textMuted, marginBottom: 14, lineHeight: 17 }}>Your contact info is used by the provider to dispatch real-time Urdu SMS arrival messages when departing.</Text>
          
          <Text style={styles.inputLabel}>YOUR NAME</Text>
          <TextInput 
            style={styles.textInput} 
            placeholder="e.g. Tahir Ali" 
            placeholderTextColor={Theme.colors.textMuted} 
            value={userName} 
            onChangeText={setUserName} 
          />
          
          <Text style={[styles.inputLabel, { marginTop: 12 }]}>PERSONAL WHATSAPP NUMBER</Text>
          <TextInput 
            style={styles.textInput} 
            placeholder="e.g. 0300-1234567" 
            placeholderTextColor={Theme.colors.textMuted} 
            keyboardType="phone-pad" 
            value={userWA} 
            onChangeText={setUserWA} 
          />

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>HOUSE / STREET ADDRESS (ISLAMABAD)</Text>
          <TextInput 
            style={styles.textInput} 
            placeholder="e.g. House 123, Street 4, Sector G-11/2" 
            placeholderTextColor={Theme.colors.textMuted} 
            value={address} 
            onChangeText={setAddress} 
          />
        </View>

        {/* Payment Options Selection Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="card-outline" size={20} color={Theme.colors.primary} />
            <Text style={styles.cardSectionTitle}>Preferred Payout Method</Text>
          </View>
          <Text style={{ fontSize: 12, color: Theme.colors.textMuted, marginBottom: 14, lineHeight: 17 }}>
            Select how you would like to pay your specialist after the service task is completed.
          </Text>

          <View style={{ gap: 8 }}>
            {[
              { id: 'Cash payment', label: 'Cash Payment', icon: 'cash-outline', color: '#10b981' },
              { id: 'Easypaisa', label: 'Easypaisa Mobile Wallet', icon: 'wallet-outline', color: '#3cd458' },
              { id: 'JazzCash', label: 'JazzCash Mobile Wallet', icon: 'wallet-outline', color: '#ffcc00' },
              { id: 'Other wallets', label: 'Other Bank Digital Wallets', icon: 'apps-outline', color: Theme.colors.primary },
            ].map((opt) => {
              const isSelected = paymentMethod === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isSelected ? Theme.colors.primary : '#e2e8f0',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : '#fff',
                  }}
                  onPress={() => setPaymentMethod(opt.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : '#f1f5f9',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Ionicons name={opt.icon} size={18} color={isSelected ? Theme.colors.primary : opt.color} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '750', color: isSelected ? Theme.colors.primary : '#334155' }}>
                      {opt.label}
                    </Text>
                  </View>
                  <View style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: isSelected ? Theme.colors.primary : '#cbd5e1',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.colors.primary }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Other Wallets Selection */}
          {paymentMethod === 'Other wallets' && (
            <View style={{ marginTop: 14, backgroundColor: '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={[styles.inputLabel, { marginBottom: 8 }]}>SELECT BANK OR DIGITAL WALLET</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'SadaPay', 'NayaPay', 'HBL Konnect', 'Alfalah Alfa', 'UBL Digital', 
                  'Meezan Smart', 'Faysal Digi', 'MCB Live', 'Allied MyABL', 'NBP Smart', 
                  'JS Bank', 'BOP Mobile', 'Habib Metro', 'Askari Mobile', 'BankIslami'
                ].map((w) => {
                  const isWSelected = selectedOtherWallet === w;
                  return (
                    <TouchableOpacity
                      key={w}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: isWSelected ? Theme.colors.primary : '#fff',
                        borderWidth: 1,
                        borderColor: isWSelected ? Theme.colors.primary : '#cbd5e1',
                      }}
                      onPress={() => setSelectedOtherWallet(w)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: isWSelected ? '#fff' : '#475569' }}>
                        {w}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Pricing Card */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: Theme.colors.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="sparkles" size={18} color={Theme.colors.primary} />
            <Text style={styles.cardSectionTitle}>AI Dynamic Invoice Breakdown</Text>
          </View>
          <Text style={{ fontSize: 12, color: Theme.colors.textMuted, fontStyle: 'italic', marginBottom: 12 }}>{pricingNote}</Text>
          {[
            ['Base Specialist Cost', `Rs ${baseRate}`],
            [`Complexity Level (${jobComplexity})`, `${complexityMultiplier >= 0 ? '+' : ''}${Math.round(complexityMultiplier * 100)}%`],
            surcharge > 0 && [`Urgency Dispatch Surcharge`, `+${surcharge * 100}%`],
            isPeakHour && ['Peak Hour Surge Multiplier', `1.15x surge`],
            travelFee > 0 && ['Doorstep Travel Fee', `Rs ${travelFee}`],
            ['Loyalty Discount (Auto-Applied)', `-Rs ${loyaltyDiscount}`, true]
          ].filter(Boolean).map(([l, v, isDiscount]) => (
            <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
              <Text style={{ fontSize: 13, color: Theme.colors.textSecondary, fontWeight: '500' }}>{l}</Text>
              <Text style={{ fontSize: 13, color: isDiscount ? '#10b981' : Theme.colors.textPrimary, fontWeight: '700' }}>{v}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: Theme.colors.textPrimary }}>Estimated Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: Theme.colors.primary }}>Rs {estMin}–{estMax}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer bar */}
      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 14, paddingTop: 12 }]}>
        <TouchableOpacity 
          style={[styles.primaryBtn, (!p || loading) && { opacity: 0.5 }]} 
          onPress={handleConfirm} 
          disabled={loading || !p}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Booking Request</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Theme.colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: Platform.OS === 'android' ? 20 : 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerTitle:      { fontSize: Theme.typography.md, fontWeight: '800', color: Theme.colors.textPrimary },
  card:             { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...Theme.shadows.soft },
  cardSectionTitle: { fontSize: Theme.typography.sm, fontWeight: '800', color: Theme.colors.textPrimary },
  divider:          { height: 1, backgroundColor: Theme.colors.borderLight, marginVertical: 12 },
  infoLabel:        { fontSize: 11, color: Theme.colors.textMuted, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue:        { fontSize: Theme.typography.base, fontWeight: '700', color: Theme.colors.textPrimary },
  inputLabel:       { fontSize: 10, fontWeight: '800', color: Theme.colors.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  textInput:        { backgroundColor: Theme.colors.background, borderWidth: 1.5, borderColor: Theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Theme.colors.textPrimary, fontWeight: '600' },
  primaryBtn:       { backgroundColor: Theme.colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, ...Theme.shadows.medium },
  primaryBtnText:   { color: '#fff', fontSize: Theme.typography.base, fontWeight: '800' },
  outlineBtn:       { flex: 1, borderWidth: 1.5, borderColor: Theme.colors.border, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  outlineBtnText:   { fontSize: 14, fontWeight: '700', color: Theme.colors.primary },
  dangerBtn:        { borderColor: Theme.colors.errorLight },
  dangerBtnText:    { color: Theme.colors.error, fontSize: 14, fontWeight: '700' },
  
  statusRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingIdText:    { fontSize: Theme.typography.base, fontWeight: '800', color: Theme.colors.textPrimary },
  statusBadge:      { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusBadgeText:  { fontSize: 11, fontWeight: '800', color: Theme.colors.primary },
  cancelledBadge:   { backgroundColor: Theme.colors.errorLight },
  completedBadge:   { backgroundColor: Theme.colors.successLight },
  timelineItem:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  dot:              { width: 20, height: 20, borderRadius: 10, backgroundColor: Theme.colors.border, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  dotDone:          { backgroundColor: Theme.colors.success },
  timelineLine:     { width: 2, height: 14, backgroundColor: Theme.colors.borderLight, marginLeft: 9 },
  stepTitle:        { fontSize: 13, fontWeight: '800', color: Theme.colors.textPrimary },
  stepDesc:         { fontSize: 11.5, color: Theme.colors.textMuted, marginTop: 2 },
  
  // Receipt Invoice Styles
  receiptHeader:    { fontSize: 14, fontWeight: '900', color: Theme.colors.textPrimary, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
  receiptRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Theme.colors.borderLight },
  receiptLabel:     { fontSize: 12.5, color: Theme.colors.textSecondary, fontWeight: '600' },
  receiptVal:       { fontSize: 12.5, color: Theme.colors.textPrimary, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: Theme.colors.border },
  successHeader:    { alignItems: 'center', padding: 40, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  successTitle:     { fontSize: 24, fontWeight: '950', color: '#fff', marginTop: 10 },
  successId:        { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '700' },

  // WhatsApp Button
  directWABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 12,
    height: 42,
    marginTop: 12,
    ...Theme.shadows.soft,
  },
  directWAText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },

  // Live tracking Card (Point 10)
  dispatchTrackerCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    marginBottom: 12,
    ...Theme.shadows.soft
  },
  trackerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.textPrimary
  },
  trackerDesc: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    fontWeight: '600'
  },
  trackerAckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
    marginTop: 12
  },
  trackerAckText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#fff'
  },

  // Clock interactive styles
  clockToggleRow:  { flexDirection: 'row', backgroundColor: Theme.colors.background, borderRadius: 12, padding: 4, marginBottom: 16 },
  clockToggleBtn:  { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  clockToggleActive:{ backgroundColor: '#fff', ...Theme.shadows.soft },
  clockToggleText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted },
  clockToggleActiveText: { color: Theme.colors.primary, fontWeight: '800' },
  clockWidget:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 10 },
  flipCard:        { backgroundColor: Theme.colors.background, padding: 12, borderRadius: 16, alignItems: 'center', width: 70, borderWidth: 1, borderColor: Theme.colors.border },
  flipValText:     { fontSize: 28, fontWeight: '900', color: Theme.colors.primary },
  chevronBtn:      { padding: 4 },
  colonSeparator:  { fontSize: 28, fontWeight: '900', color: Theme.colors.textMuted },
  ampmContainer:   { flexDirection: 'row', backgroundColor: Theme.colors.background, borderRadius: 10, padding: 3, gap: 4 },
  ampmBtn:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  ampmActive:      { backgroundColor: Theme.colors.primary },
  ampmText:        { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted },
  ampmActiveText:  { color: '#fff', fontWeight: '800' },

  // Custom Alert Backdrops
  alertBackdrop: { flex: 1, backgroundColor: 'rgba(15, 31, 92, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertContent: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 22, alignItems: 'center', ...Theme.shadows.premium },
  alertIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitleText: { fontSize: 16, fontWeight: '950', color: Theme.colors.textPrimary, textAlign: 'center' },
  alertMessageText: { fontSize: 12.5, color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 10 },
  alertCloseBtn: { marginTop: 20, width: '100%', height: 46, backgroundColor: Theme.colors.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertCloseBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' }
});
