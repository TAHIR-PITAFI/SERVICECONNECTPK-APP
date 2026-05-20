/**
 * utils/mapHelper.js
 * 
 * Geographic coordinate utilities for Islamabad sectors.
 * Helps plot user location and provider pins on Google Maps.
 */

export const SECTOR_COORDS = {
  // A-Sectors
  'A-17': { latitude: 33.6420, longitude: 72.8680 },
  'A-18': { latitude: 33.6320, longitude: 72.8480 },

  // B-Sectors
  'B-17': { latitude: 33.6820, longitude: 72.8120 },
  'B-18': { latitude: 33.6700, longitude: 72.7980 },

  // C-Sectors
  'C-15': { latitude: 33.6820, longitude: 72.9050 },
  'C-16': { latitude: 33.6720, longitude: 72.8900 },

  // D-Sectors
  'D-12': { latitude: 33.6925, longitude: 72.9430 },
  'D-17': { latitude: 33.6620, longitude: 72.8250 },
  'D-18': { latitude: 33.6520, longitude: 72.8050 },

  // E-Sectors
  'E-7':  { latitude: 33.7265, longitude: 73.0460 },
  'E-8':  { latitude: 33.7220, longitude: 73.0220 },
  'E-9':  { latitude: 33.7150, longitude: 73.0020 },
  'E-10': { latitude: 33.7080, longitude: 72.9900 },
  'E-11': { latitude: 33.6985, longitude: 72.9785 },
  'E-12': { latitude: 33.6890, longitude: 72.9320 },
  'E-16': { latitude: 33.6450, longitude: 72.8350 },
  'E-17': { latitude: 33.6350, longitude: 72.8150 },
  'E-18': { latitude: 33.6250, longitude: 72.7950 },

  // F-Sectors
  'F-5':  { latitude: 33.7380, longitude: 73.0900 },
  'F-6':  { latitude: 33.7297, longitude: 73.0735 },
  'F-7':  { latitude: 33.7214, longitude: 73.0564 },
  'F-8':  { latitude: 33.7125, longitude: 73.0382 },
  'F-9':  { latitude: 33.7020, longitude: 73.0210 },
  'F-10': { latitude: 33.6920, longitude: 73.0110 },
  'F-11': { latitude: 33.6835, longitude: 72.9885 },
  'F-12': { latitude: 33.6650, longitude: 72.9550 },
  'F-15': { latitude: 33.6280, longitude: 72.9020 },
  'F-17': { latitude: 33.6080, longitude: 72.8750 },

  // G-Sectors
  'G-5':  { latitude: 33.7230, longitude: 73.0920 },
  'G-6':  { latitude: 33.7172, longitude: 73.0768 },
  'G-7':  { latitude: 33.7080, longitude: 73.0550 },
  'G-8':  { latitude: 33.7015, longitude: 73.0375 },
  'G-9':  { latitude: 33.6912, longitude: 73.0185 },
  'G-10': { latitude: 33.6795, longitude: 72.9985 },
  'G-11': { latitude: 33.6685, longitude: 72.9970 },
  'G-12': { latitude: 33.6550, longitude: 72.9650 },
  'G-13': { latitude: 33.6420, longitude: 72.9680 },
  'G-14': { latitude: 33.6320, longitude: 72.9520 },
  'G-15': { latitude: 33.6180, longitude: 72.9150 },
  'G-16': { latitude: 33.6050, longitude: 72.8950 },
  'G-17': { latitude: 33.5950, longitude: 72.8750 },

  // H-Sectors
  'H-8':  { latitude: 33.6780, longitude: 73.0650 },
  'H-9':  { latitude: 33.6680, longitude: 73.0420 },
  'H-10': { latitude: 33.6550, longitude: 73.0180 },
  'H-11': { latitude: 33.6350, longitude: 72.9920 },
  'H-12': { latitude: 33.6280, longitude: 72.9750 },
  'H-13': { latitude: 33.6210, longitude: 72.9690 },

  // I-Sectors
  'I-8':  { latitude: 33.6682, longitude: 73.0685 },
  'I-9':  { latitude: 33.6550, longitude: 73.0450 },
  'I-10': { latitude: 33.6435, longitude: 73.0270 },
  'I-11': { latitude: 33.6210, longitude: 73.0150 },
  'I-12': { latitude: 33.6100, longitude: 72.9980 },
  'I-14': { latitude: 33.5980, longitude: 72.9420 },
  'I-16': { latitude: 33.5780, longitude: 72.9050 },

  // Major Housing Societies / Gated Residential Areas
  'DHA PHASE 1':     { latitude: 33.5350, longitude: 73.1250 },
  'DHA PHASE 2':     { latitude: 33.5250, longitude: 73.1550 },
  'DHA PHASE 3':     { latitude: 33.5150, longitude: 73.1850 },
  'DHA PHASE 4':     { latitude: 33.5050, longitude: 73.2050 },
  'DHA PHASE 5':     { latitude: 33.4950, longitude: 73.2250 },
  'BAHRIA TOWN':     { latitude: 33.5650, longitude: 73.1250 },
  'GULBERG GREENS':   { latitude: 33.5850, longitude: 73.1380 },
  'SOAN GARDENS':     { latitude: 33.5420, longitude: 73.1480 },
  'PWD COLONY':       { latitude: 33.5550, longitude: 73.1420 },
  'NAVAL ANCHORAGE':  { latitude: 33.5650, longitude: 73.1850 },
  'GHAURI TOWN':      { latitude: 33.6120, longitude: 73.1420 },
  'BANI GALA':        { latitude: 33.7020, longitude: 73.1580 },
  'BHARA KAHU':       { latitude: 33.7480, longitude: 73.1820 },
  'MUMTAZ CITY':      { latitude: 33.6150, longitude: 72.8450 },
  'TOP CITY':         { latitude: 33.6050, longitude: 72.8250 }
};

/**
 * Resolves a raw sector string to GPS coordinates.
 * Defaults to Islamabad Center if unrecognized.
 */
export function getSectorCoords(sectorName) {
  if (!sectorName) return { latitude: 33.6844, longitude: 73.0479 };
  
  const clean = sectorName.toUpperCase().trim();
  
  // Try direct match
  if (SECTOR_COORDS[clean]) {
    return SECTOR_COORDS[clean];
  }
  
  // Try word-based match (e.g. "Sector G-11" -> "G-11")
  for (const [sec, coords] of Object.entries(SECTOR_COORDS)) {
    if (clean.includes(sec)) {
      return coords;
    }
  }
  
  // Default to Islamabad Center
  return { latitude: 33.6844, longitude: 73.0479 };
}

/**
 * Returns a list of coordinate objects suitable for MapView fitToCoordinates.
 */
export function getFitCoords(userCoords, providers) {
  const list = [userCoords];
  if (Array.isArray(providers)) {
    providers.forEach(p => {
      const lat = p.coordinates?.lat || p.coordinates?.latitude;
      const lng = p.coordinates?.lng || p.coordinates?.lon || p.coordinates?.longitude;
      if (lat && lng) {
        list.push({ latitude: Number(lat), longitude: Number(lng) });
      }
    });
  }
  return list;
}
