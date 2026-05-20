import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../utils/Theme';
import { useTheme } from '../utils/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProvidersScreen() {
  const { results, intent } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  
  const providers = results ? JSON.parse(results) : [];
  const parsedIntent = intent ? JSON.parse(intent) : {};

  const activeColors = {
    background: Theme.colors.background,
    card: Theme.colors.card,
    textPrimary: Theme.colors.textPrimary,
    textSecondary: Theme.colors.textSecondary,
    border: Theme.colors.border,
    borderLight: Theme.colors.borderLight,
    badgeBg: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#f0f9ff',
    badgeBorder: theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#bae6fd',
    barBg: theme === 'dark' ? '#374151' : '#f1f5f9',
    backBtnBg: theme === 'dark' ? '#1f2937' : '#f1f5f9',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeColors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: activeColors.card, borderBottomColor: activeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: activeColors.backBtnBg }]}>
          <Ionicons name="arrow-back" size={24} color={activeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeColors.textPrimary }]}>Agentic Selection</Text>
        <Text style={[styles.subtitle, { color: activeColors.textSecondary }]}>Analyzing 8-factors for {parsedIntent.service_type || 'Selected Service'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {providers.map((p, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[styles.card, { backgroundColor: activeColors.card }]}
            activeOpacity={0.9}
            onPress={() => router.push({
              pathname: '/provider-detail',
              params: { provider: JSON.stringify(p), intent }
            })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.pInfo}>
                <Text style={[styles.pName, { color: activeColors.textPrimary }]}>{p.name}</Text>
                <View style={[styles.badge, { backgroundColor: activeColors.badgeBg, borderColor: activeColors.badgeBorder }]}>
                  <Text style={[styles.badgeText, { color: Theme.colors.primary }]}>{p.specialization}</Text>
                </View>
              </View>
              <View style={styles.availabilityCol}>
                <View style={[styles.dot, { backgroundColor: p.availability.length > 0 ? Theme.colors.success : Theme.colors.danger }]} />
                <Text style={[styles.availText, { color: activeColors.textSecondary }]}>{p.availability.length > 0 ? 'Active' : 'Busy'}</Text>
              </View>
            </View>

            <View style={styles.scoreContainer}>
              <View style={styles.scoreInfo}>
                <Text style={[styles.scoreLabel, { color: activeColors.textSecondary }]}>Composite Trust Score</Text>
                <Text style={[styles.scoreVal, { color: Theme.colors.primary }]}>{p.compositeScore}%</Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: activeColors.barBg }]}>
                <LinearGradient 
                  colors={[Theme.colors.primary, Theme.colors.secondary || Theme.colors.primaryLight]} 
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 0}} 
                  style={[styles.barFill, { width: `${p.compositeScore}%` }]} 
                />
              </View>
            </View>

            <View style={[styles.footer, { borderTopColor: activeColors.borderLight }]}>
              <View style={styles.meta}>
                <Ionicons name="navigate-outline" size={14} color={activeColors.textSecondary} />
                <Text style={[styles.metaText, { color: activeColors.textSecondary }]}>{p.distance} km</Text>
              </View>
              <View style={styles.meta}>
                <Ionicons name="star" size={14} color={Theme.colors.warning} />
                <Text style={[styles.metaText, { color: activeColors.textSecondary }]}>{p.rating}</Text>
              </View>
              <Text style={styles.priceTag}>Rs. {p.finalPrice}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: width * 0.06, paddingTop: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: width * 0.055, fontWeight: '900', color: Theme.colors.textPrimary },
  subtitle: { fontSize: width * 0.032, color: Theme.colors.textSecondary, marginTop: 4, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: width * 0.04 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: width * 0.05, marginBottom: 16, borderLeftWidth: 6, borderLeftColor: Theme.colors.primary, ...Theme.shadows.soft },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pInfo: { flex: 1 },
  pName: { fontSize: width * 0.045, fontWeight: '800', color: Theme.colors.textPrimary },
  badge: { backgroundColor: '#f0f9ff', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: '#bae6fd' },
  badgeText: { fontSize: 10, fontWeight: '800', color: Theme.colors.primary, textTransform: 'uppercase' },
  availabilityCol: { alignItems: 'flex-end' },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  availText: { fontSize: 10, fontWeight: '700', color: Theme.colors.textSecondary },
  scoreContainer: { marginBottom: 20 },
  scoreInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' },
  scoreLabel: { fontSize: width * 0.03, fontWeight: '700', color: Theme.colors.textSecondary },
  scoreVal: { fontSize: width * 0.04, fontWeight: '900', color: Theme.colors.primary },
  barBg: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 16 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, fontWeight: '700', color: Theme.colors.textSecondary, marginLeft: 4 },
  priceTag: { fontSize: width * 0.04, fontWeight: '900', color: Theme.colors.success }
});
