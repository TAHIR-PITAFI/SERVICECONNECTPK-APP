import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions, Alert, Linking, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { parseIntent } from '../../agents/nlpParser';
import { runAgentPipeline } from '../../agents/orchestrator';
import { Theme } from '../../utils/Theme';
import { saveChatSession, loadChatSessions } from '../../utils/chatStorage';
import DrawerMenu from '../../components/DrawerMenu';
import { getSectorCoords } from '../../utils/mapHelper';
import ProviderDashboard from '../provider-dashboard';
import { Audio } from 'expo-av';
import ModernAlert from '../../components/ModernAlert';

const { width } = Dimensions.get('window');

const INITIAL_MSG_EN = {
  id: 1,
  text: 'Assalam-o-Alaikum! 👋\n\nI am ServiceConnect PK — your AI-powered home service booking assistant for Islamabad.\n\nTell me what you need, for example:\n• "F-7 mein plumber chye"\n• "G-11 AC repair urgent"\n• "E-11 electrician kal subah"',
  sender: 'bot',
};

const INITIAL_MSG_UR = {
  id: 1,
  text: 'السلام علیکم! 👋\n\nمیں ہوں سروس کنیکٹ پی کے — اسلام آباد میں گھر کی سروسز بک کرنے والا آپ کا اے آئی اسسٹنٹ۔\n\nمجھے بتائیں کہ آپ کو کس سروس کی ضرورت ہے، مثلاً:\n• "F-7 میں پلمبر چاہئے"\n• "G-11 اے سی ریپیئر ارجنٹ"\n• "E-11 الیکٹریشن کل صبح"',
  sender: 'bot',
};

const SERVICES_CHECKER_DATA = {
  Plumber:      { emoji:'🚰', included:['Leakage & pipe repairs','Tap & faucet install','Flush & commode fix','Water tank blockage'], excluded:['Material costs','Major excavation','Commercial pump setup'], baseline:'Rs 800–1,500' },
  Electrician:  { emoji:'⚡', included:['Switchboard & socket fix','UPS & solar diagnostic','Fan & light install','Short circuit repair'], excluded:['Full DB box rewiring','Chandelier purchase','Heavy appliance repairs'], baseline:'Rs 1,000–2,000' },
  'AC Technician':{ emoji:'❄️', included:['Inverter gas refill (R32/R410)','Deep chemical wash','Indoor/outdoor mounting','Capacitor replacement'], excluded:['Compressor hardware','Copper pipe running','Scaffolding for high-rise'], baseline:'Rs 2,000–4,500' },
  Carpenter:    { emoji:'🪚', included:['Door locks & handles','Hinge & cabinet fix','Drawer slide repair','Furniture polish'], excluded:['Raw wood & laminates','Full kitchen install','Sofa upholstery'], baseline:'Rs 1,200–3,000' },
  Cleaner:      { emoji:'🧹', included:['Deep sofa vacuum & steam','Carpet shampooing','Kitchen & bathroom scrub','Glass & floor buffing'], excluded:['Post-construction debris','External wall cleaning','Lawn mowing'], baseline:'Rs 2,500–6,000' },
  Tutor:        { emoji:'📚', included:['O/A Level crash course','Matric & FSc revision','English & IELTS prep','Mock testing'], excluded:['Textbooks supply','Exam registration fees','Daily assignment writing'], baseline:'Rs 2,500–5,000' },
  Beautician:   { emoji:'💅', included:['Party makeup & styling','Bridal beauty prep','Organic facials & threading','Home setup & cleanup'], excluded:['Designer cosmetic kits','Hair extensions','Spa massage'], baseline:'Rs 1,500–8,000' },
  Cook:         { emoji:'🍳', included:['Daily desi home cooking','Party biryani & BBQ','Kitchen sanitation','Menu planning'], excluded:['Grocery purchase','Gas cylinders','Serving cutlery'], baseline:'Rs 2,000–7,000' },
  Driver:       { emoji:'🚗', included:['Islamabad/Rawalpindi driving','Automatic & manual cars','Outstation trips','Safety checklist'], excluded:['Car fuel & oil','Toll taxes','Accident damage'], baseline:'Rs 1,800–5,000' },
  Painter:      { emoji:'🎨', included:['Accent wall painting','Wallpaper application','Undercoat & sanding','Furniture polish'], excluded:['Paint cans & rollers','Major plastering','High-rise exterior'], baseline:'Rs 12,000–45,000' },
  Mechanic:     { emoji:'🔧', included:['Engine tuning & scans','Brake pad replacement','Oil & filter change','Suspension inspection'], excluded:['Spare parts cost','Major engine rebuilding','Towing services'], baseline:'Rs 1,500–5,000' },
  'Appliance Repair':{ emoji:'📺', included:['Washing machine repair','Fridge gas refilling','Microwave oven fix','LED TV diagnostics'], excluded:['Compressor hardware replacement','Burned logic boards','New spare parts'], baseline:'Rs 1,200–3,500' },
  Gardener:     { emoji:'🏡', included:['Lawn mowing & weeding','Tree & plant trimming','Soil turning & fertilizing','New plant plantation'], excluded:['Seed/fertilizer supply','Large-scale landscaping','Pesticide purchase'], baseline:'Rs 1,000–2,500' },
  'Pest Control':{ emoji:'🐜', included:['Anti-termite fumigation','Bedbug & insect spray','Cockroach gel treatment','Rodent/mouse trapping'], excluded:['Anti-dengue open-air fogging','Post-fumigation cleanup','Sofa/carpet washing'], baseline:'Rs 3,500–8,000' },
  'Solar Installer':{ emoji:'☀️', included:['Solar panel cleaning','Inverter mapping & configuration','Cable connection checks','Net metering guidance'], excluded:['Structural frame iron','New battery purchase','NUST engineering clearance'], baseline:'Rs 4,000–12,000' },
  'CCTV Technician':{ emoji:'📹', included:['CCTV camera installation','DVR/NVR mapping','Mobile app linkage','Coaxial cable running'], excluded:['Buying cameras/DVRs','Conduit pipeline digging','Cloud storage subscriptions'], baseline:'Rs 2,000–6,000' },
  Welder:       { emoji:'🧑‍🏭', included:['Iron gate hinge welding','Window security grills','Metal sheet repair','Staircase railing fix'], excluded:['Raw iron purchase','High-altitude construction','Large manufacturing orders'], baseline:'Rs 1,500–4,000' },
  'Sofa Cleaner':{ emoji:'🛋️', included:['Sofa dry cleaning','Vacuum & steam wash','Stain removal treatment','Deodorization spray'], excluded:['Leather repair','Sofa foam replacement','Sofa cover stitching'], baseline:'Rs 2,500–5,500' },
  Locksmith:    { emoji:'🔑', included:['Emergency lock picking','Key duplication','Digital smart lock setup','Handle & latch install'], excluded:['Digital lock hardware','Car transponder keys','Master key systems'], baseline:'Rs 1,200–3,000' },
  Mason:        { emoji:'🧱', included:['Bricklaying & plastering','Wall tile installation','Marble grinding/polishing','Dampness crack repair'], excluded:['Cement & sand sacks','Major building foundations','Structural design drawing'], baseline:'Rs 2,500–6,000' },
  'Car Washer': { emoji:'🧼', included:['Mobile exterior wash','Vacuum cleaning interior','Dashboard polish & tire shine','Foam wash service'], excluded:['Engine wash','Scratch compound buffing','Ceramic coating'], baseline:'Rs 800–2,000' },
  Tailor:       { emoji:'🪡', included:['Men\'s Shalwar Kameez stitching','Suit alterations & fitting','Kurta & trousers custom fit','Embroidery works'], excluded:['Fabric/cloth purchase','Heavy bridal lehnga','Fabric dying/coloring'], baseline:'Rs 1,500–4,500' },
  Photographer: { emoji:'📷', included:['Event & birthday shoots','Outdoor portrait sessions','Professional editing','High-res digital files'], excluded:['Physical photo albums','Studio rent','Framed printing'], baseline:'Rs 5,000–15,000' },
  Disinfector:  { emoji:'🛡️', included:['Whole-home sanitization','Anti-viral mist spray','High-touch surface disinfection','Safe organic chemicals'], excluded:['General floor sweep','Deep stain cleaning','Outdoor street spray'], baseline:'Rs 3,000–6,500' },
  Physiotherapist:{ emoji:'💆', included:['Home physiotherapy session','Back & neck pain therapy','Stroke rehab exercise','Joint mobility training'], excluded:['X-ray/MRI scan','Prescription medicines','Surgical advice'], baseline:'Rs 2,500–5,000' },
  Barber:       { emoji:'💈', included:['Home haircut & trim','Shave & beard styling','Facial scrub & massage','Hair dye application'], excluded:['Premium skin products','Hair extensions','Special spa setups'], baseline:'Rs 800–2,500' },
  'Laptop Tech':{ emoji:'💻', included:['Windows & macOS install','RAM & SSD upgrade','Screen & keyboard repair','Virus removal & cleanup'], excluded:['Buying hardware parts','Data recovery lab charges','Motherboard chipset welding'], baseline:'Rs 1,500–4,000' },
  Roofer:       { emoji:'🏠', included:['Roof waterproofing seal','Bitumen damp treatment','Tile roof leakage repair','Rainwater pipe mapping'], excluded:['Complete roof structural concrete','Buying tiles/sealants','External scaffolding'], baseline:'Rs 8,000–25,000' },
  Chauffeur:    { emoji:'🤵', included:['Executive driving service','Long highway/motorway drive','VIP guest transport','Safety checkpoints verification'], excluded:['Car fuel & engine oil','Toll tax charges','Accident insurance deductible'], baseline:'Rs 3,000–8,000' },
  Handyman:     { emoji:'🔨', included:['Wall TV mount installation','Curtain rods hanging','Picture frame hanging','Minor wall drill fixes'], excluded:['Buying wall mounts/rods','Concrete core drilling','Structural structural modification'], baseline:'Rs 800–2,000' },
};

export default function ChatScreen() {
  const router = useRouter();
  const scrollRef = useRef();
  const [lang, setLang] = useState('en'); // 'en' or 'ur'
  const [showUrduKeyboard, setShowUrduKeyboard] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MSG_EN]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [audioWaves, setAudioWaves] = useState([12, 18, 25, 18, 12]);
  const waveIntervalRef = useRef(null);
  const [intent, setIntent] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedCat, setSelectedCat] = useState('Plumber');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  // Context memory — tracks what we already know from the conversation
  const [knownService, setKnownService] = useState(null);
  const [knownLocation, setKnownLocation] = useState(null);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [role, setRole] = useState(null);
  const [alertConfig, setAlertConfig] = useState(null);
  const [viewAsCustomer, setViewAsCustomer] = useState(false);

  const showAlert = (title, message, type = 'info', buttons = []) => {
    setAlertConfig({ title, message, type, buttons });
  };

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@user_role').then(setRole);
    }, [])
  );

  const ALL_SERVICES = [
    'Plumber','Electrician','AC Technician','Carpenter','Cleaner','Tutor',
    'Beautician','Cook','Driver','Painter','Mechanic','Appliance Repair',
    'Gardener','Pest Control','Solar Installer','CCTV Technician','Welder',
    'Sofa Cleaner','Locksmith','Mason','Car Washer','Tailor','Photographer',
    'Disinfector','Physiotherapist','Barber','Laptop Tech','Roofer','Chauffeur','Handyman',
  ];

  useEffect(() => {
    loadChatSessions().then(setChatSessions);
  }, []);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 1) {
        return [lang === 'en' ? INITIAL_MSG_EN : INITIAL_MSG_UR];
      }
      return prev;
    });
  }, [lang]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const handleToggleVoiceRecording = async () => {
    try {
      if (recording) {
        setIsRecording(false);
        setRecording(null);
        if (waveIntervalRef.current) {
          clearInterval(waveIntervalRef.current);
          waveIntervalRef.current = null;
        }
        
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (!uri) {
          showAlert("Recording Error", "Could not retrieve recorded audio path.", "error");
          return;
        }

        const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
        if (!apiKey) {
          showAlert(
            "API Key Not Configured 🔑",
            "Please configure EXPO_PUBLIC_GROQ_API_KEY in your .env file to enable Whisper Speech-to-Text.",
            "warning"
          );
          return;
        }

        setLoading(true);
        
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        });
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('response_format', 'json');
        formData.append('prompt', 'Transcribe English, Urdu, and Roman Urdu speech such as F-7 mein plumber chahye, G-11 AC repair urgent');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        });

        const data = await response.json();
        setLoading(false);

        if (data && data.text) {
          setInputText(data.text);
          showAlert(
            "Speech Transcribed! 🎙️",
            `"${data.text}"\n\nAI successfully parsed and transcribed your voice input!`,
            "success"
          );
        } else {
          console.warn("Groq Whisper Empty Output:", data);
          showAlert(
            "Transcription Failed",
            "Could not parse speech. Please speak closely to the microphone and try again.",
            "warning"
          );
        }
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          showAlert("Microphone Permission", "Please grant microphone access permission to use real speech-to-text.", "warning");
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(newRecording);
        setIsRecording(true);

        // Start premium audio waves interval
        waveIntervalRef.current = setInterval(() => {
          setAudioWaves([
            Math.floor(Math.random() * 25) + 6,
            Math.floor(Math.random() * 32) + 10,
            Math.floor(Math.random() * 38) + 14,
            Math.floor(Math.random() * 32) + 10,
            Math.floor(Math.random() * 25) + 6,
          ]);
        }, 110);
      }
    } catch (err) {
      setIsRecording(false);
      setRecording(null);
      setLoading(false);
      if (waveIntervalRef.current) {
        clearInterval(waveIntervalRef.current);
        waveIntervalRef.current = null;
      }
      console.error("Recording toggle failed:", err);
      showAlert("Microphone Error", "Failed to start or stop recording. Please try again.", "error");
    }
  };

  const handleSend = async (forcedInput) => {
    const text = (forcedInput || inputText).trim();
    if (!text || loading) return;

    // Check if user is asking to see services list
    const servicesKeywords = ['services', 'kya services', 'what services', 'service list', 'kaunsi service', 'kaun si service', 'سروسز', 'کیا سروسز'];
    const isServicesQuery = servicesKeywords.some(kw => text.toLowerCase().includes(kw));
    if (isServicesQuery) {
      const userMsg = { id: Date.now(), text, sender: 'user' };
      const botMsg = {
        id: Date.now()+1,
        text: lang === 'en' ? '🛠️ Here are all our available services. Tap one to get started:' : '🛠️ ہماری تمام سروسز یہ ہیں۔ کوئی ایک منتخب کریں:',
        sender: 'bot',
        showServicePicker: true,
      };
      setMessages(prev => [...prev, userMsg, botMsg]);
      setInputText('');
      scrollToEnd();
      return;
    }

    const userMsg = { id: Date.now(), text, sender: 'user' };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInputText('');
    setLoading(true);
    setSuggestions([]);
    scrollToEnd();

    try {
      // Build conversation context for the NLP parser
      const context = {
        history: messages.slice(-8), // last 8 messages
        knownService: knownService,
        knownLocation: knownLocation,
      };

      const parsed = await parseIntent(text, context);
      setIntent(parsed);

      // Update known context for next turn
      if (parsed.service && parsed.service !== '') setKnownService(parsed.service);
      if (parsed.location && parsed.location !== '' && parsed.location !== 'Islamabad (unspecified)') setKnownLocation(parsed.location);

      if (parsed.clarifying_question) {
        setMessages(prev => [...prev, { id: Date.now()+1, text: parsed.clarifying_question, sender: 'bot' }]);
        await saveChatSession([...newMsgs, { id: Date.now()+1, text: parsed.clarifying_question, sender: 'bot' }]);
      } else if (parsed.confidence && parsed.confidence < 75 && parsed.service && parsed.location && parsed.location !== 'Islamabad (unspecified)') {
        const confirmMsg = {
          id: Date.now()+1,
          text: `🔍 Assalam-o-Alaikum! I detected that you might be looking for **${parsed.service}** in **${parsed.location}** (Confidence: ${parsed.confidence}%). Is that correct?`,
          sender: 'bot',
          isConfirmationPrompt: true,
          parsedIntent: parsed
        };
        setMessages(prev => [...prev, confirmMsg]);
        await saveChatSession([...newMsgs, confirmMsg]);
      } else {
        const result = await runAgentPipeline(parsed);
        if (result.error || result.status === 'no_availability') {
          const errMsg = { id: Date.now()+1, text: `Sorry, no providers found for "${parsed.service}" in that area right now.`, sender: 'bot' };
          setMessages(prev => [...prev, errMsg]);
          if (result.suggestions) setSuggestions(result.suggestions);
          await saveChatSession([...newMsgs, errMsg]);
        } else {
          // Successful result — also reset context since booking flow starts
          const botMsg = {
            id: Date.now()+1,
            text: `✅ Found ${result.rankedProviders?.length || 0} providers for **${result.intent?.service}** in **${result.intent?.location}**. Our 8-factor AI ranked the best options for you:`,
            sender: 'bot',
            trace: result,
          };
          setMessages(prev => [...prev, botMsg]);
          await saveChatSession([...newMsgs, botMsg]);
        }
      }
      loadChatSessions().then(setChatSessions);
    } catch (e) {
      console.error('Pipeline error:', e);
      setMessages(prev => [...prev, { id: Date.now()+1, text: 'Something went wrong. Please try again.', sender: 'bot' }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const renderProviderCard = (provider, idx, trace) => {
    const isTop = idx === 0;
    return (
      <View
        key={provider.id}
        style={[styles.providerCard, isTop && styles.topCard]}
      >
        {isTop && (
          <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.topBadge}>
            <Text style={styles.topBadgeText}>🏆 AI TOP PICK — RANK #1</Text>
          </LinearGradient>
        )}
        <View style={styles.cardRow}>
          <View style={{ marginRight: 10, justifyContent: 'center' }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(37, 99, 235, 0.07)',
              borderWidth: 1.5,
              borderColor: isTop ? 'rgba(255, 255, 255, 0.3)' : 'rgba(37, 99, 235, 0.12)',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {provider.avatar ? (
                <Image source={{ uri: provider.avatar }} style={{ width: 48, height: 48 }} />
              ) : (
                <Ionicons name="construct" size={22} color={Theme.colors.primary} />
              )}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.providerName}>{provider.name}</Text>
            <Text style={styles.providerSpec}>✨ {provider.specialization}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaChip}>⭐ {provider.rating}</Text>
              <Text style={styles.metaChip}>📍 {provider.sector}</Text>
              <Text style={styles.metaChip}>🛣️ {provider.distance} km</Text>
            </View>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.priceText}>Rs {provider.baseRate}</Text>
            <Text style={styles.priceLabel}>Base Rate</Text>
          </View>
        </View>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>AI Match Score</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${provider.totalScore}%` }]} />
          </View>
          <Text style={styles.scoreVal}>{provider.totalScore}/100</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#10b981',
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
            }}
            onPress={(e) => {
              e.stopPropagation();
              const phone = provider.phone || '03001234567';
              Linking.openURL(`tel:${phone}`).catch(() => {
                Alert.alert('Error', 'Calling is not supported on this device.');
              });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={15} color="#fff" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Call Specialist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1.2,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: 38,
              borderRadius: 10,
              backgroundColor: isTop ? Theme.colors.primary : 'rgba(37, 99, 235, 0.08)',
              borderWidth: isTop ? 0 : 1.5,
              borderColor: Theme.colors.primary,
              shadowColor: isTop ? Theme.colors.primary : 'transparent',
              shadowOffset: isTop ? { width: 0, height: 2 } : { width: 0, height: 0 },
              shadowOpacity: isTop ? 0.1 : 0,
              shadowRadius: isTop ? 3 : 0,
              elevation: isTop ? 2 : 0,
            }}
            onPress={async (e) => {
              e.stopPropagation();
              try {
                const savedName = await AsyncStorage.getItem('@user_name');
                if (!savedName) {
                  showAlert(
                    '⚠️ Login Profile Required',
                    'Assalam-o-Alaikum! You are currently browsing as a Guest. Please register or log in as a Customer to confirm bookings.',
                    'question',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Log In / Register', onPress: () => router.push('/login') }
                    ]
                  );
                  return;
                }
                router.push({
                  pathname: '/booking-confirm',
                  params: {
                    provider: JSON.stringify(provider),
                    slot: trace.intent?.timeLabel || 'Today, Flexible',
                    intent: JSON.stringify(trace.intent),
                  },
                });
              } catch (e) {}
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: isTop ? '#fff' : Theme.colors.primary }}>Select & Book</Text>
            <Ionicons name="chevron-forward" size={15} color={isTop ? '#fff' : Theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (role === 'provider' && !viewAsCustomer) {
    return <ProviderDashboard onSwitchToCustomer={() => setViewAsCustomer(true)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {viewAsCustomer && (
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 16 }}
          onPress={() => setViewAsCustomer(false)}
          activeOpacity={0.9}
        >
          <Ionicons name="construct" size={16} color="#fff" />
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>
            SWAP TO PROVIDER MODE 🛠️
          </Text>
        </TouchableOpacity>
      )}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chatSessions={chatSessions}
        onLoadSession={(s) => {
          setMessages(s.messages || [INITIAL_MSG]);
          scrollToEnd();
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <LinearGradient colors={Theme.colors.gradientPrimary} style={styles.header}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>ServiceConnect PK</Text>
            <Text style={styles.headerSub}>{lang === 'en' ? "Islamabad's Elite Orchestrator" : "اسلام آباد کا بہترین سروس اسسٹنٹ"}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {role === 'provider' && viewAsCustomer && (
              <TouchableOpacity 
                style={[styles.headerBtn, { backgroundColor: '#10b981' }]} 
                onPress={() => setViewAsCustomer(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="speedometer-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.langToggle} 
              onPress={() => setLang(lang === 'en' ? 'ur' : 'en')}
              activeOpacity={0.8}
            >
              <Text style={styles.langToggleText}>{lang === 'en' ? 'اردو' : 'EN'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowGuide(true)} activeOpacity={0.7}>
              <Ionicons name="grid-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerBtn} 
              onPress={() => router.push({ pathname: '/compare', params: { query: inputText || '' } })} 
              activeOpacity={0.7}
            >
              <Ionicons name="git-compare-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.msgWrapper, msg.sender === 'user' ? styles.msgUser : styles.msgBot]}>
              {msg.sender === 'bot' && (
                <View style={styles.botAvatar}>
                  <Ionicons name="hardware-chip" size={14} color={Theme.colors.primary} />
                </View>
              )}
              <View style={[styles.bubble, msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, msg.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                  {msg.text}
                </Text>
              </View>
              {msg.isConfirmationPrompt && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, paddingHorizontal: 40, marginBottom: 6 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#10b981',
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4
                    }}
                    onPress={async () => {
                      setLoading(true);
                      try {
                        const result = await runAgentPipeline(msg.parsedIntent);
                        if (result.error || result.status === 'no_availability') {
                          const errMsg = { id: Date.now()+1, text: `Sorry, no providers found for "${msg.parsedIntent.service}" in that area right now.`, sender: 'bot' };
                          setMessages(prev => [...prev, errMsg]);
                        } else {
                          const botMsg = {
                            id: Date.now()+1,
                            text: `✅ Intent confirmed! Found ${result.rankedProviders?.length || 0} matching providers for **${result.intent?.service}** in **${result.intent?.location}**:`,
                            sender: 'bot',
                            trace: result,
                          };
                          setMessages(prev => [...prev, botMsg]);
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoading(false);
                        scrollToEnd();
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Yes, Correct ✅</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#ef4444',
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4
                    }}
                    onPress={() => {
                      setMessages(prev => [
                        ...prev,
                        { id: Date.now()+1, text: "No problem! Please rephrase your request, and be sure to mention the service type and sector clearly.", sender: 'bot' }
                      ]);
                      scrollToEnd();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>No, Rephrase ❌</Text>
                  </TouchableOpacity>
                </View>
              )}
              {msg.showServicePicker && (
                <View style={styles.servicePickerGrid}>
                  {ALL_SERVICES.map((svc) => (
                    <TouchableOpacity
                      key={svc}
                      style={styles.servicePickerChip}
                      onPress={() => {
                        setKnownService(svc);
                        handleSend(`I need a ${svc}`);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.servicePickerChipText}>{svc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {msg.trace?.rankedProviders && (
                <View style={styles.providersList}>
                  <View style={styles.chatMapArea}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.chatMap}
                      zoomEnabled={true}
                      scrollEnabled={true}
                      initialRegion={{
                        latitude: getSectorCoords(msg.trace.intent?.location).latitude,
                        longitude: getSectorCoords(msg.trace.intent?.location).longitude,
                        latitudeDelta: 0.04,
                        longitudeDelta: 0.04,
                      }}
                    >
                      {/* User Location */}
                      <Marker
                        coordinate={getSectorCoords(msg.trace.intent?.location)}
                        title="Your Location"
                        description={msg.trace.intent?.location || "Islamabad"}
                      >
                        <View style={styles.chatUserPin}>
                          <Ionicons name="person" size={8} color="#fff" />
                        </View>
                      </Marker>

                      {/* Providers */}
                      {msg.trace.rankedProviders.slice(0, 3).map((p, idx) => {
                        const lat = p.coordinates?.lat || p.coordinates?.latitude;
                        const lng = p.coordinates?.lng || p.coordinates?.lon || p.coordinates?.longitude;
                        if (!lat || !lng) return null;
                        return (
                          <Marker
                            key={`chat-p-${idx}`}
                            coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
                            title={p.name}
                            description={`Match Score: ${p.totalScore || p.compositeScore || 90}%`}
                          >
                            <View style={[styles.chatProviderPin, idx === 0 && styles.chatTopProviderPin]}>
                              <Text style={styles.chatPinText}>#{idx+1}</Text>
                            </View>
                          </Marker>
                        );
                      })}
                    </MapView>
                  </View>

                  {msg.trace.rankedProviders.slice(0, 3).map((p, i) => renderProviderCard(p, i, msg.trace))}
                  <TouchableOpacity style={styles.compareBtn} onPress={() => router.push({ pathname: '/compare', params: { intent: JSON.stringify(msg.trace.intent), providers: JSON.stringify(msg.trace.rankedProviders) } })}>
                    <Ionicons name="analytics-outline" size={15} color={Theme.colors.primary} />
                    <Text style={styles.compareBtnText}>View Full AI vs Live System Comparison →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={styles.thinkingRow}>
              <ActivityIndicator size="small" color={Theme.colors.primary} />
              <Text style={styles.thinkingText}>AI agents are reasoning...</Text>
              <TouchableOpacity 
                style={styles.stopBtn}
                onPress={() => {
                  setLoading(false);
                  setMessages(prev => [
                    ...prev,
                    { id: Date.now(), text: '🛑 Conversation generation stopped by user.', sender: 'bot' }
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="stop-circle" size={14} color={Theme.colors.error} />
                <Text style={styles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}

          {intent?.service && !loading && (
            <View style={styles.intentChip}>
              <Ionicons name="sparkles" size={14} color={Theme.colors.primary} />
              <Text style={styles.intentChipText}>{intent.service} · {intent.location} · {(intent.urgency || '').toUpperCase()}</Text>
            </View>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionTitle}>Try these instead:</Text>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => handleSend(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                  <Ionicons name="chevron-forward" size={13} color={Theme.colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isRecording ? '#ef4444' : '#f1f5f9',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 6
              }}
              onPress={handleToggleVoiceRecording}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isRecording ? "mic-sharp" : "mic-outline"} 
                size={20} 
                color={isRecording ? "#fff" : "#475569"} 
              />
            </TouchableOpacity>
            
            {isRecording ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)', gap: 5, paddingHorizontal: 12, marginRight: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#ef4444', marginRight: 10, letterSpacing: 0.3 }}>🎙️ LISTENING...</Text>
                {audioWaves.map((h, i) => (
                  <View 
                    key={i} 
                    style={{ 
                      width: 4, 
                      height: h, 
                      borderRadius: 2, 
                      backgroundColor: i === 2 ? '#ef4444' : i % 2 === 0 ? '#ec4899' : '#f43f5e'
                    }} 
                  />
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.input, lang === 'ur' && { textAlign: 'right', writingDirection: 'rtl' }]}
                placeholder={lang === 'en' ? "e.g. F-7 mein plumber chye..." : "اپنی ضرورت لکھیں (مثلاً F-7 میں پلمبر چاہئے)..."}
                placeholderTextColor={Theme.colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={200}
                onSubmitEditing={() => handleSend()}
              />
            )}
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Guide Sheet */}
        {showGuide && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowGuide(false)} activeOpacity={1} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitle}>🔍 Islamabad Services Guide</Text>
                <TouchableOpacity onPress={() => setShowGuide(false)}>
                  <Ionicons name="close-circle" size={26} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
                {Object.keys(SERVICES_CHECKER_DATA).map(cat => (
                  <TouchableOpacity key={cat} style={[styles.catTab, selectedCat === cat && styles.catTabActive]} onPress={() => setSelectedCat(cat)}>
                    <Text>{SERVICES_CHECKER_DATA[cat].emoji}</Text>
                    <Text style={[styles.catLabel, selectedCat === cat && styles.catLabelActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={{ paddingHorizontal: 20, paddingTop: 12 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {SERVICES_CHECKER_DATA[selectedCat]?.included.map((item, i) => (
                  <Text key={i} style={styles.bulletIncluded}>✔️  {item}</Text>
                ))}
                <Text style={[styles.sheetSectionLabel, { marginTop: 16 }]}>❌ EXCLUDED</Text>
                {SERVICES_CHECKER_DATA[selectedCat]?.excluded.map((item, i) => (
                  <Text key={i} style={styles.bulletExcluded}>✗  {item}</Text>
                ))}
                <View style={styles.baselineBox}>
                  <Text style={styles.baselineLabel}>Market Base Rate (Islamabad):</Text>
                  <Text style={styles.baselineValue}>{SERVICES_CHECKER_DATA[selectedCat]?.baseline}</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <ModernAlert
        visible={!!alertConfig}
        title={alertConfig?.title}
        message={alertConfig?.message}
        type={alertConfig?.type}
        buttons={alertConfig?.buttons}
        onClose={() => setAlertConfig(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Theme.colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, paddingTop: Platform.OS === 'android' ? 16 : 12, gap: 8 },
  headerCenter:    { flex: 1, alignItems: 'center' },
  headerTitle:     { fontSize: Theme.typography.md, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  headerSub:       { fontSize: Theme.typography.xs, color: 'rgba(255,255,255,0.72)', fontWeight: '600' },
  headerBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },

  scroll:          { flex: 1 },
  scrollContent:   { padding: 14, paddingBottom: 24 },

  msgWrapper:      { marginBottom: 14, maxWidth: '90%' },
  msgUser:         { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgBot:          { alignSelf: 'flex-start', alignItems: 'flex-start' },
  botAvatar:       { width: 26, height: 26, borderRadius: 13, backgroundColor: Theme.colors.primaryGlass, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  bubble:          { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, maxWidth: width * 0.80 },
  bubbleUser:      { backgroundColor: Theme.colors.primary, borderBottomRightRadius: 4 },
  bubbleBot:       { backgroundColor: Theme.colors.botBubble, borderBottomLeftRadius: 4, ...Theme.shadows.soft },
  bubbleText:      { fontSize: 15, lineHeight: 23 },
  bubbleTextUser:  { color: '#fff', fontWeight: '500' },
  bubbleTextBot:   { color: Theme.colors.botText },

  providersList:   { marginTop: 10, width: width * 0.86 },
  providerCard:    { backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border, ...Theme.shadows.card },
  topCard:         { borderColor: Theme.colors.primary, borderWidth: 2 },
  topBadge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 10 },
  topBadgeText:    { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  cardRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  providerName:    { fontSize: Theme.typography.base, fontWeight: '800', color: Theme.colors.textPrimary },
  providerSpec:    { fontSize: Theme.typography.sm, color: Theme.colors.primary, fontWeight: '600', marginVertical: 3 },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaChip:        { fontSize: 11, color: Theme.colors.textSecondary, backgroundColor: Theme.colors.backgroundAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontWeight: '600' },
  priceBox:        { alignItems: 'flex-end', marginLeft: 10 },
  priceText:       { fontSize: Theme.typography.md, fontWeight: '800', color: Theme.colors.accent },
  priceLabel:      { fontSize: 10, color: Theme.colors.textMuted, fontWeight: '600', marginTop: 2 },
  scoreRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Theme.colors.borderLight },
  scoreLabel:      { fontSize: 11, color: Theme.colors.textMuted, fontWeight: '700', flex: 1 },
  scoreBar:        { flex: 2, height: 5, backgroundColor: Theme.colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill:    { height: '100%', backgroundColor: Theme.colors.primary, borderRadius: 3 },
  scoreVal:        { fontSize: 12, fontWeight: '800', color: Theme.colors.primary },
  bookBtn:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Theme.colors.primaryGlass, borderWidth: 1, borderColor: Theme.colors.primary },
  bookBtnPrimary:  { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  bookBtnText:     { fontSize: Theme.typography.sm, fontWeight: '800', color: Theme.colors.primary },
  compareBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  compareBtnText:  { fontSize: 12, color: Theme.colors.primary, fontWeight: '700', textDecorationLine: 'underline' },

  thinkingRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  thinkingText:    { fontSize: Theme.typography.sm, color: Theme.colors.textMuted, fontStyle: 'italic', flex: 1 },
  stopBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  stopBtnText:     { fontSize: 11, color: Theme.colors.error, fontWeight: '800' },
  intentChip:      { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 14 },
  intentChipText:  { fontSize: 12, fontWeight: '700', color: Theme.colors.primary },
  suggestionBox:   { backgroundColor: Theme.colors.surface, borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: Theme.colors.warning, ...Theme.shadows.soft },
  suggestionTitle: { fontSize: 12, fontWeight: '800', color: Theme.colors.textPrimary, marginBottom: 10 },
  suggestionItem:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.colors.backgroundAlt, padding: 10, borderRadius: 10, marginBottom: 8 },
  suggestionText:  { fontSize: 13, fontWeight: '600', color: Theme.colors.primary, flex: 1 },

  inputArea:       { backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingHorizontal: 10, paddingTop: 10, paddingBottom: Platform.OS === 'android' ? 10 : 6 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, borderRadius: 28, paddingHorizontal: 8, paddingVertical: 4 },
  input:           { flex: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Theme.colors.textPrimary, maxHeight: 110 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Theme.colors.textMuted },

  sheetBackdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,31,92,0.4)' },
  sheet:           { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '70%', paddingTop: 12 },
  sheetHandle:     { width: 36, height: 4, backgroundColor: Theme.colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sheetTitle:      { fontSize: Theme.typography.md, fontWeight: '900', color: Theme.colors.textPrimary },
  catTab:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: Theme.colors.backgroundAlt, borderWidth: 1, borderColor: Theme.colors.border },
  catTabActive:    { backgroundColor: '#eff6ff', borderColor: Theme.colors.primary },
  catLabel:        { fontSize: 12, fontWeight: '600', color: Theme.colors.textSecondary },
  catLabelActive:  { color: Theme.colors.primary, fontWeight: '800' },
  sheetSectionLabel:{ fontSize: 11, fontWeight: '800', color: Theme.colors.textPrimary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  bulletIncluded:  { fontSize: 13, color: Theme.colors.textPrimary, marginBottom: 7, lineHeight: 18 },
  bulletExcluded:  { fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 7, lineHeight: 18 },
  baselineBox:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 20 },
  baselineLabel:   { fontSize: 13, fontWeight: '700', color: Theme.colors.primary },
  baselineValue:   { fontSize: 15, fontWeight: '800', color: Theme.colors.accent },

  // Language Switcher Badge
  langToggle: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  langToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5
  },

  // Urdu Soft Keyboard styles
  urduKeyboardContainer: {
    backgroundColor: Theme.colors.backgroundAlt,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
    paddingTop: 8,
  },
  kbUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  kbTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kbDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  kbDismissText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.primary,
  },
  kbGrid: {
    paddingHorizontal: 4,
    gap: 6,
  },
  kbRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  kbKey: {
    flex: 1,
    height: 40,
    backgroundColor: Theme.colors.surface,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  kbKeyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },

  // Service picker grid (shown when user asks for services)
  servicePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
    width: width * 0.82,
  },
  servicePickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  servicePickerChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  chatMapArea: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#eff6ff',
  },
  chatMap: {
    flex: 1,
  },
  chatUserPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  chatProviderPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  chatTopProviderPin: {
    backgroundColor: '#10b981',
  },
  chatPinText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
  },
});
