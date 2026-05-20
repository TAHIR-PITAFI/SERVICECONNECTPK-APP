# Service Connect PK — Complete System Documentation v2.0

Assalam-o-Alaikum! Welcome to the premium documentation of **Service Connect PK v2.0**, now supercharged with a **full Firebase Auth system** (phone + password registration & login), per-user booking history, a **12-Agent Autonomous AI Network**, precise geopoint doorstep calibration, live availability controls, and Roman Urdu voice search!

---

## 1. Core Architecture & Segment Workspaces

The application is structured around three user types with absolute interface segmentation:

```mermaid
graph TD
    A[User App Entry] --> B{Auth Check}
    B -- "No Session" --> C[Guest Mode — Explore Only]
    B -- "Customer Session" --> D[Full Booking + History]
    B -- "Provider Session" --> E[Specialist Dashboard + Map]

    C -->|Tap Register| R[/register — Sign Up Screen]
    C -->|Tap Login| L[/login — Sign In Screen]
    R -->|Success| D
    L -->|Success| D or E

    D -->|Book Service| F[AI Pipeline → Firebase RTDB]
    F --> G[bookings/{id} + users/{uid}/bookings/{id}]
```

### 🔓 Guest Mode Workspace
- Guests can search the directory, view providers, and analyze pipelines
- Booking attempts are intercepted with a lock screen and CTA to Register or Log In
- Profile tab shows two distinct buttons: **Log In** and **Create New Account**

### 👤 Customer Mode Workspace
- **Full Registration Onboarding**: Name, Phone (login key), Email, Password, Home Address, Home Sector
- **Firebase-backed session**: UID stored in AsyncStorage (`@user_uid`) after registration or login
- **Exclusive booking**: Slot selection, 7-day calendar, flip-clock time, booking receipt with tracking ID
- **History linked**: Every booking writes a summary to `users/{uid}/bookings/{bookingId}`
- **Profile card**: Shows 🔥 Firebase UID badge and booking count after login

### 🛠️ Provider Mode Workspace
- **Provider Registration**: Name, Phone, Service Type, Operating Sector, Password
- **Firebase record**: Written to `providers/{uid}/` with `isOnline: false` default
- **Job history**: Each completed booking writes to `providers/{uid}/bookings/{bookingId}`
- **Access Restrict**: Providers cannot execute customer bookings; shown lock screen with redirect

---

## 2. 🔐 Firebase Auth System

### Database Schema

```
serviceconnect-pk-default-rtdb/
├── users/
│   └── {CST-xxx}/
│       ├── uid, role, name, phone, email
│       ├── passwordHash (deterministic JS hash)
│       ├── sector, address, registeredAt, updatedAt
│       └── bookings/
│           └── {AGT-xxx}/   ← booking history entry
├── providers/
│   └── {PRV-xxx}/
│       ├── uid, role, name, phone, serviceType
│       ├── passwordHash, sector, isOnline
│       ├── registeredAt, updatedAt
│       └── bookings/
│           └── {AGT-xxx}/   ← job history entry
├── usersByPhone/
│   └── {phone_key} = uid    ← O(1) login index
├── providersByPhone/
│   └── {phone_key} = uid    ← O(1) provider login index
└── bookings/
    └── {AGT-xxx}/           ← full booking with customerId field
```

### Key Functions (`utils/firebaseHelper.js`)

| Function | Purpose |
|---|---|
| `registerUser(userData)` | Generates UID, hashes password, writes to `users/` or `providers/` + phone index |
| `loginUser(phone, password, role)` | Phone index lookup → fetch record → verify hash |
| `getUserById(uid, role)` | Fetch user record for profile refresh |
| `updateUserProfile(uid, role, updates)` | Merge & write updated profile to RTDB |
| `resetUserPassword(phone, newPassword, role)` | Lookup user by phone index, hash new password, and update `passwordHash` |
| `linkBookingToUser(booking, customerId)` | Write booking summary to `users/{uid}/bookings/` and `providers/{uid}/bookings/` |

### Auth Flow

```
REGISTER:
  /register → fill form → registerUser()
    → RTDB: PUT users/{uid}
    → RTDB: PUT usersByPhone/{phone} = uid
    → AsyncStorage: @user_uid, @user_role, @user_name, @user_phone…
    → Navigate to dashboard

LOGIN:
  /login → enter phone + password → loginUser()
    → RTDB: GET usersByPhone/{phone} → uid
    → RTDB: GET users/{uid}
    → verify passwordHash
    → AsyncStorage: save session

FORGOT PASSWORD:
  /login → tap Forgot Password → enter phone + new password → resetUserPassword()
    → RTDB: GET usersByPhone/{phone} → uid
    → RTDB: PATCH users/{uid} with new passwordHash
    → Navigate to dashboard

BOOKING:
  bookingAgent.js reads @user_uid
    → booking.customerId = uid
    → linkBookingToUser(booking, uid)
      → RTDB: PUT users/{uid}/bookings/{bookingId}
      → RTDB: PUT providers/{pid}/bookings/{bookingId}
```

### Password Security
- Deterministic double-hash implemented in pure JS (`Math.imul` 32-bit)
- Salt: `'SCPK_2026_SALT__' + password + '__END'`
- Output: 12-char uppercase hex prefixed `H`
- **Note**: This is hackathon-grade. Production should use Firebase Auth REST API.

---

## 3. 🟢 Operational Control Center & GPS Base Calibration

Specialists can locate customer residences using automated sector geolocations:

- **Movable & Zoomable Scaled Maps**: 240px interactive MapView with drag/pinch/zoom
- **Direct Doorstep Routing**: "📍 Locate & Drive to Customer House" launcher
- **Sector-Level Navigation Fallback**: Auto-adapts to "📍 Locate & Drive to Sector"
- **🟢 Online/Offline Switch**: Filters providers in/out of customer search
- **📍 GPS Doorstep Calibration**: `expo-location` precise coordinate lock

---

## 4. 🤖 11-Agent Pipeline Architecture

1. **Agent 1: NLP Agent** 💬 — Local ~0.12ms, fallback Groq `llama-3.1-8b-instant` ~120ms
2. **Agent 2: Discovery Agent** 🔍 — 200+ alias filter, category + location radius
3. **Agent 3: Ranking Agent** 🏆 — 8-factor scoring (distance, rating, availability, pricing…)
4. **Agent 4: Matchmaker Agent** 🤝 — Pairs customer with highest-scoring candidate
5. **Agent 5: Scheduling Agent** 📅 — 45-min buffer corridors, conflict resolution
6. **Agent 6: Pricing Agent** 💰 — Peak surge, complexity premium, travel fees, loyalty savings
7. **Agent 7: Communications Agent** 📱 — Bilingual SMS/WhatsApp templates
8. **Agent 8: Dispatch Agent** 🚀 — Real-time ETAs, en-route status
9. **Agent 9: Navigation Agent** 🗺️ — Sector coordinates, 240px maps, turn-by-turn routing
10. **Agent 10: Follow-Up Agent** 🌟 — Post-service surveys, 35% rating penalty
11. **Agent 11: Dispute Agent** 🛡️ — AI settlement, Islamabad Tribunal escalation
12. **Auth System** 🔐 — Runs in parallel; persists session to RTDB and links bookings

---

## 5. High-Fidelity Segmented Rescheduling Time Picker

- **Interactive Clock Picker**: Flip-clock layout with hour/minute/AM-PM controls
- **Direct Text Input**: Free-text manual entry (e.g. `04:30 PM`)
- **Quick Range Blocks**: Fixed standard quick-slot scrollable blocks
- **Dynamic AI Val**: Passes through Scheduling Agent for constraint checks

---

## 6. EAS Android APK Compilation

```json
"preview": {
  "node": "20.11.1",
  "android": { "buildType": "apk" }
}
```

```bash
eas build --platform android --profile preview
```

> [!NOTE]
> Once the build completes, EAS CLI prints the Direct APK Download Link.

---

## 7. Firebase Integration Details

### Active Sync Triggers
- **Registration**: `registerUser()` → `users/{uid}` + `usersByPhone/{phone}`
- **Login**: `loginUser()` → phone index lookup → record fetch → hash verify
- **Booking confirmed**: `syncBookingToFirebaseREST()` → `bookings/{id}` (RTDB + Firestore)
- **Booking history**: `linkBookingToUser()` → `users/{uid}/bookings/{id}` + `providers/{pid}/bookings/{id}`
- **Profile edit**: `updateUserProfile()` → merges and writes back to `users/{uid}` or `providers/{uid}`
- **Provider duty**: `syncProviderDutyStatus()` → `providers/{id}/isOnline`

### No Native SDK Required
All Firebase operations use pure `fetch()` REST calls — fully compatible with Expo Go without any `@react-native-firebase` native build.

---

## 8. Premium UX Refinements & Layout Optimizations

### 🔐 Dual-Mode Login Screen (`/login`)
- **Mode 1** (no session): Shows credential login form (phone + password) with role selector and "Create Account" link
- **Mode 2** (session exists): Shows profile editor with photo picker, sector chips, and Firebase sync

### 🆕 Registration Screen (`/register`)
- Animated gradient hero header
- Animated sliding role toggle (Customer ↔ Provider) with `Animated.spring`
- Real-time 4-segment password strength indicator (Weak → Fair → Good → Strong)
- Customer fields: Name, Phone, Email, Password, Home Address, Sector grid
- Provider fields: Name, Phone, Email, Password, Service Type chips, Sector grid
- Firebase data notice badge showing target collection path

### 🌓 Instantaneous App-wide Theme Transitions
- `setThemeColorsMode(theme)` in synchronous render phase of `app/_layout.jsx`
- Theme updates apply instantly across the same frame

### ⚡ Non-Blocking Telemetry & DB Pipelines
- All Firebase writes are fire-and-forget (`.catch(() => {})`) — UI never blocks
- Booking history linking runs in parallel with the main booking flow

### 🔬 Trace Screen — Auth Category Added
- `Auth System` added as a 12th log category (deep blue `#1a56db`)
- Agent count updated from 11 → 12 in the stats bar

---

## 9. 📄 One-Tap PDF Receipt & Invoice Generator

- `expo-print` + `expo-sharing` for instant HTML-to-PDF
- Itemizes base costs, travel fees, complexity surcharges, peak coefficients
- Native OS share sheet on single tap

---

## 10. 🔔 Local Push Notifications & Dispatch Alerts

- En Route Alerts on provider departure
- Service Complete push confirmations
- High-priority notification channels on Android and iOS

---

## 11. 🛡️ Leak-Proof Telemetry & Teardown Bugfixes

- `isMounted` observer prevents state updates on unmounted viewports
- Radar beacons and GPS interpolation threads stopped on screen exit

---

## 12. 📸 Dynamic Image Picker & Quality Checks

- `expo-image-picker` for gallery + camera captures on profile screens
- Completion checklist: Task done ✓, Workspace clean ✓, Functionality verified ✓
- Photo upload slot for proof evidence

---

## 13. 🎨 Adaptive HSL Specialist Avatar Theming

- Dynamic HSL transitions: `rgba(59,130,246,0.12)` in Light Mode for perfect contrast

---

## 14. 🔄 Decoupled Role Navigation Swaps

- Zero-refresh persistent role switches decoupled from background container listeners

---

## 15. 🔍 Search Results Provider Profile Avatar Integration

- Circular avatar images shown in chatbot recommended specialist cards

---

> **This app is developed by Muhammad Haseeb — Mobile App Developer · Google Hackathon 2026**
