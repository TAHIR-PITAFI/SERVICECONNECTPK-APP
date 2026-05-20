import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from '../utils/Theme';
import { useTheme } from '../utils/ThemeContext';

const ProviderCard = memo(({ provider, onBook, rank }) => {
  const { theme } = useTheme();
  const stars = '★'.repeat(Math.round(provider.rating)) + '☆'.repeat(5 - Math.round(provider.rating));

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

  return (
    <View style={[styles.card, { backgroundColor: activeColors.surface, borderColor: activeColors.border }, !provider.available && styles.cardUnavailable]}>
      {rank === 1 && (
        <View style={[styles.topBadge, { backgroundColor: Theme.colors.primary }]}>
          <Text style={styles.topBadgeText}>TOP PICK</Text>
        </View>
      )}

      <View style={styles.row}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: activeColors.backgroundAlt, borderColor: activeColors.border }]}>
          <Text style={styles.avatarEmoji}>{provider.avatar}</Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: activeColors.textPrimary }]} numberOfLines={1}>{provider.name}</Text>
          <Text style={[styles.sector, { color: activeColors.textSecondary }]}>📍 {provider.sector}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stars}>{stars}</Text>
            <Text style={[styles.rating, { color: activeColors.textPrimary }]}>{provider.rating}</Text>
            <Text style={[styles.reviews, { color: activeColors.textMuted }]}>({provider.reviews})</Text>
            <Text style={[styles.dot, { color: activeColors.textMuted }]}>·</Text>
            <Text style={styles.distance}>{provider.distanceKm} km</Text>
          </View>
        </View>

        {/* Right side */}
        <View style={styles.right}>
          <Text style={[styles.price, { color: activeColors.textPrimary }]}>Rs {provider.priceMin}+</Text>
          <View style={[styles.availBadge, provider.available ? styles.availGreen : styles.availRed]}>
            <Text style={[styles.availText, { color: provider.available ? (theme === 'dark' ? '#34d399' : '#059669') : (theme === 'dark' ? '#f87171' : '#dc2626') }]}>{provider.available ? 'Available' : 'Busy'}</Text>
          </View>
        </View>
      </View>

      {/* Score bar */}
      <View style={[styles.scoreBar, { backgroundColor: activeColors.border }]}>
        <View style={[styles.scoreFill, { width: `${Math.min(100, provider.score)}%`, backgroundColor: Theme.colors.primary }]} />
      </View>

      {/* Book button */}
      <TouchableOpacity
        style={[styles.bookBtn, { backgroundColor: Theme.colors.primary }, !provider.available && { backgroundColor: activeColors.textMuted }]}
        onPress={() => provider.available && onBook(provider)}
        activeOpacity={0.8}
      >
        <Text style={styles.bookBtnText}>
          {provider.available ? `Book ${provider.name.split(' ')[0]}` : 'Currently Unavailable'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardUnavailable: {
    opacity: 0.6,
  },
  topBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.sm,
  },
  topBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  avatarEmoji: { fontSize: 24 },
  info: { flex: 1 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sector: { color: COLORS.textSub, fontSize: 12, marginBottom: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stars: { color: COLORS.warning, fontSize: 11 },
  rating: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  reviews: { color: COLORS.muted, fontSize: 11 },
  dot: { color: COLORS.muted, fontSize: 11 },
  distance: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  availBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availGreen: { backgroundColor: 'rgba(6,214,160,0.15)' },
  availRed: { backgroundColor: 'rgba(239,68,68,0.15)' },
  availText: { fontSize: 10, fontWeight: '600', color: COLORS.text },
  scoreBar: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookBtnDisabled: {
    backgroundColor: COLORS.muted,
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProviderCard;
