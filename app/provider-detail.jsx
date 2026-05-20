import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSectorCoords } from '../utils/mapHelper';
import { Theme } from '../utils/Theme';
import { useTheme } from '../utils/ThemeContext';

const { width } = Dimensions.get('window');

export default function ProviderDetailScreen() {
  const { provider, intent } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  
  const p = JSON.parse(provider);
  const parsedIntent = JSON.parse(intent || '{}');

  const activeColors = {
    background: Theme.colors.background,
    surface: Theme.colors.surface,
    card: Theme.colors.card,
    textPrimary: Theme.colors.textPrimary,
    textSecondary: Theme.colors.textSecondary,
    border: Theme.colors.border,
    borderLight: Theme.colors.borderLight,
  };

  const factorLabels = {
    fDistance: "Distance (15%)",
    fAvailability: "Availability (15%)",
    fRating: "Rating (15%)",
    fOnTime: "On-time Rate (15%)",
    fRecency: "Review Recency (10%)",
    fPrice: "Price Match (10%)",
    fSpecialization: "Specialization (10%)",
    fCancel: "Cancel Rate (10%)"
  };

  const handleBookingTrigger = async (slot) => {
    try {
      const savedName = await AsyncStorage.getItem('@user_name');
      if (!savedName) {
        Alert.alert(
          '⚠️ Login Profile Required',
          'Assalam-o-Alaikum! You are currently browsing as a Guest. Please register or log in as a Customer to confirm bookings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log In / Register', onPress: () => router.push('/login') }
          ]
        );
        return;
      }
      router.push({
        pathname: '/booking-confirm',
        params: { provider: JSON.stringify(p), slot }
      });
    } catch (e) {
      console.warn('Failed checking login state:', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: activeColors.card, borderBottomColor: activeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeColors.textPrimary }]}>{p.name}</Text>
        <Text style={[styles.subtitle, { color: activeColors.textSecondary }]}>{p.specialization}</Text>
      </View>

      <ScrollView style={styles.scroll}>
        {/* 8-Factor Score Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: activeColors.textPrimary }]}>Agentic Ranking Breakdown (8 Factors)</Text>
          <View style={[styles.table, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            {Object.entries(p.factorBreakdown).map(([key, val], i) => (
              <View key={key} style={[styles.tableRow, { borderBottomColor: activeColors.borderLight, borderBottomWidth: i === 7 ? 0 : 1 }, i % 2 === 0 && { backgroundColor: activeColors.background }]}>
                <Text style={[styles.tableLabel, { color: activeColors.textSecondary }]}>{factorLabels[key]}</Text>
                <View style={styles.tableValueContainer}>
                  <Text style={[styles.tableValue, { color: activeColors.textPrimary }]}>{(val * 100).toFixed(0)}%</Text>
                  <View style={[styles.miniBar, { backgroundColor: activeColors.border }]}>
                    <View style={[styles.miniBarInner, { width: `${val * 100}%`, backgroundColor: Theme.colors.primary }]} />
                  </View>
                </View>
              </View>
            ))}
            <View style={[styles.totalRow, { backgroundColor: theme === 'dark' ? 'rgba(26, 86, 219, 0.15)' : '#eff6ff', borderTopColor: Theme.colors.primary }]}>
              <Text style={[styles.totalLabel, { color: Theme.colors.primary }]}>Composite Score</Text>
              <Text style={[styles.totalValue, { color: Theme.colors.primary }]}>{p.compositeScore}%</Text>
            </View>
          </View>
        </View>

        {/* Availability Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: activeColors.textPrimary }]}>Available Slots (Verified)</Text>
          <View style={styles.grid}>
            {p.availability.map((slot, i) => (
              <TouchableOpacity 
                key={i} 
                style={[styles.gridItem, { backgroundColor: activeColors.card, borderColor: Theme.colors.primary }]}
                onPress={() => handleBookingTrigger(slot)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gridText, { color: Theme.colors.primary }]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: activeColors.textPrimary }]}>Full Price Breakdown</Text>
          <View style={[styles.priceContainer, { backgroundColor: activeColors.card, borderColor: activeColors.border }]}>
            {p.priceBreakdown.map((item, i) => (
              <View key={i} style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: activeColors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.priceValue, { color: activeColors.textPrimary }]}>{typeof item.value === 'number' ? `Rs. ${item.value}` : item.value}</Text>
              </View>
            ))}
            <View style={[styles.priceTotal, { borderTopColor: activeColors.borderLight }]}>
              <Text style={[styles.totalLabel, { color: activeColors.textPrimary }]}>Total Estimate</Text>
              <Text style={styles.finalPrice}>Rs. {p.finalPrice}</Text>
            </View>
          </View>
        </View>

        {/* Provider Location Map */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: activeColors.textPrimary }]}>Provider Base Location ({p.sector})</Text>
          <View style={[styles.mapContainer, { borderColor: activeColors.border }]}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: Number(p.coordinates?.lat || p.coordinates?.latitude || 33.6844),
                longitude: Number(p.coordinates?.lng || p.coordinates?.lon || p.coordinates?.longitude || 73.0479),
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              zoomEnabled={true}
              scrollEnabled={true}
            >
              {/* Provider Location Marker */}
              <Marker
                coordinate={{
                  latitude: Number(p.coordinates?.lat || p.coordinates?.latitude || 33.6844),
                  longitude: Number(p.coordinates?.lng || p.coordinates?.lon || p.coordinates?.longitude || 73.0479),
                }}
                title={p.name}
                description={p.specialization}
              >
                <View style={styles.providerPin}>
                  <Ionicons name="location" size={14} color="#fff" />
                </View>
              </Marker>

              {/* User Location Marker (if customer sector exists) */}
              {parsedIntent?.location && (
                <Marker
                  coordinate={getSectorCoords(parsedIntent.location)}
                  title="Your Location"
                  description={parsedIntent.location}
                  pinColor="#2563eb"
                />
              )}
            </MapView>
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: activeColors.textPrimary }]}>Recent Reviews</Text>
          {p.reviews.length > 0 ? p.reviews.map((r, i) => (
            <View key={i} style={[styles.reviewCard, { backgroundColor: activeColors.card, borderColor: activeColors.borderLight }]}>
              <View style={styles.reviewHeader}>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, j) => (
                    <Ionicons key={j} name="star" size={12} color={j < r.rating ? "#f59e0b" : "#e2e8f0"} />
                  ))}
                </View>
                <Text style={styles.reviewDate}>{r.date}</Text>
              </View>
              <Text style={[styles.reviewText, { color: activeColors.textPrimary }]}>{r.comment}</Text>
            </View>
          )) : (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: width * 0.06, paddingTop: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginBottom: 12 },
  title: { fontSize: width * 0.055, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: width * 0.035, color: '#64748b', marginTop: 4 },
  scroll: { flex: 1, padding: width * 0.04 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: width * 0.038, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, alignItems: 'center' },
  tableRowEven: { backgroundColor: '#f8fafc' },
  tableLabel: { fontSize: 13, color: '#64748b' },
  tableValueContainer: { flexDirection: 'row', alignItems: 'center' },
  tableValue: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginRight: 8, width: 35, textAlign: 'right' },
  miniBar: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  miniBarInner: { height: '100%', backgroundColor: '#2563eb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#bfdbfe' },
  totalLabel: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  gridText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
  priceContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#64748b' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  priceTotal: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  finalPrice: { fontSize: width * 0.045, fontWeight: '800', color: '#16a34a' },
  reviewCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  stars: { flexDirection: 'row' },
  reviewDate: { fontSize: 11, color: '#94a3b8' },
  reviewText: { fontSize: 13, color: '#475569' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  mapContainer: { height: 160, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#e2e8f0' },
  map: { flex: 1 },
  providerPin: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }
});
