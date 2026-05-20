/**
 * utils/providerIndex.js
 * 
 * Builds a pre-indexed lookup for providers by service type.
 * Supports fuzzy matching, Urdu/Roman-Urdu aliases, and typo tolerance.
 * This replaces the O(n) filter in the orchestrator with O(1) lookup.
 */

import providersRaw from '../data/providers.json';

// ─── Service Alias Map ─────────────────────────────────────────────────────────
// Maps any user input keyword → canonical service name (must match providers.json)
const SERVICE_ALIASES = {
  // Plumber
  'plumber':        'Plumber',
  'plumbing':       'Plumber',
  'pipe':           'Plumber',
  'pipes':          'Plumber',
  'leak':           'Plumber',
  'leakage':        'Plumber',
  'nali':           'Plumber',
  'paani':          'Plumber',
  'water':          'Plumber',
  'flush':          'Plumber',
  'tap':            'Plumber',
  'faucet':         'Plumber',
  'toilet':         'Plumber',
  'drain':          'Plumber',
  'bathroom':       'Plumber',

  // Electrician
  'electrician':    'Electrician',
  'electric':       'Electrician',
  'electrical':     'Electrician',
  'bijli':          'Electrician',
  'wiring':         'Electrician',
  'wire':           'Electrician',
  'socket':         'Electrician',
  'switch':         'Electrician',
  'light':          'Electrician',
  'fan':            'Electrician',
  'ups':            'Electrician',
  'solar':          'Electrician',
  'inverter':       'Electrician',
  'short circuit':  'Electrician',

  // AC Technician
  'ac':             'AC Technician',
  'ac technician':  'AC Technician',
  'air conditioner':'AC Technician',
  'air conditioning':'AC Technician',
  'cooling':        'AC Technician',
  'ac repair':      'AC Technician',
  'ac service':     'AC Technician',
  'ac gas':         'AC Technician',
  'thanda':         'AC Technician',
  'compressor':     'AC Technician',
  'split ac':       'AC Technician',

  // Carpenter
  'carpenter':      'Carpenter',
  'carpentry':      'Carpenter',
  'wood':           'Carpenter',
  'wooden':         'Carpenter',
  'darwaza':        'Carpenter',
  'furniture':      'Carpenter',
  'lock':           'Carpenter',
  'hinge':          'Carpenter',
  'cabinet':        'Carpenter',
  'wardrobe':       'Carpenter',
  'door':           'Carpenter',
  'drawer':         'Carpenter',

  // Cleaner
  'cleaner':        'Cleaner',
  'cleaning':       'Cleaner',
  'safai':          'Cleaner',
  'sofa wash':      'Cleaner',
  'sofa':           'Cleaner',
  'carpet':         'Cleaner',
  'deep clean':     'Cleaner',
  'maid':           'Cleaner',
  'sweep':          'Cleaner',
  'wash':           'Cleaner',

  // Tutor
  'tutor':          'Tutor',
  'teacher':        'Tutor',
  'ustad':          'Tutor',
  'teaching':       'Tutor',
  'education':      'Tutor',
  'math':           'Tutor',
  'physics':        'Tutor',
  'english':        'Tutor',
  'ielts':          'Tutor',
  'o level':        'Tutor',
  'a level':        'Tutor',
  'matric':         'Tutor',
  'fsc':            'Tutor',
  'academy':        'Tutor',

  // Beautician
  'beautician':     'Beautician',
  'beauty':         'Beautician',
  'makeup':         'Beautician',
  'parlor':         'Beautician',
  'parlour':        'Beautician',
  'salon':          'Beautician',
  'bridal':         'Beautician',
  'facial':         'Beautician',
  'threading':      'Beautician',
  'hair':           'Beautician',

  // Cook
  'cook':           'Cook',
  'chef':           'Cook',
  'khana':          'Cook',
  'biryani':        'Cook',
  'food':           'Cook',
  'cooking':        'Cook',
  'bawarchi':       'Cook',
  'catering':       'Cook',
  'bbq':            'Cook',

  // Driver
  'driver':         'Driver',
  'driving':        'Driver',
  'car':            'Driver',
  'taxi':           'Driver',
  'transport':      'Driver',
  'chauffeur':      'Driver',
  'outstation':     'Driver',

  // Painter
  'painter':        'Painter',
  'painting':       'Painter',
  'paint':          'Painter',
  'wall':           'Painter',
  'rang':           'Painter',
  'colour':         'Painter',
  'color':          'Painter',
  'wallpaper':      'Painter',

  // Mechanic (11)
  'mechanic':       'Mechanic',
  'car repair':     'Mechanic',
  'bike repair':    'Mechanic',
  'tuning':         'Mechanic',
  'oil change':     'Mechanic',
  'engine':         'Mechanic',
  'gari':           'Mechanic',
  'motorcycle':     'Mechanic',

  // Appliance Repair (12)
  'appliance repair': 'Appliance Repair',
  'fridge':         'Appliance Repair',
  'refrigerator':   'Appliance Repair',
  'microwave':      'Appliance Repair',
  'washing machine':'Appliance Repair',
  'oven':           'Appliance Repair',
  'washing':        'Appliance Repair',
  'dryer':          'Appliance Repair',

  // Gardener (13)
  'gardener':       'Gardener',
  'gardening':      'Gardener',
  'lawn':           'Gardener',
  'grass':          'Gardener',
  'mowing':         'Gardener',
  'flower':         'Gardener',
  'pauda':          'Gardener',
  'mali':           'Gardener',

  // Pest Control (14)
  'pest control':   'Pest Control',
  'pest':           'Pest Control',
  'termite':        'Pest Control',
  'fumigation':     'Pest Control',
  'cockroach':      'Pest Control',
  'kera':           'Pest Control',
  'spray':          'Pest Control',

  // Solar Installer (15)
  'solar installer':'Solar Installer',
  'solar':          'Solar Installer',
  'solar panel':    'Solar Installer',
  'panel':          'Solar Installer',
  'sun':            'Solar Installer',
  'plate':          'Solar Installer',

  // CCTV Technician (16)
  'cctv technician':'CCTV Technician',
  'cctv':           'CCTV Technician',
  'camera':         'CCTV Technician',
  'security':       'CCTV Technician',
  'dvr':            'CCTV Technician',

  // Welder (17)
  'welder':         'Welder',
  'welding':        'Welder',
  'gate':           'Welder',
  'iron':           'Welder',
  'loha':           'Welder',
  'grill':          'Welder',

  // Sofa Cleaner (18)
  'sofa cleaner':   'Sofa Cleaner',
  'sofa':           'Sofa Cleaner',
  'sofa washing':   'Sofa Cleaner',

  // Locksmith (19)
  'locksmith':      'Locksmith',
  'lock':           'Locksmith',
  'key':            'Locksmith',
  'chabi':          'Locksmith',
  'tala':           'Locksmith',

  // Mason (20)
  'mason':          'Mason',
  'brick':          'Mason',
  'cement':         'Mason',
  'plaster':        'Mason',
  'tile':           'Mason',
  'marble':         'Mason',
  'mistri':         'Mason',

  // Car Washer (21)
  'car washer':     'Car Washer',
  'car wash':       'Car Washer',
  'dhona':          'Car Washer',
  'wash':           'Car Washer',

  // Tailor (22)
  'tailor':         'Tailor',
  'tailoring':      'Tailor',
  'stitching':      'Tailor',
  'darzi':          'Tailor',
  'suit':           'Tailor',
  'alteration':     'Tailor',

  // Photographer (23)
  'photographer':   'Photographer',
  'photography':    'Photographer',
  'photo':          'Photographer',
  'shoot':          'Photographer',
  'event':          'Photographer',

  // Disinfector (24)
  'disinfector':    'Disinfector',
  'sanitizer':      'Disinfector',
  'disinfection':   'Disinfector',

  // Physiotherapist (25)
  'physiotherapist':'Physiotherapist',
  'physio':         'Physiotherapist',
  'therapy':        'Physiotherapist',
  'exercise':       'Physiotherapist',
  'back pain':      'Physiotherapist',

  // Barber (26)
  'barber':         'Barber',
  'haircut':        'Barber',
  'shave':          'Barber',
  'cutting':        'Barber',
  'salon':          'Barber',
  'hajam':          'Barber',

  // Laptop Tech (27)
  'laptop tech':    'Laptop Tech',
  'laptop':         'Laptop Tech',
  'computer':       'Laptop Tech',
  'mobile repair':  'Laptop Tech',
  'screen':         'Laptop Tech',

  // Roofer (28)
  'roofer':         'Roofer',
  'waterproofing':  'Roofer',
  'roof':           'Roofer',
  'chath':          'Roofer',

  // Chauffeur (29)
  'chauffeur':      'Chauffeur',

  // Handyman (30)
  'handyman':       'Handyman',
  'drill':          'Handyman',
  'wall mount':     'Handyman',
  'curtain':        'Handyman',
};

// ─── Sector Alias Map ─────────────────────────────────────────────────────────
const SECTOR_ALIASES = {
  'f7': 'F-7', 'f 7': 'F-7',
  'f8': 'F-8', 'f 8': 'F-8',
  'f10': 'F-10', 'f 10': 'F-10',
  'f11': 'F-11', 'f 11': 'F-11',
  'f6': 'F-6', 'f 6': 'F-6',
  'g9': 'G-9', 'g 9': 'G-9',
  'g11': 'G-11', 'g 11': 'G-11',
  'g13': 'G-13', 'g 13': 'G-13',
  'g14': 'G-14', 'g 14': 'G-14',
  'g10': 'G-10', 'g 10': 'G-10',
  'g6': 'G-6', 'g 6': 'G-6',
  'g8': 'G-8', 'g 8': 'G-8',
  'e11': 'E-11', 'e 11': 'E-11',
  'e7': 'E-7', 'e 7': 'E-7',
  'i8': 'I-8', 'i 8': 'I-8',
  'i9': 'I-9', 'i 9': 'I-9',
  'i10': 'I-10', 'i 10': 'I-10',
  'h13': 'H-13', 'h 13': 'H-13',
  'd12': 'D-12', 'd 12': 'D-12',
  'bahria': 'Bahria Town', 'bahria town': 'Bahria Town',
  'dha': 'DHA Phase 2', 'dha 2': 'DHA Phase 2', 'dha phase 2': 'DHA Phase 2',
};

// ─── Pre-built Index ───────────────────────────────────────────────────────────
let _index = null;

function buildIndex() {
  if (_index) return _index;
  _index = {};
  for (const provider of providersRaw) {
    const key = provider.service.toLowerCase();
    if (!_index[key]) _index[key] = [];
    _index[key].push({
      ...provider,
      available: true, // default available
      reviews: Array.isArray(provider.reviews) ? provider.reviews.length : 0,
    });
  }
  return _index;
}

/**
 * Resolve a raw service string to canonical service name
 * @param {string} raw - e.g. "plumber", "bijli", "AC repair", "nali ka masla"
 * @returns {string|null} canonical name e.g. "Plumber", or null if unrecognized
 */
export function resolveService(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();

  // Direct match in aliases
  if (SERVICE_ALIASES[lower]) return SERVICE_ALIASES[lower];

  // Try word-by-word match
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (SERVICE_ALIASES[word]) return SERVICE_ALIASES[word];
  }

  // Try partial contains match (multi-word keys)
  for (const [alias, canonical] of Object.entries(SERVICE_ALIASES)) {
    if (lower.includes(alias)) return canonical;
  }

  return null;
}

/**
 * Resolve a raw location string to canonical sector name
 * @param {string} raw - e.g. "f7", "G 11", "Bahria"
 * @returns {string} canonical sector e.g. "F-7", or raw if unresolved
 */
export function resolveSector(raw) {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim().replace(/[-\s]+/g, ' ');
  const normalized = lower.replace(/\s+/g, '');

  if (SECTOR_ALIASES[lower]) return SECTOR_ALIASES[lower];
  if (SECTOR_ALIASES[normalized]) return SECTOR_ALIASES[normalized];

  // Try to match "F-7" format directly
  const dashFormat = raw.toUpperCase().trim();
  const allSectors = [...new Set(providersRaw.map(p => p.sector))];
  const exact = allSectors.find(s => s.toUpperCase() === dashFormat);
  if (exact) return exact;

  return raw; // return as-is if can't resolve
}

/**
 * Get providers for a service (O(1) lookup after index build)
 * @param {string} service - canonical service name e.g. "Plumber"
 * @returns {Array} provider list
 */
export function getProvidersByService(service) {
  const index = buildIndex();
  return index[service.toLowerCase()] || [];
}

/**
 * Get all unique sectors that have providers for a service
 */
export function getSectorsForService(service) {
  return [...new Set(getProvidersByService(service).map(p => p.sector))];
}

/**
 * Get all available service categories
 */
export function getAllServices() {
  return [...new Set(providersRaw.map(p => p.service))].sort();
}

export const ALL_SERVICE_EMOJIS = {
  'Plumber':        '🚰',
  'Electrician':    '⚡',
  'AC Technician':  '❄️',
  'Carpenter':      '🪚',
  'Cleaner':        '🧹',
  'Tutor':          '📚',
  'Beautician':     '💅',
  'Cook':           '🍳',
  'Driver':         '🚗',
  'Painter':        '🎨',
  'Mechanic':       '🔧',
  'Appliance Repair':'📺',
  'Gardener':       '🏡',
  'Pest Control':   '🐜',
  'Solar Installer':'☀️',
  'CCTV Technician':'📹',
  'Welder':         '🧑‍🏭',
  'Sofa Cleaner':   '🛋️',
  'Locksmith':      '🔑',
  'Mason':          '🧱',
  'Car Washer':     '🧼',
  'Tailor':         '🪡',
  'Photographer':   '📷',
  'Disinfector':    '🛡️',
  'Physiotherapist':'💆',
  'Barber':         '💈',
  'Laptop Tech':    '💻',
  'Roofer':         '🏠',
  'Chauffeur':      '🤵',
  'Handyman':       '🔨',
};
