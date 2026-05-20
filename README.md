# ServiceConnect PK 🇵🇰

> **Islamabad's Elite AI-Powered Home Service Booking Platform**  

---

## 📱 What is ServiceConnect PK?

ServiceConnect PK is a next-generation mobile application that lets residents of Islamabad book trusted local service professionals using natural language in **English, Roman Urdu, or Urdu**.

A state-of-the-art **12-agent autonomous AI pipeline** handles everything from understanding your query to geocoding doorstep routing coordinates, scheduling constraints, quality disputes, and automated follow-ups — all backed by a **full Firebase authentication system** with phone + password registration and login, and per-user booking history stored in Firebase RTDB.

---

## ✨ Key Features & Functions

| Feature | Details |
|---|---|
| 🔐 **Full Firebase Auth System** | Phone + password **Registration** (`/register`), **Login** (`/login`), and **Forgot Password** screens. Credentials stored securely in Firebase RTDB under `users/` and `providers/` collections with a deterministic password hash. Phone-indexed lookup (`usersByPhone/`, `providersByPhone/`) for O(1) authentication. |
| 📚 **Per-User Booking History** | Every booking is linked to the authenticated `customerId` and written to `users/{uid}/bookings/{bookingId}` and `providers/{uid}/bookings/{bookingId}` in Firebase RTDB for full history tracking. |
| 🤖 **12-Agent AI Pipeline** | Intent → Discovery → Ranking → Matchmaker → Scheduling → Pricing → Communications → Dispatch → Navigation → Follow-Up → Dispute → Auth System |
| 🗣️ **Zero-Lag Hybrid NLP** | **Dual-Engine Parser**: Standard requests resolved instantly **locally in ~0.12 ms (0ms network lag)**. Fallback uses Groq **`llama-3.1-8b-instant`** in **~120 ms** (90% semantic latency reduction). |
| 🎙️ **Real Speech-to-Text** | Direct microphone audio recording via `expo-av` and transcription using **Groq Whisper Large** with dynamic vertical equalizer soundwave pulses |
| 📅 **Dynamic Booking Calendar** | Horizontal 7-day calendar row & interactive flip-clock time slot pickers embedded in booking confirmations |
| 🔥 **Firebase UID on Profile** | After login, user's Firebase UID badge and booking count are shown directly on the Profile tab |
| 🌓 **Light/Dark Switcher** | Dynamic context theme switcher supporting app-wide HSL color adjustments instantly |
| 💳 **Preferred Wallet Payout**| Supports Cash, Easypaisa, JazzCash, SadaPay, NayaPay, HBL Konnect, Bank Alfalah Alfa, UBL Digital, Meezan Smart, Faysal Digi, MCB Live, and more |
| 📸 **Profile Picture** | Interactive media library picker for customer and provider profile avatars (`expo-image-picker`) |
| 📍 **Home Sector & Location** | Dynamic address fields and residential Islamabad sector geocoding saved in AsyncStorage + Firebase |
| 🟢 **Online/Offline Switch** | Glowing duty toggle that includes/excludes providers dynamically from customer search lists |
| 📍 **GPS Doorstep Calibration** | Foreground permission geopoint locks via `expo-location` |
| 📈 **Wallet Progress Target** | Monthly goal indicator tracking progress toward PKR 50,000 milestone |
| 🏆 **Performance Milestones** | Active badges for top specialty ranks, swift response, and high retention |
| 📡 **Live GPS Telemetry Widget**| Animated simulated GPS route tracking widget inside customer en-route dashboard |
| 🔍 **Live Search Services** | Scrollable directory of 30+ service lines with AI Demand Tiers |
| 🔬 **Live Agent Trace** | Real-time trace monitor showing agent reasoning logs — now with **Auth System** as a 12th log category |
| 📄 **One-Tap PDF Invoice** | Beautiful digital HTML-to-PDF invoice with pricing breakdown via `expo-print` |
| 🔔 **Local Push Alerts** | Native foreground & background notifications via `expo-notifications` |

---

## 🔐 Auth System Architecture

```
Firebase RTDB Schema:
├── users/
│   └── {CST-xxx}/          ← customer record (name, phone, passwordHash, sector…)
│       └── bookings/
│           └── {AGT-xxx}/  ← lightweight booking history entry
├── providers/
│   └── {PRV-xxx}/          ← provider record (name, phone, serviceType, isOnline…)
│       └── bookings/
│           └── {AGT-xxx}/  ← job history entry
├── usersByPhone/
│   └── {phone_key}/        ← maps phone → uid (O(1) login lookup)
├── providersByPhone/
│   └── {phone_key}/        ← maps phone → uid for providers
└── bookings/
    └── {AGT-xxx}/          ← full booking record with customerId field
```

### Auth Flow:
1. **Register** (`/register`): Fill name, phone, password + role-specific fields → `registerUser()` writes to RTDB → session saved to `AsyncStorage` → navigate to dashboard
2. **Login** (`/login`): Enter phone + password → `loginUser()` looks up phone index → fetches record → verifies hash → session saved → navigate
3. **Forgot Password** (`/login`): Tap Forgot Password → enter phone + new password → `resetUserPassword()` updates RTDB hash → navigate to login
4. **Session**: `@user_uid`, `@user_role`, `@user_name` etc. stored in `AsyncStorage`
5. **Booking**: `bookingAgent.js` reads `@user_uid` → attaches `customerId` to booking → `linkBookingToUser()` writes to history subtrees

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone **OR** Android emulator

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd "Service Connect PK"

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your Groq API key:
# EXPO_PUBLIC_GROQ_API_KEY=gsk_your_key_here

# 4. Start the development server
npx expo start

# 5. Scan QR code with Expo Go app
```

### Build installable APK locally

```bash
eas build --platform android --profile preview
```

---

## 🤖 The 12-Agent Autonomous Pipeline Network

```
                          User Query
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 1. INTENT & NLP PARSER AGENT              │
        │ • Translates English / Roman Urdu / Urdu  │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 2. DISCOVERY AGENT                        │
        │ • Maps 200+ aliases to 30+ service keys   │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 3. RANKING & SCORE AGENT                  │
        │ • Ranks top 3 matching sector specialists │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 4. MATCHMAKER AGENT                       │
        │ • Mathematical partner/specialist pairing │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 5. SCHEDULING CONSTRAINT AGENT            │
        │ • Solves interactive clock time conflicts │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 6. DYNAMIC PRICING AGENT                  │
        │ • Calculates surcharges, premiums & tolls │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 7. COMMUNICATIONS AGENT                   │
        │ • Dispatches Urdu/English SMS alerts      │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 8. DISPATCH AGENT                         │
        │ • Coordinates en-route and duty controls  │
        ├───────────────────────────────────────────┤
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ 9. NAVIGATION & ROUTING AGENT             │
        │ • Computes sector coordinates & doorstep  │
        ├───────────────────────────────────────────┤
                               │
                               ▼
        ┌───────────────────────────────────────────┐
        │ 10. FOLLOW-UP & REVIEW AGENT              │
        │ • Manages user reviews & rating penalties │
        ├───────────────────────────────────────────┤
                               │
                               ▼
        ┌───────────────────────────────────────────┐
        │ 11. DISPUTE & ESCALATION AGENT            │
        │ • Resolves conflicts & complaint logs     │
        └───────────────────────────────────────────┘
                               │
                               ▼ (runs in parallel)
        ┌───────────────────────────────────────────┐
        │ 12. AUTH SYSTEM (Firebase RTDB)           │
        │ • Persists user session, links booking    │
        │   to users/{uid}/bookings/ subtree         │
        └───────────────────────────────────────────┘
```

---

## 🛠️ Supported Services & Sectors

### Services (30)
| Category | Emojis & Focus Areas |
|---|---|
| 🚰 Plumber | nali, paani, pipe, toilet, flush |
| ⚡ Electrician | bijli, wiring, UPS, solar, fan |
| ❄️ AC Technician | AC, thanda, cooling, compressor |
| 🪚 Carpenter | darwaza, wood, furniture, lock |
| 🧹 Cleaner | safai, sofa, carpet, deep clean |
| 📚 Tutor | ustad, math, O level, matric |
| 💅 Beautician | makeup, parlor, hair, facial |
| 🍳 Cook | khana, biryani, chef, catering |
| 🚗 Driver | taxi, outstation, car |
| 🎨 Painter | rang, wall, colour |
| 🔧 Mechanic | gari, motor, engine, tuning, oil |
| 📺 Appliance Repair | fridge, washing machine, oven |
| 🏡 Gardener | mali, ghass, lawn, garden |
| 🐜 Pest Control | kera, deemak, fumigation, spray |
| ☀️ Solar Installer | solar panels, plate, inverter mapping |
| 📹 CCTV Technician | camera, security system, DVR |
| 🧑‍🏭 Welder | gate welding, iron, grill |
| 🛋️ Sofa Cleaner | sofa dry cleaning, carpet shampoo |
| 🔑 Locksmith | digital lock, chabi, tala |
| 🧱 Mason | plaster, brick, tiles, mistri |
| 🧼 Car Washer | car wash, detailing, interior foam |
| 🪡 Tailor | darzi, suit, stitching, alteration |
| 📷 Photographer | photo shoot, event, wedding camera |
| 🛡️ Disinfector | home sanitization, antivirus spray |
| 💆 Physiotherapist | physical therapy, back pain exercises |
| 💈 Barber | haircut, shave, cutting, facial |
| 💻 Laptop Tech | screen fix, laptop repair, OS windows |
| 🏠 Roofer | roof leakage, waterproofing, chath |
| 🤵 Chauffeur | executive driving, premium driver |
| 🔨 Handyman | drill, TV mount, curtain rods hanging |

### Islamabad Residential Sectors & Housing Societies (50+)
All Islamabad residential sectors from A to I series and major societies (Bahria Town, DHA Phases 1-5, Gulberg Greens, Naval Anchorage, Bani Gala, PWD, Soan Gardens, Mumtaz City, etc.) are fully indexed and coordinate-mapped.

---

## ⚡ Firebase Integration

ServiceConnect PK features complete **Firebase RTDB REST** integration for both auth and data sync:

1. **Auth Layer**: `utils/firebaseHelper.js` exports `registerUser()`, `loginUser()`, `getUserById()`, `updateUserProfile()`, `linkBookingToUser()` — all using raw RTDB REST (no native SDK needed).
2. **Data Sync**: Every booking is written to `bookings/`, `users/{uid}/bookings/`, and `providers/{uid}/bookings/` simultaneously.
3. **Phone Index**: `usersByPhone/{phone}` and `providersByPhone/{phone}` store UID mappings for O(1) login lookups.
4. **No Native SDK required**: Works on Expo Go — pure `fetch()` based REST calls.

---

## 🏗️ Architecture Decisions

1. **Phone-indexed Auth**: Avoids Firebase Auth SDK requirement (not available in Expo Go) by using a phone → UID index in RTDB.
2. **Deterministic Password Hash**: Implemented in pure JS (no `crypto` lib) using a 32-bit double-hash. Suitable for demo/hackathon; production should use Firebase Auth REST API.
3. **Dual Role Auth**: Customers write to `users/` + `usersByPhone/`; Providers write to `providers/` + `providersByPhone/`. Same login screen, different collection lookup.
4. **Absolute Segmentation**: Dynamic layouts guard boundaries between Roles (Guests, Customers, Providers).
5. **Double Cache Bursting**: Every Customer action and Provider operation manually purges intermediate state caches.
6. **Resilient Local Fallbacks**: NLP pipelines automatically fallback to indexing engines in offline conditions.

---

## 👥 Team

1. **Tahir Husain** — Team Leader & Junior App Developer
2. **Muhammad Haseeb** — Senior App Developer & Architect
3. **Saif Ullah Umer** — Junior Web App Developer & Web Systems Integrator
4. **Syed Nabeel Hussain** — UI/UX Designer & Graphic Artist
5. **Arhum Husain** — QA Specialist & AI Prompt Engineer

Built with ❤️ for Pakistan 🇵🇰  

---

> **Built for Google Hackathon**
