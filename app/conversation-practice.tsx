import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIClient } from '../src/services/aiClient';
import { ConversationScenario, ConversationMessage } from '../src/types/ai';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

const scenarios: ConversationScenario[] = [
  {
    id: 'intro',
    title: 'Self Introduction',
    titleHindi: 'अपना परिचय देना',
    description: 'Practice introducing yourself, your background, and hobbies.',
    initialPrompt: "Hello! It's so nice to meet you. Could you please introduce yourself? What is your name and where are you from?",
    icon: 'person',
  },
  {
    id: 'restaurant',
    title: 'Ordering Food',
    titleHindi: 'खाना ऑर्डर करना',
    description: 'Order at a restaurant, ask about menu items and pay the bill.',
    initialPrompt: 'Welcome to our café! Are you ready to order, or would you like to see our menu first?',
    icon: 'restaurant',
  },
  {
    id: 'shopping',
    title: 'Shopping at Store',
    titleHindi: 'खरीदारी करना',
    description: 'Ask for sizes, colors, discounts, and payment methods.',
    initialPrompt: 'Hi there! How can I help you today? Are you looking for clothes, shoes, or electronics?',
    icon: 'cart',
  },
  {
    id: 'interview',
    title: 'Job Interview',
    titleHindi: 'नौकरी का इंटरव्यू',
    description: 'Answer common job interview questions with confidence.',
    initialPrompt: 'Good morning! Thank you for coming today. Tell me why you are interested in this position.',
    icon: 'briefcase',
  },
  {
    id: 'directions',
    title: 'Asking for Directions',
    titleHindi: 'रास्ता पूछना',
    description: 'Ask for nearby places, train stations, and bus stops.',
    initialPrompt: 'Excuse me, you look like you might need help. Where are you trying to go?',
    icon: 'navigate',
  },
  {
    id: 'friend',
    title: 'Talking to a Friend',
    titleHindi: 'दोस्त से बातचीत',
    description: 'Casual chat about weekend plans, movies, and daily routine.',
    initialPrompt: 'Hey friend! Long time no see! How have you been doing lately?',
    icon: 'happy',
  },
];

export default function ConversationPracticeScreen() {
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const startScenario = (sc: ConversationScenario) => {
    setSelectedScenario(sc);
    setMessages([
      {
        id: `ai-init`,
        sender: 'ai',
        text: sc.initialPrompt,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading || !selectedScenario) return;

    const userMsg: ConversationMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await AIClient.conversationStep(text, selectedScenario.id, historyPayload);
      const aiReply: ConversationMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        correctionHindi: res.correctionHindi,
        correctedEnglish: res.correctedEnglish,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      Alert.alert('Conversation Error', err.message || 'Could not complete conversation step.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  // Scenario Selection Screen
  if (!selectedScenario) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scenarioList}>
        <View style={styles.scenarioHeader}>
          <Text style={styles.scenarioHeaderTitle}>SPOKEN SCENARIOS</Text>
          <Text style={styles.scenarioHeaderSubtitle}>
            Roleplay everyday real-world conversations with your intelligent AI partner.
          </Text>
        </View>

        {scenarios.map((sc, idx) => {
          const pastelAccents = [
            colors.accentYellow,
            colors.accentPink,
            colors.accentLilac,
            colors.accentPeach,
          ];
          const iconBg = pastelAccents[idx % pastelAccents.length];

          return (
            <TouchableOpacity
              key={sc.id}
              style={styles.scenarioCard}
              activeOpacity={0.85}
              onPress={() => startScenario(sc)}
            >
              <View style={[styles.scenarioIconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={sc.icon as any} size={22} color={colors.foreground} />
              </View>
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioTitle}>{sc.title}</Text>
                <Text style={styles.scenarioHindi}>{sc.titleHindi}</Text>
                <Text style={styles.scenarioDesc}>{sc.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  // Active Conversation Screen
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Active Scenario Header Bar */}
      <View style={styles.activeBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.activeScenarioTitle}>{selectedScenario.title}</Text>
          <Text style={styles.activeScenarioHindi}>{selectedScenario.titleHindi}</Text>
        </View>

        <TouchableOpacity
          style={styles.changeScenarioBtn}
          onPress={() => setSelectedScenario(null)}
          activeOpacity={0.8}
        >
          <Text style={styles.changeScenarioText}>Change Scenario</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <View
              key={m.id}
              style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}
            >
              <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                  {m.text}
                </Text>

                {/* Inline Mistake Correction if AI noticed one */}
                {m.correctionHindi && (
                  <View style={styles.correctionFeedback}>
                    <View style={styles.correctionHeader}>
                      <Ionicons name="bulb-outline" size={14} color="#D97706" />
                      <Text style={styles.correctionLabel}>Grammar Tip / सुधार:</Text>
                    </View>
                    <Text style={styles.correctionHindi}>{m.correctionHindi}</Text>
                    {m.correctedEnglish && (
                      <Text style={styles.correctedEng}>
                        Better: "{m.correctedEnglish}"
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.typingBox}>
            <ActivityIndicator size="small" color={colors.foreground} />
            <Text style={styles.typingText}>Partner is replying...</Text>
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Reply in English..."
          placeholderTextColor={colors.secondaryText}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up" size={18} color={colors.darkSurface} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scenarioList: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  scenarioHeader: {
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  scenarioHeaderTitle: {
    ...typography.antonHero,
    fontSize: 32,
    lineHeight: 36,
    color: colors.foreground,
    letterSpacing: -1,
  },
  scenarioHeaderSubtitle: {
    ...typography.bodySecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
    color: colors.textMuted2,
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
    ...shadows.card,
  },
  scenarioIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    ...typography.h3,
    color: colors.foreground,
    fontWeight: '800',
  },
  scenarioHindi: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.matchedHighlight,
    marginTop: 2,
  },
  scenarioDesc: {
    ...typography.caption,
    color: colors.textMuted2,
    marginTop: 3,
    lineHeight: 16,
  },
  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  activeScenarioTitle: {
    ...typography.h3,
    color: colors.foreground,
    fontWeight: '800',
  },
  activeScenarioHindi: {
    fontSize: 12,
    color: colors.matchedHighlight,
    fontWeight: '700',
  },
  changeScenarioBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.dock,
  },
  changeScenarioText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.foreground,
  },
  chatScroll: {
    flex: 1,
  },
  msgRow: {
    marginVertical: 6,
    width: '100%',
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  msgRowAi: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 22,
    padding: spacing.md,
  },
  bubbleUser: {
    backgroundColor: colors.lime,
    borderBottomRightRadius: 4,
    ...shadows.limeGlow,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderBottomLeftRadius: 4,
    ...shadows.card,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: colors.limeText,
    fontWeight: '700',
  },
  bubbleTextAi: {
    color: colors.foreground,
  },
  correctionFeedback: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(212, 255, 0, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.sm + 2,
  },
  correctionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.lime,
  },
  correctionHindi: {
    fontSize: 12,
    color: colors.textMuted2,
    lineHeight: 18,
  },
  correctedEng: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.lime,
    marginTop: 4,
  },
  typingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  typingText: {
    ...typography.caption,
    color: colors.textMuted2,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    height: 46,
    ...typography.body,
    color: colors.foreground,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.limeGlow,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.4,
  },
});
