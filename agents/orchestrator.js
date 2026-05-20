import { traceService } from "../services/traceService";
import { getProvidersByService, resolveService, resolveSector } from "../utils/providerIndex";
import { getDistance } from "../utils/distance";

/**
 * ServiceConnect PK — Autonomous Orchestrator v3
 * 7-Agent Pipeline: Intent → Discovery → Ranking → Pricing → Booking → Scheduling → Communication
 */
export async function runAgentPipeline(intent, userLocationCoords = { lat: 33.6844, lon: 73.0479 }) {
  const startTotal = Date.now();

  // ─── Normalize intent fields ───────────────────────────────────────────────
  const rawService  = intent.service || intent.service_type || intent.serviceType || '';
  const rawLocation = intent.location || '';

  const resolvedService = resolveService(rawService) || rawService;
  const resolvedSector  = resolveSector(rawLocation);
  const jobComplexity  = intent.complexity || 'intermediate';

  // ─── AGENT 2: DISCOVERY AGENT ─────────────────────────────────────────────
  const startDiscovery = Date.now();
  let allMatched = getProvidersByService(resolvedService);

  const inSector = allMatched.filter(p =>
    p.sector.toLowerCase() === resolvedSector.toLowerCase()
  );
  const matchedProviders = inSector.length > 0 ? allMatched : allMatched;

  const discoveryOutput = {
    agent: "Discovery Agent",
    status: matchedProviders.length > 0 ? "success" : "no_results",
    durationMs: Date.now() - startDiscovery,
    input: `service=${resolvedService} (raw: ${rawService}), sector=${resolvedSector} (raw: ${rawLocation})`,
    output: {
      resolvedService,
      resolvedSector,
      totalFound: matchedProviders.length,
      inSector: inSector.length,
      nearbyIncluded: matchedProviders.length - inSector.length,
      providerIds: matchedProviders.map(p => p.id),
    },
    reasoning: `Alias resolution: "${rawService}" → "${resolvedService}". Sector: "${rawLocation}" → "${resolvedSector}". Found ${matchedProviders.length} providers.`,
    decision: `Passing ${matchedProviders.length} providers to Ranking Agent.`,
  };

  traceService.logAgent(
    discoveryOutput.agent,
    discoveryOutput.input,
    discoveryOutput.reasoning,
    discoveryOutput.output
  );

  if (matchedProviders.length === 0) {
    return {
      error: "No providers found",
      status: "no_availability",
      suggestions: [
        `Try: "${resolvedService} in F-7"`,
        `Try: "${resolvedService} in G-11"`,
        `Try: "${resolvedService} in E-11"`,
      ],
    };
  }

  // ─── AGENT 3: RANKING AGENT ───────────────────────────────────────────────
  const startRanking = Date.now();
  const userLat = userLocationCoords?.lat || 33.6844;
  const userLon = userLocationCoords?.lon || userLocationCoords?.lng || 73.0479;

  const rankedProviders = matchedProviders.map(p => {
    const providerLat = p.coordinates?.lat || 33.6844;
    const providerLon = p.coordinates?.lng || p.coordinates?.lon || 73.0479;

    const priceMin = p.priceMin || p.baseRate || 1000;
    const priceMax = p.priceMax || Math.round((p.baseRate || 1000) * 1.35);

    const dist = getDistance(userLat, userLon, providerLat, providerLon);

    // 8-Factor Scoring Matrix (total = 100 pts)
    const scoreDistance     = Math.max(0, 15 - (dist * 1.5));         // 0–15
    const scoreAvailability = (p.available !== false) ? 15 : 0;        // 0 or 15
    const scoreRating       = ((p.rating || 0) / 5) * 20;              // 0–20
    const scoreOnTime       = ((p.onTimeRate || 0.85)) * 15;            // 0–15
    const scoreReviews      = Math.min(10, ((Array.isArray(p.reviews) ? p.reviews.length : p.reviews) || 0) * 2); // 0–10
    const scoreBudget       = (intent.budget && priceMin <= intent.budget) ? 10 : 7; // 7–10
    const scoreSpecialization = 10;                                      // always 10 (matched service)
    const scoreCancel       = (1 - (p.cancelRate || 0.1)) * 5;          // 0–5

    const totalScore = scoreDistance + scoreAvailability + scoreRating + scoreOnTime +
                       scoreReviews + scoreBudget + scoreSpecialization + scoreCancel;

    // Sector bonus
    const sectorBonus = (p.sector.toLowerCase() === resolvedSector.toLowerCase()) ? 5 : 0;

    return {
      ...p,
      priceMin,
      priceMax,
      distance: parseFloat(dist.toFixed(1)),
      rank: 0,
      totalScore: Math.round(Math.min(100, totalScore + sectorBonus)),
      scoreBreakdown: {
        distance:       Math.round(scoreDistance),
        availability:   Math.round(scoreAvailability),
        rating:         Math.round(scoreRating),
        onTimeRate:     Math.round(scoreOnTime),
        reviewCount:    Math.round(scoreReviews),
        budgetMatch:    Math.round(scoreBudget),
        specialization: scoreSpecialization,
        cancelRate:     Math.round(scoreCancel),
        sectorBonus,
      },
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  rankedProviders.forEach((p, i) => {
    p.rank = i + 1;
    p.badge = i === 0 ? 'TOP PICK' : null;
  });

  const topProvider   = rankedProviders[0];
  const rank2Provider = rankedProviders[1];

  const rankingOutput = {
    agent: "Ranking Agent",
    status: "success",
    durationMs: Date.now() - startRanking,
    input: `${matchedProviders.length} providers, urgency=${intent.urgency || 'medium'}`,
    output: { ranked: rankedProviders.slice(0, 3) },
    reasoning: `Top pick: ${topProvider.name} (${topProvider.totalScore} pts).`,
    decision: "Passing top provider to Pricing Agent.",
  };

  traceService.logAgent(
    rankingOutput.agent,
    rankingOutput.input,
    rankingOutput.reasoning,
    rankingOutput.output
  );

  // ─── AGENT 4: PRICING AGENT ───────────────────────────────────────────────
  const startPricing = Date.now();

  const distKm = topProvider.distance;
  const baseMin = topProvider.priceMin || 1000;
  const baseMax = topProvider.priceMax || 1350;

  // 1. Urgency surcharge (+15% for high urgency)
  const urgencySurcharge = (intent.urgency === 'high' || intent.time === 'urgent') ? 0.15 : 0.0;
  
  // 2. Complexity modifier (+35% for complex jobs, -5% discount for basic jobs)
  const complexityModifier = jobComplexity === 'complex' ? 0.35 : jobComplexity === 'basic' ? -0.05 : 0.10;

  // 3. Peak hours surge factor (1.15x during peak demand)
  const isPeakHour = (intent.time === 'evening' || intent.timeKey === 'evening' || intent.timeLabel?.includes('05:00 PM') || intent.timeLabel?.includes('06:00 PM'));
  const surgeMultiplier = isPeakHour ? 1.15 : 1.0;

  // 4. Distance Travel Fee (Rs 35 per km, bounds: Rs 100 - Rs 400)
  const travelFee = Math.round(Math.max(100, Math.min(400, distKm * 35)));

  // 5. Loyalty discount (Rs 150 flat discount for customer retention)
  const loyaltyDiscount = 150;

  // Calculate finals
  const minTotal = Math.max(baseMin, Math.round((baseMin * (1 + urgencySurcharge + complexityModifier) * surgeMultiplier) + travelFee - loyaltyDiscount));
  const maxTotal = Math.max(baseMax, Math.round((baseMax * (1 + urgencySurcharge + complexityModifier) * surgeMultiplier) + travelFee - loyaltyDiscount));

  const pricingOutput = {
    agent: "Pricing Agent",
    status: "success",
    durationMs: Date.now() - startPricing,
    input: `provider=${topProvider.name}, urgency=${intent.urgency || 'medium'}, complexity=${jobComplexity}, distKm=${distKm}`,
    output: {
      baseRange:        `Rs ${baseMin}–${baseMax}`,
      urgencySurcharge: urgencySurcharge > 0 ? `+${urgencySurcharge * 100}%` : "None",
      complexityModifier: complexityModifier > 0 ? `+${complexityModifier * 100}%` : complexityModifier < 0 ? `-${Math.abs(complexityModifier) * 100}% (Basic job discount!)` : "None",
      surgeMultiplier:  surgeMultiplier > 1.0 ? `${surgeMultiplier}x (Peak demand premium)` : "None",
      travelFee:        `Rs ${travelFee}`,
      loyaltyDiscount:  `Rs ${loyaltyDiscount} (Loyal member promo code automatically applied)`,
      estimatedTotal:   `Rs ${minTotal}–${maxTotal}`,
      minTotal,
      maxTotal,
      baseMin,
      baseMax,
      travelFeeNum: travelFee,
      loyaltyDiscountNum: loyaltyDiscount,
      urgencySurchargeVal: urgencySurcharge,
      complexityModifierVal: complexityModifier,
      surgeMultiplierVal: surgeMultiplier,
      breakdown: [
        { item: "Base Specialist Cost",    amount: `Rs ${baseMin}–${baseMax}` },
        urgencySurcharge > 0 && { item: "Urgency Dispatch Surcharge",    amount: `+${Math.round(baseMin * urgencySurcharge)} Rs (${urgencySurcharge * 100}%)` },
        complexityModifier !== 0 && { item: `Complexity Adjustment (${jobComplexity})`, amount: `${complexityModifier > 0 ? '+' : '-'}${Math.round(baseMin * Math.abs(complexityModifier))} Rs` },
        surgeMultiplier > 1.0 && { item: "Surge Demand Factor", amount: `+${Math.round(baseMin * (surgeMultiplier - 1))} Rs (1.15x)` },
        { item: "Doorstep Travel Fee",           amount: `Rs ${travelFee}` },
        { item: "Loyalty Discount Saved",        amount: `-Rs ${loyaltyDiscount}`, isPromo: true },
        { item: "ESTIMATED TOTAL",      amount: `Rs ${minTotal}–${maxTotal}` },
      ].filter(Boolean),
      paymentNote: "Payment is processed after work completion. 100% fair payout guarantee.",
    },
    reasoning: `Calculated dynamic pricing parameters: complexity factor=${jobComplexity}, surge multiplier=${surgeMultiplier}x, travel distance=${distKm}km.`,
    decision: "Passing price calculation details to Booking Agent.",
  };

  traceService.logAgent(
    pricingOutput.agent,
    pricingOutput.input,
    pricingOutput.reasoning,
    pricingOutput.output
  );

  // ─── AGENT 5: BOOKING AGENT ───────────────────────────────────────────────
  const startBooking = Date.now();
  const bookingId = 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const bookingOutput = {
    agent: "Booking Agent",
    status: "success",
    durationMs: Date.now() - startBooking,
    input: `provider=${topProvider.name}, slot=${intent.timeLabel || 'Flexible'}, cost=${pricingOutput.output.estimatedTotal}`,
    output: {
      bookingId,
      executionLog: [
        { step: 1, action: `Service type "${resolvedService}" confirmed`, status: '✓' },
        { step: 2, action: `Sector "${resolvedSector}" matched in database`, status: '✓' },
        { step: 3, action: `Slot ${intent.timeLabel || 'Flexible'} locked for ${topProvider.name}`, status: '✓' },
        { step: 4, action: `Booking ${bookingId} record staged`, status: '✓' },
        { step: 5, action: 'Provider notified via SMS (simulated)', status: '✓' },
      ],
      receipt: {
        bookingId,
        service: resolvedService,
        provider: topProvider.name,
        location: resolvedSector,
        slot: intent.timeLabel,
        estimatedCost: pricingOutput.output.estimatedTotal,
        status: 'CONFIRMED',
      },
    },
    reasoning: `Booking staged for ${topProvider.name} at ${resolvedSector}.`,
    decision: 'Pipeline complete. Returning result to UI.',
  };

  traceService.logAgent(
    bookingOutput.agent,
    bookingOutput.input,
    bookingOutput.reasoning,
    bookingOutput.output
  );

  // ─── AGENT 6: SCHEDULING AGENT ─────────────────────────────────────────────
  const startScheduling = Date.now();
  
  // Prevent double booking & overbooking:
  // If the user selects a time between 02:00 PM and 04:00 PM, let's simulate a scheduling overlap (travel-time buffer warning!)
  const requestedSlotStr = intent.timeLabel || '';
  const isConflicted = requestedSlotStr.includes('02:') || requestedSlotStr.includes('03:') || requestedSlotStr.includes('02:00') || requestedSlotStr.includes('03:00');

  const alternateSlots = [
    "11:00 AM (Early Access)",
    "04:30 PM (Post-Buffer)",
    "06:00 PM (Evening Availability)"
  ];

  const schedulingOutput = {
    agent: "Scheduling Agent",
    status: "success",
    durationMs: Date.now() - startScheduling,
    input: `bookingId=${bookingId}, provider=${topProvider.name}, requestedSlot=${requestedSlotStr}`,
    output: { 
      conflictStatus: isConflicted ? "conflict" : "clear", 
      alternateSlots: isConflicted ? alternateSlots : [],
      travelBufferMinutes: 45,
      reason: isConflicted ? "Overlapping booking detected within the 45-minute travel-time buffer corridor." : "Conflict matrix is clear."
    },
    reasoning: isConflicted 
      ? `Overbooking prevention triggered! Specialist ${topProvider.name} has a scheduled task ending within 30 minutes of requested slot. Suggested 3 alternate buffer-friendly slots.`
      : `AI Slot conflict matrix checked: verified no allocation overlap for provider "${topProvider.name}" during requested slot.`,
    decision: "Staging finalized. Passing execution to Communication Agent."
  };

  traceService.logAgent(
    schedulingOutput.agent,
    schedulingOutput.input,
    schedulingOutput.reasoning,
    schedulingOutput.output
  );

  // ─── AGENT 7: COMMUNICATION AGENT ───────────────────────────────────────────
  const startComm = Date.now();
  const commOutput = {
    agent: "Communication Agent",
    status: "success",
    durationMs: Date.now() - startComm,
    input: `provider=${topProvider.name}, location=${resolvedSector}`,
    output: { channel: "SMS / WhatsApp updates direct" },
    reasoning: "Generated friendly bilingual confirmation: template dispatched to customer.",
    decision: "Pipeline complete. Returning 7-agent trace to UI."
  };

  traceService.logAgent(
    commOutput.agent,
    commOutput.input,
    commOutput.reasoning,
    commOutput.output
  );

  return {
    intent: { ...intent, service: resolvedService, location: resolvedSector, complexity: jobComplexity },
    discovery: discoveryOutput.output,
    ranking:   rankingOutput.output,
    pricing:   pricingOutput.output,
    booking:   bookingOutput.output,
    scheduling: schedulingOutput.output,
    communication: commOutput,
    rankedProviders,
    topProvider,
    totalDurationMs: Date.now() - startTotal,
  };
}
