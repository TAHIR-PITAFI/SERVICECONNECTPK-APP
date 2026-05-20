let firestore = null;
try {
  firestore = require('@react-native-firebase/firestore').default;
} catch (e) {
  console.log('[Firebase Helper] Native @react-native-firebase/firestore not available. Sync falls back to high-performance REST APIs.');
}

// Exact Web API Key extracted from google-services.json for secure REST access
const FIREBASE_API_KEY = 'AIzaSyA4cmj3LTpGLBM0-IddwrJbxuanN-VIlN4';

/**
 * ServiceConnect PK — Live Firebase Cloud Firestore & Realtime Database REST Synchronizers
 * Handles seamless real-time synchronization of bookings, profiles, and provider statuses.
 */

/**
 * High-Performance REST Synchronizer for Bookings
 * Handles both flat and nested booking objects from bookingAgent.js
 */
export const syncBookingToFirebaseREST = async (booking) => {
  if (!booking || !booking.id) return;
  
  const serverTimestampStr = new Date().toISOString();

  // ── Flatten nested booking object from bookingAgent into a clean flat structure ──
  // bookingAgent creates: booking.service (object), booking.provider (object), booking.cost (object)
  // Firestore REST only accepts flat field values, so we flatten them here.
  const flatBooking = {
    id:                booking.id,
    createdAt:         booking.createdAt || serverTimestampStr,
    status:            booking.status || 'confirmed',

    // Service fields (handles both flat string and nested object from bookingAgent)
    service:           booking.service?.label || booking.service?.type || (typeof booking.service === 'string' ? booking.service : 'General Service'),
    serviceType:       booking.service?.type  || (typeof booking.service === 'string' ? booking.service : 'general'),
    serviceEmoji:      booking.service?.emoji || '🛠️',

    // Provider fields (handles both nested provider object and flat providerId/providerName)
    providerId:        booking.provider?.id    || booking.providerId    || 'anonymous',
    providerName:      booking.provider?.name  || booking.providerName  || 'Specialist',
    providerPhone:     booking.provider?.phone || booking.providerPhone || '',
    providerRating:    booking.provider?.rating || 0,
    providerSector:    booking.provider?.sector || '',

    // Customer fields
    userName:          booking.userName    || 'Guest User',
    userWhatsApp:      booking.userWhatsApp || '',
    address:           booking.address     || '',
    sector:            booking.location    || booking.sector || booking.provider?.sector || '',

    // Booking time/slot
    slot:              booking.slot             || 'flexible',
    bookingDate:       booking.bookingDate      || '',
    bookingDateLabel:  booking.bookingDateLabel || 'Today',
    paymentMethod:     booking.paymentMethod    || 'Cash payment',

    // Cost fields (handles nested cost object from bookingAgent)
    costEstimated:     Number(booking.cost?.estimated || booking.totalCost || booking.cost || 0),
    costMax:           Number(booking.cost?.max        || 0),
    costCurrency:      booking.cost?.currency || 'PKR',
    travelFee:         String(booking.cost?.travelFee  || 'Rs 0'),
    loyaltyDiscount:   String(booking.cost?.loyaltyDiscount || 'None'),

    // Intent fields
    intentUrgency:     booking.intent?.urgency    || 'medium',
    intentComplexity:  booking.intent?.complexity || 'intermediate',
    intentLanguage:    booking.intent?.language   || 'English',

    timestamp:         serverTimestampStr,
    updatedAt:         booking.updatedAt || serverTimestampStr,
  };

  // ── Build Firestore REST document fields ──────────────────────────────────────
  const firestoreFields = {};
  for (const [key, val] of Object.entries(flatBooking)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string')  firestoreFields[key] = { stringValue: val };
    else if (typeof val === 'number') firestoreFields[key] = { doubleValue: val };
    else if (typeof val === 'boolean') firestoreFields[key] = { booleanValue: val };
  }
  // Add server timestamp separately
  firestoreFields['timestamp'] = { timestampValue: serverTimestampStr };

  const firestoreData = { fields: firestoreFields };
  const fsBodyStr = JSON.stringify(firestoreData);
  const rtdbBodyStr = JSON.stringify(flatBooking);

  // A. ── Cloud Firestore REST Write ──────────────────────────────────────────────
  // NOTE: Firestore REST requires either Firebase Auth token OR Firestore rules set to allow
  // unauthenticated writes. The API key alone is accepted for PATCH requests to Firestore REST.
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/serviceconnect-pk/databases/(default)/documents/bookings/${booking.id}?key=${FIREBASE_API_KEY}`;
  fetch(firestoreUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: fsBodyStr
  }).then(res => {
    if (!res.ok && res.status !== 200) {
      return res.json().then(errBody => {
        console.warn('[Firestore REST] Write FAILED — Status:', res.status, '| Error:', errBody?.error?.message || JSON.stringify(errBody));
      });
    }
    return res.json().then(data => {
      if (data?.error) {
        console.warn('[Firestore REST] Write rejected:', data.error.message);
      } else {
        console.log('[Firestore REST] ✅ Booking written successfully! ID:', booking.id);
      }
    });
  }).catch(err => console.warn('[Firestore REST] Network error:', err.message));

  // B. ── Realtime Database REST Writes ──────────────────────────────────────────
  // RTDB works with open rules — try primary URL first, fallback URLs if it fails
  const rtdbUrls = [
    `https://serviceconnect-pk-default-rtdb.firebaseio.com/bookings/${booking.id}.json`,
    `https://serviceconnect-pk-default-rtdb.asia-southeast1.firebasedatabase.app/bookings/${booking.id}.json`,
  ];

  rtdbUrls.forEach(url => {
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: rtdbBodyStr
    }).then(res => res.json())
      .then(data => {
        if (data?.error) {
          console.warn(`[RTDB REST] Write failed on ${url}:`, data.error);
        } else {
          console.log(`[RTDB REST] ✅ Realtime DB write successful on: ${url}`);
        }
      })
      .catch(err => console.warn(`[RTDB REST] Network error on ${url}:`, err.message));
  });
};

/**
 * High-Performance REST Synchronizer for User Profiles
 */
export const syncUserProfileToFirebaseREST = async (userId, profileData) => {
  if (!userId || !profileData) return;
  const serverTimestampStr = new Date().toISOString();

  const rtdbData = {
    ...profileData,
    updatedAt: serverTimestampStr
  };

  const firestoreFields = {
    updatedAt: { timestampValue: serverTimestampStr }
  };

  for (const [key, val] of Object.entries(profileData)) {
    if (typeof val === 'string') {
      firestoreFields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      firestoreFields[key] = { doubleValue: val };
    } else if (typeof val === 'boolean') {
      firestoreFields[key] = { booleanValue: val };
    }
  }

  const firestoreData = { fields: firestoreFields };

  // A. Cloud Firestore REST Write
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/serviceconnect-pk/databases/default/documents/users/${userId}?key=${FIREBASE_API_KEY}`;
  fetch(firestoreUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firestoreData)
  }).catch(() => {});

  // B. RTDB Writes
  const rtdbUrls = [
    `https://serviceconnect-pk-default-rtdb.firebaseio.com/users/${userId}.json`,
    `https://serviceconnect-pk-default-rtdb.asia-southeast1.firebasedatabase.app/users/${userId}.json`,
    `https://serviceconnect-pk-default-rtdb.europe-west1.firebasedatabase.app/users/${userId}.json`,
    `https://serviceconnect-pk.firebaseio.com/users/${userId}.json`
  ];

  rtdbUrls.forEach(url => {
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rtdbData)
    }).catch(() => {});
  });
};

/**
 * High-Performance REST Synchronizer for Provider Duty status
 */
export const syncProviderDutyToFirebaseREST = async (providerId, isOnline) => {
  if (!providerId) return;
  const serverTimestampStr = new Date().toISOString();

  const rtdbData = {
    isOnline,
    lastActive: serverTimestampStr
  };

  const firestoreData = {
    fields: {
      isOnline: { booleanValue: isOnline },
      lastActive: { timestampValue: serverTimestampStr }
    }
  };

  // A. Cloud Firestore REST Write
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/serviceconnect-pk/databases/default/documents/providers/${providerId}?key=${FIREBASE_API_KEY}`;
  fetch(firestoreUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firestoreData)
  }).catch(() => {});

  // B. RTDB Writes
  const rtdbUrls = [
    `https://serviceconnect-pk-default-rtdb.firebaseio.com/providers/${providerId}.json`,
    `https://serviceconnect-pk-default-rtdb.asia-southeast1.firebasedatabase.app/providers/${providerId}.json`,
    `https://serviceconnect-pk-default-rtdb.europe-west1.firebasedatabase.app/providers/${providerId}.json`,
    `https://serviceconnect-pk.firebaseio.com/providers/${providerId}.json`
  ];

  rtdbUrls.forEach(url => {
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rtdbData)
    }).catch(() => {});
  });
};

/**
 * Dynamic Native + REST Fallback Trigger for Booking Sync
 */
export const syncBookingToFirestore = async (booking) => {
  if (!booking || !booking.id) return;
  
  // 1. Trigger the bulletproof HTTP REST Sync (RTDB + Firestore) instantly in parallel
  try {
    syncBookingToFirebaseREST(booking).catch(() => {});
  } catch (e) {
    console.log('[Firebase Sync] REST trigger skipped.', e.message);
  }

  // 2. Run Native iOS/Android compiled Firebase SDK Sync if available
  if (!firestore) return;
  try {
    const db = firestore();
    const serverTimestamp = firestore.FieldValue ? firestore.FieldValue.serverTimestamp() : new Date();

    const bookingData = {
      id: booking.id,
      service: booking.service || 'General Service',
      providerId: booking.providerId || 'anonymous',
      providerName: booking.providerName || 'Specialist',
      providerPhone: booking.providerPhone || '',
      userName: booking.userName || 'Guest User',
      userWhatsApp: booking.userWhatsApp || '',
      address: booking.address || '',
      sector: booking.location || booking.sector || '',
      status: booking.status || 'pending',
      slot: booking.slot || 'flexible',
      bookingDateLabel: booking.bookingDateLabel || 'Today',
      paymentMethod: booking.paymentMethod || 'Cash payment',
      totalCost: booking.totalCost || booking.cost || 0,
      timestamp: serverTimestamp,
    };

    await db
      .collection('bookings')
      .doc(booking.id)
      .set(bookingData, { merge: true });

    console.log(`[Firebase Sync] Native Firestore successful for booking ${booking.id}`);
  } catch (error) {
    console.warn('[Firebase Sync Warning] Native Firestore write failed:', error.message);
  }
};

/**
 * Dynamic Native + REST Fallback Trigger for User Profiles
 */
export const syncUserProfileToFirestore = async (userId, profileData) => {
  if (!userId || !profileData) return;

  // 1. REST Sync
  try {
    syncUserProfileToFirebaseREST(userId, profileData).catch(() => {});
  } catch (e) {}

  // 2. Native SDK Sync
  if (!firestore) return;
  try {
    const db = firestore();
    const serverTimestamp = firestore.FieldValue ? firestore.FieldValue.serverTimestamp() : new Date();

    await db
      .collection('users')
      .doc(userId)
      .set({
        ...profileData,
        updatedAt: serverTimestamp,
      }, { merge: true });
  } catch (error) {
    console.warn('[Firebase Sync Warning] Native user sync failed:', error.message);
  }
};

/**
 * Dynamic Native + REST Fallback Trigger for Provider status
 */
export const syncProviderDutyStatus = async (providerId, isOnline) => {
  if (!providerId) return;

  // 1. REST Sync
  try {
    syncProviderDutyToFirebaseREST(providerId, isOnline).catch(() => {});
  } catch (e) {}

  // 2. Native SDK Sync
  if (!firestore) return;
  try {
    const db = firestore();
    const serverTimestamp = firestore.FieldValue ? firestore.FieldValue.serverTimestamp() : new Date();

    await db
      .collection('providers')
      .doc(providerId)
      .set({
        isOnline: isOnline,
        lastActive: serverTimestamp,
      }, { merge: true });
  } catch (error) {
    console.warn('[Firebase Sync Warning] Native provider sync failed:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH SYSTEM — Registration, Login, Session & Booking History
//  Uses Firebase RTDB REST (no native SDK required)
//  Schema:
//    users/{uid}/           → customer records
//    providers/{uid}/       → provider records
//    usersByPhone/{key}/    → uid index for fast phone-based login
//    providersByPhone/{key} → uid index for providers
//    users/{uid}/bookings/  → per-customer booking history
// ═══════════════════════════════════════════════════════════════════════════════

const RTDB_BASE = 'https://serviceconnect-pk-default-rtdb.firebaseio.com';

/** Deterministic password hash — no external lib needed */
function _hashPassword(password) {
  const str = 'SCPK_2026_SALT__' + password + '__END';
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = (4294967296 * (2097151 & h2) + (h1 >>> 0));
  return 'H' + Math.abs(combined).toString(16).toUpperCase().padStart(12, '0');
}

/** Encode phone as a safe Firebase key (no . $ # [ ] / in keys) */
function _encodePhoneKey(phone) {
  return (phone || '').replace(/[\.\$\#\[\]\/\-\+ ]/g, '_');
}

/** Generate unique user ID */
function _generateUid(role) {
  const prefix = role === 'provider' ? 'PRV' : 'CST';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/** Low-level RTDB GET */
async function _rtdbGet(path) {
  const res = await fetch(`${RTDB_BASE}/${path}.json`);
  if (!res.ok) throw new Error(`RTDB GET failed: HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error.message || 'RTDB read error');
  return data;
}

/** Low-level RTDB PUT */
async function _rtdbPut(path, data) {
  const res = await fetch(`${RTDB_BASE}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`RTDB PUT failed: HTTP ${res.status}`);
  const result = await res.json();
  if (result && result.error) throw new Error(result.error.message || 'RTDB write error');
  return result;
}

/**
 * Register a new Customer or Provider in Firebase RTDB.
 * Returns the full user record including generated UID.
 *
 * @param {Object} userData - { role, name, phone, email?, password, serviceType?, sector?, address? }
 * @returns {Promise<Object>} saved user record
 */
export const registerUser = async (userData) => {
  const { role, name, phone, email, password, serviceType, sector, address } = userData;
  if (!role || !name || !phone || !password) throw new Error('Missing required registration fields.');

  const collection   = role === 'provider' ? 'providers'       : 'users';
  const phoneIndex   = role === 'provider' ? 'providersByPhone' : 'usersByPhone';
  const phoneKey     = _encodePhoneKey(phone.trim());

  // ── Check for duplicate phone ──────────────────────────────────────────────
  let existingUid = null;
  try { existingUid = await _rtdbGet(`${phoneIndex}/${phoneKey}`); } catch (_) {}
  if (existingUid) throw new Error('An account with this phone number already exists. Please log in.');

  const uid          = _generateUid(role);
  const passwordHash = _hashPassword(password);
  const now          = new Date().toISOString();

  const userRecord = {
    uid,
    role,
    name:         name.trim(),
    phone:        phone.trim(),
    email:        (email || '').trim(),
    passwordHash,
    sector:       sector || '',
    address:      address || '',
    serviceType:  serviceType || '',
    registeredAt: now,
    updatedAt:    now,
  };
  if (role === 'provider') userRecord.isOnline = false;

  // ── Write to Firebase ──────────────────────────────────────────────────────
  await _rtdbPut(`${collection}/${uid}`, userRecord);
  await _rtdbPut(`${phoneIndex}/${phoneKey}`, uid);

  console.log(`[Auth] ✅ Registered ${role}: ${name} → ${uid}`);
  return userRecord;
};

/**
 * Login with phone + password.
 * Looks up UID from phone index, fetches record, verifies hash.
 *
 * @param {string} phone
 * @param {string} password
 * @param {string} role - 'customer' | 'provider'
 * @returns {Promise<Object>} user record
 */
export const loginUser = async (phone, password, role) => {
  if (!phone || !password) throw new Error('Phone and password are required.');

  const collection = role === 'provider' ? 'providers'       : 'users';
  const phoneIndex = role === 'provider' ? 'providersByPhone' : 'usersByPhone';
  const phoneKey   = _encodePhoneKey(phone.trim());

  // ── Lookup UID from phone index ────────────────────────────────────────────
  let uid = null;
  try { uid = await _rtdbGet(`${phoneIndex}/${phoneKey}`); } catch (e) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  if (!uid) throw new Error('No account found with this phone number. Please sign up first.');

  // ── Fetch user record ──────────────────────────────────────────────────────
  let user = null;
  try { user = await _rtdbGet(`${collection}/${uid}`); } catch (e) {
    throw new Error('Failed to load account data. Please try again.');
  }
  if (!user) throw new Error('Account data not found. Please contact support.');

  // ── Verify password ────────────────────────────────────────────────────────
  const passwordHash = _hashPassword(password);
  if (user.passwordHash !== passwordHash) throw new Error('Incorrect password. Please try again.');

  console.log(`[Auth] ✅ Logged in ${role}: ${user.name}`);
  return user;
};

/**
 * Reset password for a given phone and role.
 * Looks up UID from phone index, then updates the passwordHash.
 *
 * @param {string} phone
 * @param {string} newPassword
 * @param {string} role - 'customer' | 'provider'
 * @returns {Promise<void>}
 */
export const resetUserPassword = async (phone, newPassword, role) => {
  if (!phone || !newPassword) throw new Error('Phone and new password are required.');

  const collection = role === 'provider' ? 'providers'       : 'users';
  const phoneIndex = role === 'provider' ? 'providersByPhone' : 'usersByPhone';
  const phoneKey   = _encodePhoneKey(phone.trim());

  let uid = null;
  try { uid = await _rtdbGet(`${phoneIndex}/${phoneKey}`); } catch (e) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  if (!uid) throw new Error('No account found with this phone number.');

  const passwordHash = _hashPassword(newPassword);
  
  // Update the password in Firebase
  const res = await fetch(`${RTDB_BASE}/${collection}/${uid}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwordHash, updatedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error('Failed to reset password. Please try again.');
  
  console.log(`[Auth] ✅ Password reset for ${role} with phone ${phone}`);
};



/**
 * Fetch a user record by UID (for profile refresh).
 */
export const getUserById = async (uid, role) => {
  const collection = role === 'provider' ? 'providers' : 'users';
  try {
    const user = await _rtdbGet(`${collection}/${uid}`);
    return user;
  } catch (e) {
    console.warn('[Auth] getUserById failed:', e.message);
    return null;
  }
};

/**
 * Update a user's profile in Firebase RTDB.
 */
export const updateUserProfile = async (uid, role, updates) => {
  const collection = role === 'provider' ? 'providers' : 'users';
  try {
    const existing = await _rtdbGet(`${collection}/${uid}`);
    const merged   = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await _rtdbPut(`${collection}/${uid}`, merged);
    console.log(`[Auth] ✅ Profile updated for ${uid}`);
    return merged;
  } catch (e) {
    console.warn('[Auth] updateUserProfile failed:', e.message);
    throw e;
  }
};

/**
 * Link a booking to the customer's and provider's history subtrees.
 * Writes a lightweight summary to:
 *   users/{customerId}/bookings/{bookingId}
 *   providers/{providerId}/bookings/{bookingId}
 */
export const linkBookingToUser = async (booking, customerId) => {
  if (!booking?.id) return;
  const now = new Date().toISOString();

  const historyEntry = {
    bookingId:       booking.id,
    service:         booking.service?.label || (typeof booking.service === 'string' ? booking.service : 'Service'),
    serviceEmoji:    booking.service?.emoji || '🛠️',
    providerName:    booking.provider?.name || booking.providerName || 'Specialist',
    providerSector:  booking.provider?.sector || '',
    status:          booking.status || 'confirmed',
    slot:            booking.slot || '',
    bookingDateLabel: booking.bookingDateLabel || 'Today',
    costEstimated:   booking.cost?.estimated || 0,
    paymentMethod:   booking.paymentMethod || 'Cash',
    address:         booking.address || '',
    timestamp:       now,
  };

  // Write to customer history
  if (customerId) {
    _rtdbPut(`users/${customerId}/bookings/${booking.id}`, historyEntry)
      .then(() => console.log(`[Auth] ✅ History linked → users/${customerId}/bookings/${booking.id}`))
      .catch(e => console.warn('[Auth] Customer history link failed:', e.message));
  }

  // Write to provider history
  const providerId = booking.provider?.id || booking.providerId;
  if (providerId && providerId !== 'anonymous' && providerId !== 'P000') {
    _rtdbPut(`providers/${providerId}/bookings/${booking.id}`, historyEntry)
      .catch(e => console.warn('[Auth] Provider history link failed:', e.message));
  }
};
