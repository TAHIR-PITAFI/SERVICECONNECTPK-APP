/**
 * AGENT 1: INTENT AGENT
 * Parses natural language into structured intent using rule-based NLP
 */

import { parseIntent, intentToSummary } from '../agents/nlpParser';
import { logTraceStep } from '../services/traceService';

export async function runIntentAgent(rawInput) {
  const start = Date.now();

  // Simulate slight processing delay for realistic UX
  await _delay(300 + Math.random() * 200);

  const intent = parseIntent(rawInput);

  const duration = Date.now() - start;

  logTraceStep('INTENT', {
    duration,
    input: { rawText: rawInput },
    output: {
      serviceType: intent.serviceType,
      serviceLabel: intent.serviceLabel,
      location: intent.location,
      timeKey: intent.timeKey,
      timeLabel: intent.timeLabel,
      urgency: intent.urgency,
      language: intent.language,
      confidence: intent.confidence,
    },
    reasoning: _buildReasoning(intent, rawInput),
    toolsCalled: ['nlpParser', 'languageDetector', 'timeParser'],
    status: intent.valid ? 'success' : 'error',
  });

  if (!intent.valid) {
    throw new Error('Could not understand the request. Please rephrase.');
  }

  return intent;
}

function _buildReasoning(intent, rawInput) {
  const langMap = { english: 'English', roman_urdu: 'Roman Urdu', urdu: 'Urdu' };
  const lang = langMap[intent.language] || intent.language;
  const confPct = Math.round(intent.confidence * 100);

  return (
    `Detected language: ${lang}.\n` +
    `Extracted service type "${intent.serviceLabel}" with ${Math.round(intent.breakdown.serviceConfidence * 100)}% confidence.\n` +
    `Location identified as "${intent.location}" (${Math.round(intent.breakdown.locationConfidence * 100)}% confidence).\n` +
    `Time preference parsed as "${intent.timeLabel}" (${Math.round(intent.breakdown.timeConfidence * 100)}% confidence).\n` +
    `Urgency level: ${intent.urgency}.\n` +
    `Overall intent confidence: ${confPct}%.`
  );
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
