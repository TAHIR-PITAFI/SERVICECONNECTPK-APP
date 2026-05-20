/**
 * Booking Agent v2 — Optimized
 * - Reduced artificial delay (200ms instead of 500ms)
 * - Memoized getAllBookings with short TTL cache
 * - Improved slot selection
 * - Better service emoji mapping
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { traceService } from '../services/traceService';
import { ALL_SERVICE_EMOJIS } from '../utils/providerIndex';
import { linkBookingToUser } from '../utils/firebaseHelper';

const BOOKINGS_KEY = 'bookings';

// ─── TTL Cache ─────────────────────────────────────────────────────────────────
let _bookingsCache = null;
let _cacheExpiry = 0;
const CACHE_TTL = 3000; // 3 seconds

export async function runBookingAgent(provider, intent, selectedSlot) {
  const start = Date.now();

  // Small realistic delay
  await _delay(150 + Math.random() * 100);

  const bookingId   = _generateBookingId();
  const timeKey     = intent?.timeKey || intent?.time || 'flexible';
  const slot        = selectedSlot || _selectBestSlot(provider, timeKey);
  const bookingDate = _resolveDate(timeKey);

  const service     = intent?.service || intent?.serviceType || intent?.service_type || 'Service';
  const serviceEmoji = ALL_SERVICE_EMOJIS[service] || '🛠️';

  const priceMin = provider?.priceMin || provider?.baseRate || 1000;
  const priceMax = provider?.priceMax || Math.round((provider?.baseRate || 1000) * 1.35);

  const pricingData = intent?.pricing || {};

  const booking = {
    id:        bookingId,
    createdAt: new Date().toISOString(),
    status:    'confirmed',
    provider: {
      id:     provider?.id     || 'P000',
      name:   provider?.name   || 'Local Service Pro',
      phone:  provider?.phone  || '0300-0000000',
      rating: provider?.rating || 4.8,
      sector: provider?.sector || 'Islamabad',
    },
    service: {
      type:  service.toLowerCase(),
      label: service,
      emoji: serviceEmoji,
    },
    location:       intent?.location || provider?.sector || 'Islamabad',
    slot,
    bookingDate,
    bookingDateLabel: _getDateLabel(timeKey),
    cost: {
      estimated: pricingData.minTotal || priceMin,
      max:       pricingData.maxTotal || priceMax,
      currency:  'PKR',
      breakdown: pricingData.breakdown || [
        { item: "Base Specialist Cost", amount: `Rs ${priceMin}–${priceMax}` }
      ],
      travelFee: pricingData.travelFee || 'Rs 150',
      loyaltyDiscount: pricingData.loyaltyDiscount || 'None',
    },
    intent: {
      rawInput: intent?.rawInput || intent?.input || '',
      language: intent?.language || 'English',
      urgency:  intent?.urgency  || 'medium',
      complexity: intent?.complexity || 'intermediate',
    },
    userName:    intent?.userName    || '',
    userWhatsApp: intent?.userWhatsApp || '',
    followups:   [],
  };

  // ── Attach session customer ID ─────────────────────────────────────────
  let customerId = null;
  try { customerId = await AsyncStorage.getItem('@user_uid'); } catch (_) {}
  if (customerId) booking.customerId = customerId;

  await _saveBooking(booking);

  // ── Link booking to user history in Firebase ─────────────────────────
  if (customerId) {
    linkBookingToUser(booking, customerId).catch(() => {});
  }

  traceService.logAgent(
    'Booking Agent',
    `provider=${provider?.name}, slot=${slot}, cost=PKR ${priceMin}–${priceMax}`,
    `Generated booking ID: ${bookingId}.\n` +
    `Slot: ${slot} on ${_getDateLabel(timeKey)}.\n` +
    `Provider "${provider?.name}" confirmed.\n` +
    `Cost range: PKR ${priceMin}–${priceMax}.\n` +
    `Status: CONFIRMED ✅`,
    booking
  );

  console.log(`[Booking Agent] Completed in ${Date.now() - start}ms`);
  return booking;
}

export async function getAllBookings() {
  const now = Date.now();
  if (_bookingsCache && now < _cacheExpiry) return _bookingsCache;

  try {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    _bookingsCache = raw ? JSON.parse(raw) : [];
    _cacheExpiry = now + CACHE_TTL;
    return _bookingsCache;
  } catch {
    return [];
  }
}

export async function updateBookingStatus(bookingId, status) {
  const bookings = await getAllBookings();
  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx !== -1) {
    bookings[idx].status    = status;
    bookings[idx].updatedAt = new Date().toISOString();
    _bookingsCache = bookings;
    _cacheExpiry   = Date.now() + CACHE_TTL;
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }
}

export async function updateBookingDetails(bookingId, updates) {
  const bookings = await getAllBookings();
  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx !== -1) {
    bookings[idx] = { 
      ...bookings[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    if (updates.timelineStep) {
      if (!bookings[idx].timeline) bookings[idx].timeline = [];
      bookings[idx].timeline.push({
        step: updates.timelineStep,
        done: true,
        time: 'Just now'
      });
      delete bookings[idx].timelineStep;
    }
    _bookingsCache = bookings;
    _cacheExpiry   = Date.now() + CACHE_TTL;
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    return bookings[idx];
  }
  return null;
}

export function invalidateBookingsCache() {
  _bookingsCache = null;
  _cacheExpiry = 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function _generateBookingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'AGT-';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function _selectBestSlot(provider, timeKey) {
  const avail = provider?.availability;
  const slots = Array.isArray(avail) ? avail : ['10:00 AM', '02:00 PM', '05:00 PM'];
  const key   = String(timeKey || '').toLowerCase();

  if (key.includes('morning') || key === 'asap') {
    return slots.find(s => parseInt(s) <= 11) || slots[0];
  }
  if (key.includes('afternoon')) {
    return slots.find(s => {
      const h = parseInt(s);
      return s.toLowerCase().includes('pm') && h >= 12 && h <= 4;
    }) || slots[0];
  }
  if (key.includes('evening')) {
    return slots.slice().reverse().find(s => s.toLowerCase().includes('pm')) || slots[slots.length - 1];
  }
  return slots[0];
}

function _resolveDate(timeKey) {
  const now = new Date();
  const key = String(timeKey || '').toLowerCase();
  if (key === 'asap' || key.startsWith('today') || key === 'urgent') {
    return now.toISOString().split('T')[0];
  }
  if (key.startsWith('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (key === 'day_after') {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }
  // Default: tomorrow
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function _getDateLabel(timeKey) {
  const key = String(timeKey || '').toLowerCase();
  if (key === 'asap' || key.startsWith('today') || key === 'urgent') return 'Today';
  if (key.startsWith('tomorrow')) return 'Tomorrow';
  if (key === 'day_after') return 'Day After Tomorrow';
  return 'Tomorrow';
}

async function _saveBooking(booking) {
  try {
    const existing = await getAllBookings();
    const updated  = [booking, ...existing];
    _bookingsCache = updated;
    _cacheExpiry   = Date.now() + CACHE_TTL;
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[Booking Agent] Failed to save booking:', e);
  }
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
