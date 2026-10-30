export interface PronunciationTarget {
  id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  topicTitle: string;
  topicEmoji: string;
  english: string;
  hindi: string;
  phoneticTip: string;
  formulaId?: number;
}

export const PRONUNCIATION_TARGETS: PronunciationTarget[] = [
  // BEGINNER
  {
    id: 'b-intro-1',
    level: 'beginner',
    topic: 'self_intro',
    topicTitle: 'Self Introduction',
    topicEmoji: '👋',
    english: 'Hello, my name is Rahul and I am from Mumbai.',
    hindi: 'नमस्ते, मेरा नाम राहुल है और मैं मुंबई से हूँ।',
    phoneticTip: 'Focus on connecting "name is" smoothly: /neɪm ɪz/.',
    formulaId: 1,
  },
  {
    id: 'b-daily-1',
    level: 'beginner',
    topic: 'daily_life',
    topicTitle: 'Daily Life',
    topicEmoji: '☀️',
    english: 'I wake up at six o clock every morning.',
    hindi: 'मैं रोज सुबह छह बजे उठता हूँ।',
    phoneticTip: 'Pronounce "wake up" as one word: /weɪk-ʌp/.',
    formulaId: 10,
  },
  {
    id: 'b-shop-1',
    level: 'beginner',
    topic: 'shopping',
    topicTitle: 'Shopping',
    topicEmoji: '🛒',
    english: 'How much does this blue shirt cost?',
    hindi: 'यह नीली शर्ट कितने की है?',
    phoneticTip: 'Stress "How much" and "cost" clearly.',
    formulaId: 34,
  },
  {
    id: 'b-food-1',
    level: 'beginner',
    topic: 'ordering_food',
    topicTitle: 'Ordering Food',
    topicEmoji: '🍕',
    english: 'Can I please have a cup of hot tea?',
    hindi: 'क्या मुझे एक कप गर्म चाय मिल सकती है?',
    phoneticTip: 'Soften the "t" sound in "tea": /tiː/.',
    formulaId: 50,
  },
  {
    id: 'b-travel-1',
    level: 'beginner',
    topic: 'travel',
    topicTitle: 'Travel',
    topicEmoji: '✈️',
    english: 'Where is the nearest railway station?',
    hindi: 'सबसे पास वाला रेलवे स्टेशन कहाँ है?',
    phoneticTip: 'Emphasize "nearest": /ˈnɪə.rɪst/.',
    formulaId: 62,
  },

  // INTERMEDIATE
  {
    id: 'i-intro-1',
    level: 'intermediate',
    topic: 'self_intro',
    topicTitle: 'Self Introduction',
    topicEmoji: '💼',
    english: 'I have been working as a software developer for three years.',
    hindi: 'मैं तीन साल से सॉफ्टवेयर डेवलपर के रूप में काम कर रहा हूँ।',
    phoneticTip: 'Link "have been": /hæv biːn/ with a smooth "v" sound.',
    formulaId: 207,
  },
  {
    id: 'i-shop-1',
    level: 'intermediate',
    topic: 'shopping',
    topicTitle: 'Shopping',
    topicEmoji: '🛍️',
    english: 'Do you offer any discount if I pay by cash or UPI?',
    hindi: 'क्या कैश या यूपीआई से पेमेंट करने पर कोई छूट है?',
    phoneticTip: 'Keep "discount" sharp on the first syllable: /ˈdɪs.kaʊnt/.',
    formulaId: 120,
  },
  {
    id: 'i-office-1',
    level: 'intermediate',
    topic: 'office',
    topicTitle: 'Workplace Talk',
    topicEmoji: '🏢',
    english: 'Could we schedule a quick meeting to discuss the project timeline?',
    hindi: 'क्या हम प्रोजेक्ट टाइमलाइन पर चर्चा के लिए एक छोटी मीटिंग रख सकते हैं?',
    phoneticTip: '"Schedule" can be pronounced /ˈskedʒ.uːl/ or /ˈʃedʒ.uːl/.',
    formulaId: 88,
  },
  {
    id: 'i-travel-1',
    level: 'intermediate',
    topic: 'travel',
    topicTitle: 'Travel',
    topicEmoji: '🚆',
    english: 'I was wondering if the train is running on schedule today.',
    hindi: 'मैं सोच रहा था कि क्या ट्रेन आज समय पर चल रही है।',
    phoneticTip: 'Natural liaison: "I was wondering if": /aɪ wəz ˈwʌndərɪŋ ɪf/.',
    formulaId: 295,
  },
  {
    id: 'i-interview-1',
    level: 'intermediate',
    topic: 'job_interview',
    topicTitle: 'Job Interview',
    topicEmoji: '🎯',
    english: 'My biggest strength is solving complex problems under pressure.',
    hindi: 'मेरी सबसे बड़ी ताकत दबाव में कठिन समस्याओं को हल करना है।',
    phoneticTip: 'Pronounce "strength" with a clear /ŋθ/ ending.',
    formulaId: 145,
  },

  // ADVANCED
  {
    id: 'a-interview-1',
    level: 'advanced',
    topic: 'job_interview',
    topicTitle: 'Job Interview',
    topicEmoji: '🏆',
    english: 'I thrive in fast-paced environments where collaboration drives innovation.',
    hindi: 'मैं तेज़ गति वाले वातावरण में बहुत अच्छा काम करता हूँ जहाँ मिलकर नया काम होता है।',
    phoneticTip: 'Clear "th" sound in "thrive": /θraɪv/.',
    formulaId: 410,
  },
  {
    id: 'a-office-1',
    level: 'advanced',
    topic: 'office',
    topicTitle: 'Workplace Talk',
    topicEmoji: '📊',
    english: 'Let us streamline our workflow to meet the upcoming quarterly deadline.',
    hindi: 'आइए आने वाले तिमाही के लक्ष्य को पूरा करने के लिए अपनी कार्यप्रणाली को सरल बनाएँ।',
    phoneticTip: 'Smooth "streamline": /ˈstriːm.laɪn/.',
    formulaId: 320,
  },
  {
    id: 'a-debate-1',
    level: 'advanced',
    topic: 'free',
    topicTitle: 'Persuasive Speech',
    topicEmoji: '💡',
    english: 'Effective communication is the cornerstone of successful leadership.',
    hindi: 'सार्थक बातचीत ही सफल नेतृत्व की आधारशिला है।',
    phoneticTip: 'Pronounce "cornerstone" with clear emphasis: /ˈkɔː.nə.stəʊn/.',
    formulaId: 450,
  },
];

