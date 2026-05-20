/**
 * AGENT 3: RANKING AGENT
 * Scores and ranks discovered providers
 * Formula: distance(30%) + rating(25%) + availability(20%) + complexity(15%) + capacity(10%)
 */

import { getDistanceToSector } from '../data/providers';
import { logTraceStep } from '../services/traceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEIGHTS = {
  distance: 0.30,
  rating: 0.25,
  availability: 0.20,
  complexity: 0.15,
  capacity: 0.10,
};

export async function runRankingAgent(providers, intent) {
  const start = Date.now();
  await _delay(400 + Math.random() * 200);

  const { location, timeKey, urgency } = intent;
  const jobComplexity = intent.complexity || 'intermediate';

  // Load penalized providers list from AsyncStorage to apply dynamic ranking adjustments
  let penalizedIds = [];
  try {
    const rawPenalized = await AsyncStorage.getItem('@penalized_providers');
    if (rawPenalized) penalizedIds = JSON.parse(rawPenalized);
  } catch (err) {}

  const scored = providers.map(provider => {
    const distScore = _scoreDistance(provider, location);
    const ratingScore = _scoreRating(provider.rating);
    const availScore = _scoreAvailability(provider, timeKey, urgency);

    // ── COMPLEXITY & SKILL MATCHING ──
    let complexityScore = 0.8; // default
    const exp = provider.experienceYears || (provider.bio?.includes('year') ? parseInt(provider.bio.match(/\d+/)?.[0] || '3') : 3);
    const isCertified = /certified|expert|licensed|degree|diploma/i.test(provider.bio || '');

    if (jobComplexity === 'complex') {
      if (exp >= 5) complexityScore = 1.0;
      else if (exp >= 3) complexityScore = 0.7;
      else complexityScore = 0.3; // penalize junior providers for complex jobs

      if (isCertified) complexityScore = Math.min(1.0, complexityScore + 0.15); // bonus for certifications
    } else if (jobComplexity === 'basic') {
      // Workload balancing: reward junior/mid-level providers so senior ones stay free for complex tasks
      if (exp < 3) complexityScore = 1.0;
      else if (exp < 5) complexityScore = 0.85;
      else complexityScore = 0.6; // slightly lower preference for senior specialists on basic tasks
    } else { // intermediate
      if (exp >= 3 && exp < 5) complexityScore = 1.0;
      else complexityScore = 0.8;
    }

    // ── CAPACITY / WORKLOAD BALANCE PENALTY ──
    const activeJobsCount = (provider.id.charCodeAt(provider.id.length - 1) % 4); // pseudo-random stable workload (0-3 jobs)
    const capacityScore = activeJobsCount >= 3 ? 0.4 : activeJobsCount === 2 ? 0.7 : 1.0;

    let totalScore = Math.round(
      (distScore * WEIGHTS.distance + 
       ratingScore * WEIGHTS.rating + 
       availScore * WEIGHTS.availability +
       complexityScore * WEIGHTS.complexity +
       capacityScore * WEIGHTS.capacity) * 100
    );

    // Apply low rating penalty if provider has been penalized by this customer!
    const isPenalized = penalizedIds.includes(provider.id);
    if (isPenalized) {
      totalScore = Math.round(totalScore * 0.65); // reduce score by 35%
    }

    return {
      ...provider,
      distanceKm: getDistanceToSector(provider, location),
      scores: {
        distance: Math.round(distScore * 100),
        rating: Math.round(ratingScore * 100),
        availability: Math.round(availScore * 100),
        complexity: Math.round(complexityScore * 100),
        capacity: Math.round(capacityScore * 100),
        penaltyApplied: isPenalized ? 35 : 0,
        total: totalScore,
      },
      ranking: totalScore,
      totalScore: totalScore, // mapping support
      matchReason: _buildMatchReason(provider, location, totalScore, jobComplexity, exp) + (isPenalized ? ' [⚠️ Score Penalty applied]' : ''),
    };
  });

  // Sort descending by total score
  scored.sort((a, b) => b.ranking - a.ranking);

  const duration = Date.now() - start;

  logTraceStep('RANKING', {
    duration,
    input: {
      providerCount: providers.length,
      weights: WEIGHTS,
      urgency,
      jobComplexity,
      penalizedIds,
    },
    output: {
      ranked: scored.map(p => ({
        name: p.name,
        totalScore: p.scores.total,
        distanceKm: p.distanceKm,
        rating: p.rating,
      })),
      topPick: scored[0]?.name,
    },
    reasoning: _buildReasoning(scored, WEIGHTS, jobComplexity),
    toolsCalled: ['scoringEngine', 'distanceCalculator', 'complexityClassifier', 'matchPenaltyLog'],
    status: 'success',
  });

  return scored;
}

// Score distance: closer = higher score (0-1)
function _scoreDistance(provider, sector) {
  const dist = getDistanceToSector(provider, sector);
  if (dist <= 1) return 1.0;
  if (dist <= 3) return 0.85;
  if (dist <= 5) return 0.70;
  if (dist <= 8) return 0.55;
  if (dist <= 12) return 0.40;
  return 0.20;
}

// Score rating: normalize 1-5 scale to 0-1
function _scoreRating(rating) {
  return Math.max(0, (rating - 1) / 4);
}

// Score availability
function _scoreAvailability(provider, timeKey, urgency) {
  const hasToday = provider.availability.today;
  const hasTomorrow = provider.availability.tomorrow;
  const slots = provider.availability.slots || [];

  if (urgency === 'urgent') {
    return hasToday ? 1.0 : hasTomorrow ? 0.4 : 0.1;
  }

  if (timeKey.startsWith('today') || timeKey === 'asap') {
    if (hasToday && slots.length >= 3) return 1.0;
    if (hasToday) return 0.8;
    return 0.3;
  }

  if (timeKey.startsWith('tomorrow')) {
    if (hasTomorrow && slots.length >= 3) return 1.0;
    if (hasTomorrow) return 0.8;
    if (hasToday) return 0.6;
    return 0.2;
  }

  // Flexible
  if (hasToday || hasTomorrow) return 0.9;
  return 0.5;
}

function _buildMatchReason(provider, sector, score, complexity, exp) {
  const dist = getDistanceToSector(provider, sector);
  const distText = dist <= 2 ? 'Very close' : dist <= 5 ? 'Nearby' : 'Moderate distance';
  const ratingText = provider.rating >= 4.7 ? 'Excellent rating' : provider.rating >= 4.4 ? 'High rating' : 'Good rating';
  const availText = provider.availability.today ? 'Available today' : 'Available tomorrow';
  const matchText = complexity === 'complex' && exp >= 5 ? 'Senior Specialist Matched' : complexity === 'basic' && exp < 3 ? 'Eco Specialist Matched' : 'Standard Match';
  return `${distText} (${dist.toFixed(1)} km) · ${ratingText} (${provider.rating}★) · ${availText} · ${matchText}`;
}

function _buildReasoning(scored, weights, complexity) {
  const top = scored[0];
  if (!top) return 'No providers to rank.';
  return (
    `Scored ${scored.length} providers using 8-factor formula (Complexity classification: ${complexity}):\n` +
    `  Distance: ${weights.distance * 100}% · Rating: ${weights.rating * 100}% · Availability: ${weights.availability * 100}% · Complexity Match: ${weights.complexity * 100}% · Capacity Loading: ${weights.capacity * 100}%\n\n` +
    `Top pick: ${top.name}\n` +
    `  Score breakdown: Distance=${top.scores.distance}/100, Rating=${top.scores.rating}/100, Availability=${top.scores.availability}/100, Complexity=${top.scores.complexity}/100, WorkloadCapacity=${top.scores.capacity}/100\n` +
    `  Total: ${top.scores.total}/100\n\n` +
    `Decision rationale: ${top.matchReason}`
  );
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
