import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import providersData from "../data/providers.json";
import { getDistance } from "../utils/distance";
import { getSectorCoords, getFitCoords } from "../utils/mapHelper";

const { width } = Dimensions.get('window');

export default function CompareScreen() {
  const router = useRouter();
  const { intent, providers } = useLocalSearchParams();
  
  let parsedIntent = null;
  let rawProviders = [];

  try {
    if (intent) parsedIntent = JSON.parse(intent);
    if (providers) rawProviders = JSON.parse(providers);
  } catch (e) {
    console.warn("Failed to parse compare search params:", e);
  }

  // Fallbacks if not navigated from an active chat search
  const { query } = useLocalSearchParams();
  const activeInput = query || (parsedIntent ? `${parsedIntent.service} in ${parsedIntent.location}` : 'Electrician in G-13');
  
  // Dynamically resolve service from input query string
  let detectedService = 'Electrician';
  if (parsedIntent && parsedIntent.service) {
    detectedService = parsedIntent.service;
  } else if (activeInput) {
    const queryLower = activeInput.toLowerCase();
    const serviceKeys = [
      'plumber', 'electrician', 'ac technician', 'carpenter', 'cleaner', 'tutor', 
      'beautician', 'cook', 'driver', 'painter', 'mechanic', 'appliance repair', 
      'gardener', 'pest control', 'solar installer', 'cctv technician', 'welder', 
      'sofa cleaner', 'locksmith', 'mason', 'car washer', 'tailor', 'photographer', 
      'disinfector', 'physiotherapist', 'barber', 'laptop tech', 'roofer', 'chauffeur', 'handyman'
    ];
    const found = serviceKeys.find(k => queryLower.includes(k));
    if (found) {
      detectedService = found.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  const dataPool = rawProviders.length > 0 
    ? rawProviders 
    : providersData.filter(p => p.service.toLowerCase() === detectedService.toLowerCase());

  // Simple System: Only distance-based sorting
  const simpleRank = [...dataPool]
    .map(p => {
      const distance = p.distance || getDistance(33.642, 72.968, p.coordinates?.lat || 33.6844, p.coordinates?.lng || 73.0479).toFixed(1);
      return { ...p, distance };
    })
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
    .slice(0, 3);

  // Agentic System: 8-factor ranking score sorting
  const agenticRank = [...dataPool]
    .map(p => {
      const distance = p.distance || getDistance(33.642, 72.968, p.coordinates?.lat || 33.6844, p.coordinates?.lng || 73.0479).toFixed(1);
      const score = p.totalScore || Math.round((p.rating / 5) * 60 + (30 - distance * 2));
      return { ...p, distance, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const reasoningTrace = parsedIntent 
    ? `Discovered ${dataPool.length} providers for "${parsedIntent.service}" near ${parsedIntent.location}. Sort Rank #1 (${agenticRank[0]?.name || 'Top Pick'}) selected by balancing distance (${agenticRank[0]?.distance} km), rating (${agenticRank[0]?.rating}⭐), on-time (${Math.round((agenticRank[0]?.onTimeRate || 0.95)*100)}%), cancel rate (${Math.round((agenticRank[0]?.cancelRate || 0.05)*100)}%), and availability.`
    : `Analyzing 8 factors for "${detectedService}": distance, availability, rating, on-time rate, cancel rate, specialization, recency, and price. Selected Rank #1 (${agenticRank[0]?.name || 'Top Pick'}) as best choice.`;

  const mapRef = useRef(null);
  const userCoords = getSectorCoords(parsedIntent?.location || 'G-13');

  useEffect(() => {
    if (mapRef.current && dataPool.length > 0) {
      const allCoords = getFitCoords(userCoords, dataPool);
      setTimeout(() => {
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }, 600);
    }
  }, [dataPool, userCoords]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Baseline Comparison</Text>
        <Text style={styles.subtitle}>Standard System vs Agentic Multi-Agent Pipeline</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.inputArea}>
          <Text style={styles.label}>🔍 Active Query Search</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputText}>{activeInput}</Text>
          </View>
        </View>

        <View style={styles.mapArea}>
          <Text style={styles.label}>🗺️ Live Location & Provider Routing</Text>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: userCoords.latitude,
                longitude: userCoords.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
            >
              {/* User Location */}
              <Marker
                coordinate={userCoords}
                title="Your Location"
                description={parsedIntent?.location || "Islamabad"}
              >
                <View style={styles.userPin}>
                  <View style={styles.userPinPulse} />
                  <Ionicons name="person" size={12} color="#fff" />
                </View>
              </Marker>

              {/* Simple System Providers */}
              {simpleRank.map((p, idx) => {
                const lat = p.coordinates?.lat || p.coordinates?.latitude;
                const lng = p.coordinates?.lng || p.coordinates?.lon || p.coordinates?.longitude;
                if (!lat || !lng) return null;
                return (
                  <Marker
                    key={`simple-${idx}`}
                    coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
                    title={`[Simple Pick #${idx+1}] ${p.name}`}
                    description={`Distance: ${p.distance} km`}
                    pinColor="#94a3b8"
                  />
                );
              })}

              {/* Agentic System Providers */}
              {agenticRank.map((p, idx) => {
                const lat = p.coordinates?.lat || p.coordinates?.latitude;
                const lng = p.coordinates?.lng || p.coordinates?.lon || p.coordinates?.longitude;
                if (!lat || !lng) return null;
                return (
                  <Marker
                    key={`agentic-${idx}`}
                    coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
                    title={`[Agentic Pick #${idx+1}] ${p.name}`}
                    description={`Score: ${p.score || p.compositeScore}/100 Match | ${p.distance} km`}
                  >
                    <View style={[styles.agenticPin, idx === 0 && styles.topAgenticPin]}>
                      <Text style={styles.pinText}>#{idx+1}</Text>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
          </View>
        </View>

        <View style={styles.compareRow}>
          {/* Simple System */}
          <View style={styles.side}>
            <View style={styles.sideHeader}>
              <View style={styles.systemIcon}>
                <Ionicons name="location-outline" size={18} color="#64748b" />
              </View>
              <Text style={styles.sideTitle}>Simple System</Text>
              <Text style={styles.sideSub}>Distance-only Sorting</Text>
            </View>
            
            {simpleRank.map((p, i) => (
              <View key={i} style={styles.miniCard}>
                <Text style={styles.rankBadge}>#{i+1}</Text>
                <Text style={styles.pName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.pStat}>{p.distance} km away</Text>
              </View>
            ))}
            
            <View style={styles.reasoningPlaceholder}>
              <Text style={styles.reasoningLabel}>Reasoning:</Text>
              <Text style={styles.reasoningContent}>No reasoning trace. Pure ascending distance sort.</Text>
            </View>
          </View>

          {/* Agentic System */}
          <View style={[styles.side, styles.sideAgentic]}>
            <View style={styles.sideHeader}>
              <View style={[styles.systemIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="sparkles" size={18} color="#2563eb" />
              </View>
              <Text style={styles.sideTitleAgentic}>Agentic AI</Text>
              <Text style={styles.sideSub}>8-Factor Score Sorting</Text>
            </View>
            
            {agenticRank.map((p, i) => (
              <View key={i} style={[styles.miniCard, i === 0 && styles.miniCardTop]}>
                <Text style={[styles.rankBadge, i === 0 && styles.rankBadgeTop]}>#{i+1}</Text>
                <Text style={styles.pName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.pScore}>{p.score}/100 Match</Text>
              </View>
            ))}
            
            <View style={styles.reasoningActive}>
              <Text style={styles.reasoningLabelAgentic}>🤖 AI Reasoning Trace:</Text>
              <Text style={styles.reasoningContentAgentic}>{reasoningTrace}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/trace')} activeOpacity={0.7} style={styles.traceLink}>
                <Text style={styles.viewFullTrace}>View Execution Trace →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: width * 0.05, paddingTop: Platform.OS === 'android' ? 25 : 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginBottom: 12 },
  title: { fontSize: width * 0.05, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: width * 0.03, color: '#64748b', marginTop: 4 },
  scroll: { flex: 1, padding: width * 0.04 },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  inputBox: { backgroundColor: '#fff', padding: 16, borderRadius: 15, borderLeftWidth: 4, borderLeftColor: '#2563eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  inputText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  compareRow: { flexDirection: 'row', gap: 10 },
  side: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: width * 0.035, borderTopWidth: 4, borderTopColor: '#94a3b8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sideAgentic: { borderTopColor: '#2563eb', backgroundColor: '#f8fafc' },
  sideHeader: { marginBottom: 16, alignItems: 'center' },
  systemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sideTitle: { fontSize: 14, fontWeight: '800', color: '#475569' },
  sideTitleAgentic: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
  sideSub: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  miniCard: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative' },
  miniCardTop: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  rankBadge: { position: 'absolute', top: -5, left: -5, backgroundColor: '#64748b', color: '#fff', fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  rankBadgeTop: { backgroundColor: '#2563eb' },
  pName: { fontSize: 11, fontWeight: '800', color: '#1e293b', paddingLeft: 6, marginTop: 2 },
  pStat: { fontSize: 10, color: '#64748b', paddingLeft: 6, marginTop: 2, fontWeight: '500' },
  pScore: { fontSize: 10, fontWeight: '800', color: '#2563eb', paddingLeft: 6, marginTop: 2 },
  reasoningPlaceholder: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  reasoningLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 4 },
  reasoningContent: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', lineHeight: 14 },
  reasoningActive: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#bfdbfe', paddingTop: 12 },
  reasoningLabelAgentic: { fontSize: 10, fontWeight: '800', color: '#2563eb', marginBottom: 4 },
  reasoningContentAgentic: { fontSize: 10.5, color: '#1e40af', fontStyle: 'italic', lineHeight: 15, fontWeight: '500' },
  traceLink: { marginTop: 10, alignSelf: 'flex-end' },
  viewFullTrace: { fontSize: 10.5, fontWeight: '800', color: '#2563eb' },
  mapArea: { marginBottom: 20 },
  mapContainer: { height: 180, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#e2e8f0' },
  map: { flex: 1 },
  userPin: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  userPinPulse: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(37, 99, 235, 0.2)', borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.4)' },
  agenticPin: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  topAgenticPin: { backgroundColor: '#10b981', transform: [{ scale: 1.08 }] },
  pinText: { fontSize: 9, fontWeight: '900', color: '#fff' }
});
