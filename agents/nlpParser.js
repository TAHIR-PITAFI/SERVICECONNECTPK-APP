import { traceService } from "../services/traceService";
import { resolveService, resolveSector } from "../utils/providerIndex";

/**
 * Intent Agent — Enhanced NLP Parser v3 with Context Memory
 *
 * Uses Groq Llama-3.3-70b with native JSON mode.
 * Post-processes AI output with local alias resolution for resilience.
 * Now tracks conversation context to avoid re-asking for already-provided info.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a professional Intent Extraction Agent for ServiceConnect PK — an AI home services platform in Islamabad, Pakistan.

Your ONLY job is to extract structured service request details from user input.
Users may write in English, Roman Urdu, or Urdu script.

CRITICAL CONTEXT RULE:
- You will receive the conversation history. The user may have already told you the service or location in a PREVIOUS message.
- If the current message only provides a LOCATION (like "I-12" or "F-7 me") and the history already has a SERVICE, extract both.
- If the current message only provides a SERVICE and the history already has a LOCATION, extract both.
- NEVER ask for information the user already provided in a previous message.
- A location-only reply like "I-12 me" or "G-11 me" means the user is answering your location question.

IMPORTANT RULES:
1. If user sends only a greeting (Hi, Hello, Assalam, etc.), set clarifying_question to ask what service they need.
2. If service type is STILL unclear after checking history, ask: "Which service do you need?"
3. If location is STILL unclear after checking history, ask for the sector.
4. You MUST return ONLY valid JSON — no extra text.
5. service field MUST be one of: Plumber, Electrician, AC Technician, Carpenter, Cleaner, Tutor, Beautician, Cook, Driver, Painter, Mechanic, Appliance Repair, Gardener, Pest Control, Solar Installer, CCTV Technician, Welder, Sofa Cleaner, Locksmith, Mason, Car Washer, Tailor, Photographer, Disinfector, Physiotherapist, Barber, Laptop Tech, Roofer, Chauffeur, Handyman
6. location field should be an Islamabad sector like: F-7, G-11, G-13, E-11, F-10, I-8, I-12, Bahria Town, DHA Phase 2, etc.

ROMAN URDU SERVICE MAPPINGS (for reference):
- nali, paani, pipe, toilet, plumber chaiya → Plumber
- bijli, wiring, light, UPS → Electrician
- AC, thanda, cooling, compressor → AC Technician
- darwaza, wood, furniture, lock, cabinet → Carpenter
- safai, sofa, carpet, sweep → Cleaner
- ustad, math, physics, O level, matric → Tutor
- makeup, parlor, hair, facial → Beautician
- khana, biryani, chef, cook → Cook
- taxi, driving, outstation → Driver
- paint, rang, wall, colour → Painter
- gari, motor, engine, tuning, oil → Mechanic
- fridge, washing machine, oven → Appliance Repair
- mali, ghass, lawn, garden → Gardener
- kera, deemak, fumigation, spray → Pest Control
- digital lock, chabi, tala → Locksmith
- plaster, brick, tiles, mistri → Mason
- haircut, shave, cutting → Barber
- laptop, screen, computer → Laptop Tech`;

const USER_PROMPT = (userInput) => `
Extract service request from: "${userInput}"

Return ONLY this JSON:
{
  "clarifying_question": null or "question string if info missing",
  "service": "exact canonical service name or null",
  "location": "Islamabad sector (e.g. F-7, G-11, I-12) or null",
  "time": "urgent|morning|afternoon|evening|tomorrow|today|flexible",
  "timeLabel": "human readable e.g. Today Morning, ASAP, Tomorrow Afternoon",
  "urgency": "high|medium|low",
  "budget": null or number in PKR,
  "language": "english|roman_urdu|urdu",
  "confidence": 0-100,
  "complexity": "basic|intermediate|complex"
}`;

/**
 * @param {string} userInput - The user's latest message
 * @param {object} conversationContext - { history: [...messages], knownService: string|null, knownLocation: string|null }
 */
export async function parseIntent(userInput, conversationContext = {}) {
  const cleanInput = userInput.trim().toLowerCase();
  
  // ── High-Speed Local Keyword Parser for Zero-Latency Extraction ────────
  // Only execute for clean, simple inputs of shorter length to bypass network overhead
  if (cleanInput.length < 60) {
    const localServiceMap = {
      'Plumber': ['plumber', 'pipe', 'nali', 'paani', 'toilet', 'tap', 'nalka', 'leak'],
      'Electrician': ['electrician', 'bijli', 'wiring', 'light', 'ups', 'electric', 'short circuit'],
      'AC Technician': ['ac', 'air conditioner', 'thanda', 'cooling', 'compressor', 'split ac'],
      'Carpenter': ['carpenter', 'darwaza', 'wood', 'furniture', 'lock', 'cabinet', 'table', 'chair'],
      'Cleaner': ['cleaner', 'safai', 'sofa', 'carpet', 'sweep', 'sweeping', 'washing'],
      'Tutor': ['tutor', 'teacher', 'ustad', 'math', 'physics', 'academy', 'coaching'],
      'Beautician': ['beautician', 'makeup', 'parlor', 'hair', 'facial', 'parlour'],
      'Cook': ['cook', 'khana', 'biryani', 'chef', 'cooking'],
      'Driver': ['driver', 'taxi', 'driving', 'chauffeur'],
      'Painter': ['painter', 'paint', 'rang', 'wall', 'colour', 'coloring'],
      'Mechanic': ['mechanic', 'gari', 'motor', 'engine', 'tuning', 'oil change'],
      'Appliance Repair': ['fridge', 'washing machine', 'oven', 'microwave', 'refrigerator', 'appliance'],
      'Gardener': ['gardener', 'mali', 'ghass', 'lawn', 'garden', 'plants'],
      'Barber': ['barber', 'haircut', 'shave', 'cutting']
    };

    let localService = null;
    for (const [canonical, kwList] of Object.entries(localServiceMap)) {
      if (kwList.some(kw => cleanInput.includes(kw))) {
        localService = canonical;
        break;
      }
    }

    // Try sector extraction
    // Regex for sector format like F-7, G-11, I-12, DHA, Bahria
    const sectorRegex = /\b([a-iA-I]-?\s*\d{1,2}|dha|bahria)\b/i;
    const match = cleanInput.match(sectorRegex);
    let localLocation = match ? resolveSector(match[0]) : null;

    if (!localLocation && conversationContext.knownLocation) {
      localLocation = conversationContext.knownLocation;
    }
    if (!localService && conversationContext.knownService) {
      localService = conversationContext.knownService;
    }

    // If we confidently matched both service and location, return instantly!
    if (localService && localLocation) {
      let localComplexity = 'intermediate';
      const complexKeywords = ['complete', 'fitting', 'installation', 'wiring', 'leakage', 'compressor', 'gas', 'refill', 'deep', 'renovation', 'solar'];
      const basicKeywords = ['change', 'unclog', 'light', 'trimming', 'check', 'leak', 'inspection', 'bulb', 'tap', 'nalka'];
      
      if (complexKeywords.some(kw => cleanInput.includes(kw))) {
        localComplexity = 'complex';
      } else if (basicKeywords.some(kw => cleanInput.includes(kw))) {
        localComplexity = 'basic';
      }

      const localResult = {
        agent:    'Intent Agent (Local Fast-Path)',
        status:   'success',
        input:    userInput,
        clarifying_question: null,
        service:      localService,
        service_type: localService,
        serviceType:  localService,
        location:     localLocation,
        time:         'flexible',
        timeKey:      'flexible',
        timeLabel:    'Today, Flexible',
        urgency:      'medium',
        urgency_level: 'medium',
        budget:       null,
        language:     'english',
        confidence:   100,
        complexity:   localComplexity,
        reasoning:    `Instant zero-latency local-path extraction. Resolved service: "${localService}", Sector: "${localLocation}", Complexity: "${localComplexity}".`,
        decision:     'Passing to Discovery Agent.',
        output: {
          service:    localService,
          location:   localLocation,
          time:       'flexible',
          timeLabel:  'Today, Flexible',
          urgency:    'medium',
          budget:     null,
          language:   'english',
          confidence: 100,
          complexity: localComplexity,
        },
      };
      traceService.logAgent('Intent Agent', userInput, localResult.reasoning, localResult);
      return localResult;
    }
  }

  const rawApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const apiKey = rawApiKey ? rawApiKey.trim() : null;

  if (!apiKey || apiKey === 'YOUR_KEY_HERE' || apiKey.length < 10) {
    return {
      confidence: 0,
      clarifying_question: "API key not configured. Please set EXPO_PUBLIC_GROQ_API_KEY in your .env file.",
    };
  }

  // Build conversation history for the AI
  const historyMessages = [];
  if (conversationContext.history && conversationContext.history.length > 0) {
    const recent = conversationContext.history.slice(-6); // last 6 messages
    for (const msg of recent) {
      historyMessages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }
  }

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        temperature: 0.05,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyMessages,
          { role: 'user', content: USER_PROMPT(userInput) },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq HTTP error:', response.status, errText);
      return { 
        confidence: 0, 
        clarifying_question: `Groq HTTP error: ${response.status}. Key: ${apiKey ? apiKey.substring(0, 8) : 'null'}... Error: ${errText.substring(0, 120)}` 
      };
    }

    const data = await response.json();

    if (data.error) {
      console.error('Groq API error:', data.error);
      return { confidence: 0, clarifying_question: `API Error: ${data.error.message}` };
    }

    const rawText = data.choices?.[0]?.message?.content || '{}';
    let parsed = {};

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.warn('JSON parse failed, raw:', rawText);
      return { confidence: 0, clarifying_question: 'Could not understand your request. Please rephrase.' };
    }

    // ── Context merge: fill gaps from known conversation context ──────────
    // If AI missed the service but we know it from prior turn, inject it
    if (!parsed.service && conversationContext.knownService) {
      parsed.service = conversationContext.knownService;
      parsed.clarifying_question = null;
    }
    // If AI missed the location but we know it from prior turn, inject it
    if (!parsed.location && conversationContext.knownLocation) {
      parsed.location = conversationContext.knownLocation;
      // Only clear the clarifying question if it was asking for location (not service)
      if (parsed.clarifying_question && !parsed.clarifying_question.toLowerCase().includes('service')) {
        parsed.clarifying_question = null;
      }
    }

    // ── Local alias post-processing ───────────────────────────────────────
    let resolvedService = parsed.service;
    if (resolvedService) {
      const fromAlias = resolveService(resolvedService);
      if (fromAlias) resolvedService = fromAlias;
    }

    if (!resolvedService && !parsed.clarifying_question) {
      const locallyResolved = resolveService(userInput);
      if (locallyResolved) {
        resolvedService = locallyResolved;
      } else if (!conversationContext.knownService) {
        parsed.clarifying_question = "Which service do you need? (e.g. Plumber, Electrician, AC Technician)";
      }
    }

    // Resolve sector/location
    let resolvedLocation = parsed.location;
    if (resolvedLocation) {
      resolvedLocation = resolveSector(resolvedLocation);
    } else if (!parsed.clarifying_question) {
      const sectorMatch = userInput.match(/[A-Za-z]-?\s*\d{1,2}/);
      if (sectorMatch) {
        resolvedLocation = resolveSector(sectorMatch[0]);
      } else if (conversationContext.knownLocation) {
        resolvedLocation = conversationContext.knownLocation;
      } else {
        resolvedLocation = 'Islamabad (unspecified)';
      }
    }

    let remoteComplexity = parsed.complexity || 'intermediate';
    const complexKeywords = ['complete', 'fitting', 'installation', 'wiring', 'leakage', 'compressor', 'gas', 'refill', 'deep', 'renovation', 'solar'];
    const basicKeywords = ['change', 'unclog', 'light', 'trimming', 'check', 'leak', 'inspection', 'bulb', 'tap', 'nalka'];
    
    if (!parsed.complexity) {
      if (complexKeywords.some(kw => cleanInput.includes(kw))) {
        remoteComplexity = 'complex';
      } else if (basicKeywords.some(kw => cleanInput.includes(kw))) {
        remoteComplexity = 'basic';
      }
    }

    const flatIntent = {
      agent:    'Intent Agent',
      status:   'success',
      input:    userInput,
      clarifying_question: parsed.clarifying_question || null,
      service:      resolvedService || '',
      service_type: resolvedService || '',
      serviceType:  resolvedService || '',
      location:     resolvedLocation || '',
      time:         parsed.time || 'flexible',
      timeKey:      parsed.time || 'flexible',
      timeLabel:    parsed.timeLabel || 'Today, Flexible',
      urgency:      parsed.urgency || 'medium',
      urgency_level: parsed.urgency || 'medium',
      budget:       parsed.budget ?? null,
      language:     parsed.language || 'english',
      confidence:   parsed.confidence ?? 80,
      complexity:   remoteComplexity,
      reasoning:    `Extracted via Llama-3.3-70b. Service resolved: "${resolvedService}", Sector: "${resolvedLocation}", Complexity: "${remoteComplexity}".`,
      decision:     'Passing to Discovery Agent.',
      output: {
        service:    resolvedService || '',
        location:   resolvedLocation || '',
        time:       parsed.time || 'flexible',
        timeLabel:  parsed.timeLabel || 'Today, Flexible',
        urgency:    parsed.urgency || 'medium',
        budget:     parsed.budget ?? null,
        language:   parsed.language || 'english',
        confidence: parsed.confidence ?? 80,
        complexity: remoteComplexity,
      },
    };

    traceService.logAgent('Intent Agent', userInput, flatIntent.reasoning, flatIntent);
    return flatIntent;

  } catch (error) {
    console.error('parseIntent error:', error);
    return {
      agent: 'Intent Agent',
      status: 'error',
      confidence: 0,
      clarifying_question: `Connection error: ${error.message || error}. Please check your internet and try again.`,
    };
  }
}
