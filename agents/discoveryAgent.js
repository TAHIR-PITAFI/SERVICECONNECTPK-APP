/**
 * AGENT 2: DISCOVERY AGENT
 * Finds providers matching service type and location
 */

import { getProvidersNearSector, getDistanceToSector } from '../data/providers';
import { logTraceStep } from '../services/traceService';

export async function runDiscoveryAgent(intent) {
  const start = Date.now();
  await _delay(250 + Math.random() * 150);

  const { serviceType, location, timeKey } = intent;

  // Filter by service type
  const allProviders = getProvidersNearSector(serviceType, location, 20);

  // Filter by availability based on time preference
  const available = _filterByAvailability(allProviders, timeKey);

  const duration = Date.now() - start;

  logTraceStep('DISCOVERY', {
    duration,
    input: { serviceType, location, timeKey },
    output: {
      totalSearched: 60,
      categoryMatches: allProviders.length,
      availableMatches: available.length,
      providers: available.map(p => ({ id: p.id, name: p.name, sector: p.sector })),
    },
    reasoning: _buildReasoning(serviceType, location, allProviders, available),
    toolsCalled: ['providerDatabase', 'geoFilter', 'availabilityFilter'],
    status: 'success',
  });

  if (available.length === 0) {
    // Fallback: return all without time filter
    return allProviders.slice(0, 5);
  }

  return available;
}

function _filterByAvailability(providers, timeKey) {
  const needsToday = timeKey.startsWith('today') || timeKey === 'asap';
  const needsTomorrow = timeKey.startsWith('tomorrow');

  return providers.filter(p => {
    if (timeKey === 'asap') return p.availability.today;
    if (needsToday) return p.availability.today;
    if (needsTomorrow) return p.availability.tomorrow;
    // flexible / this_week / day_after — any provider
    return p.availability.today || p.availability.tomorrow;
  });
}

function _buildReasoning(serviceType, location, allMatches, available) {
  return (
    `Searched 60 providers in the database.\n` +
    `Found ${allMatches.length} providers offering "${serviceType}" within 20km of ${location}.\n` +
    `Applied availability filter for requested time → ${available.length} providers available.\n` +
    `${available.length === 0 ? 'No exact time match — relaxing constraint.' : 'Proceeding with available candidates.'}`
  );
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
