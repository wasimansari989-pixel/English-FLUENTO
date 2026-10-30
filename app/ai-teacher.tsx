import React, { useState, useEffect, useRef } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AIClient } from '../src/services/aiClient';
import { AIChatMessage } from '../src/components/AIChatMessage';
import { FormulaContextCard } from '../src/components/FormulaContextCard';
import { getFormulaById } from '../src/search/formulaSearch';
import { AIChatMessage as AIChatMessageType, ExplanationMode } from '../src/types/ai';
import { SentenceFormula } from '../src/types/formula';
import { Storage } from '../src/database/storage';
import { WeakTopicsTracker } from '../src/services/weakTopicsTracker';
import { NetworkService } from '../src/services/networkService';
import { OfflineStatusBanner } from '../src/components/OfflineStatusBanner';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

export default function AITeacherScreen() {
  const router = useRouter();
  const { formulaId: paramFormulaId } = useLocalSearchParams<{ formulaId?: string }>();

  const [pinnedFormula, setPinnedFormula] = useState<SentenceFormula | null>(null);
  const [mode, setMode] = useState<ExplanationMode>('beginner');
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<AIChatMessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const AI_TUTOR_HISTORY_KEY = '@ai_tutor_chat_history';

  // Load persistent chat history on mount
  useEffect(() => {
    const initChat = async () => {
      try {
        const saved = await Storage.getItem(AI_TUTOR_HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }, 100);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load chat history:', e);
      }

      // Initial greeting if no previous history
      setMessages([
        {
          id: 'init-1',
          role: 'assistant',
          content: `नमस्ते! मैं आपका **AI English Teacher** हूँ।\n\nआप मुझसे किसी भी Sentence Formula, Helping Verb या व्याकरण नियम के बारे में आसान हिंदी/Hinglish में पूछ सकते हैं।`,
          timestamp: Date.now(),
          suggestedFollowUps: paramFormulaId
            ? [
                'इस फॉर्मूले को आसान तरीके से समझाओ।',
                '5 और रोज बोले जाने वाले उदाहरण दो।',
                'इसका Negative Sentence कैसे बनेगा?',
                'इसका Question / Interrogative कैसे बनेगा?',
              ]
            : [
                'Would have been aur have been mein kya difference hai?',
                'Can aur could mein kya antar hai?',
                'Daily spoken English ke 5 best formulas batao.',
              ],
        },
      ]);
    };

    initChat();

    AIClient.getStatus().then((status) => {
      if (status && status.remainingToday !== undefined) {
        setQuotaRemaining(status.remainingToday);
      }
    });
  }, [paramFormulaId]);

  useEffect(() => {
    if (paramFormulaId) {
      const f = getFormulaById(parseInt(paramFormulaId, 10));
      if (f) setPinnedFormula(f);
    }
  }, [paramFormulaId]);

  const saveHistory = async (msgs: AIChatMessageType[]) => {
    try {
      // Keep last 40 messages to keep storage fast and lightweight
      await Storage.setItem(AI_TUTOR_HISTORY_KEY, JSON.stringify(msgs.slice(-40)));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  };

  const handleSend = async (textToSend?: string) => {
    // Check network connectivity first
    if (!NetworkService.getIsOnline()) {
      Alert.alert(
        'Internet Required for AI Teacher',
        'AI Personal Teacher requires an internet connection to generate explanations. All 600 formulas and quizzes are 100% available offline!',
        [
          { text: 'Formula Library', onPress: () => router.push('/formulas') },
          { text: 'Offline Quiz', onPress: () => router.push('/practice') },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );
      return;
    }

    const q = (textToSend || inputQuery).trim();
    if (!q || loading) return;

    const userMessage: AIChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
      formulaId: pinnedFormula?.id,
    };

    const updatedAfterUser = [...messages, userMessage];
    setMessages(updatedAfterUser);
    saveHistory(updatedAfterUser);

    setInputQuery('');
    setLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
      const weakTags = await WeakTopicsTracker.getTopWeakTags(5);
      const res = await AIClient.askTutor(q, pinnedFormula?.id, mode, historyPayload, weakTags);
      const assistantMessage: AIChatMessageType = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        formulaId: res.formulaId,
        suggestedFollowUps: res.suggestedFollowUps,
      };

      const updatedAfterAi = [...updatedAfterUser, assistantMessage];
      setMessages(updatedAfterAi);
      saveHistory(updatedAfterAi);

      if (res.fallbackUsed) setFallbackActive(true);
      if (res.remainingToday !== undefined) setQuotaRemaining(res.remainingToday);
    } catch (err: any) {
      const errorMsg: AIChatMessageType = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err.message || 'Error communicating with AI Teacher. Please try again.'}`,
        timestamp: Date.now(),
      };
      const updatedAfterErr = [...updatedAfterUser, errorMsg];
      setMessages(updatedAfterErr);
      saveHistory(updatedAfterErr);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  // New: Sentence correction action
  const handleCorrectSentence = async () => {
    const sentence = inputQuery.trim();
    if (!sentence || loading) return;

    // Show user sentence as a message
    const userMsg: AIChatMessageType = {
      id: `user-correct-${Date.now()}`,
      role: 'user',
      content: `✏️ ${sentence}`,
      timestamp: Date.now(),
    };
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    saveHistory(afterUser);
    setInputQuery('');
    setLoading(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res: any = await AIClient.correctSentence(sentence, mode);
      // Build rich correction message
      let correctionText = '';
      if (res.isCorrect) {
        correctionText = `✅ **Your sentence is correct!**\n\n📖 ${res.explanationHindi}`;
      } else {
        correctionText = `✅ **Correct sentence:** ${res.corrected}\n\n📖 **Explanation:** ${res.explanationHindi}\n\n🇮🇳 **Hindi meaning:** ${res.hindiMeaning || res.practiceExample?.hindi || ''}\n\n💡 **Better alternative:** ${res.betterAlternative || 'N/A'}`;
      }
      if (res.practiceExample?.english) {
        correctionText += `\n\n🔄 **Practice:** ${res.practiceExample.english}`;
      }
      const aiMsg: AIChatMessageType = {
        id: `ai-correct-${Date.now()}`,
        role: 'assistant',
        content: correctionText,
        timestamp: Date.now(),
        suggestedFollowUps: [
          'Ek aur sentence correct karo.',
          'Is grammar rule ko detail mein samjhao.',
          '5 similar examples do.',
        ],
      };
      const updated = [...afterUser, aiMsg];
      setMessages(updated);
      saveHistory(updated);
      if (res.remainingToday !== undefined) setQuotaRemaining(res.remainingToday);
      // Track weak grammar topics for personalization
      if (!res.isCorrect && Array.isArray(res.grammarTags)) {
        WeakTopicsTracker.recordMistake(res.grammarTags);
      }
    } catch (e: any) {
      const errMsg: AIChatMessageType = {
        id: `err-correct-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${e.message || 'Error correcting sentence.'}`,
        timestamp: Date.now(),
      };
      const updated = [...afterUser, errMsg];
      setMessages(updated);
      saveHistory(updated);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };


  const clearChat = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await Storage.removeItem(AI_TUTOR_HISTORY_KEY);
          setMessages([
            {
              id: 'init-fresh',
              role: 'assistant',
              content: 'Chat history cleared. How can I help you today?',
              timestamp: Date.now(),
              suggestedFollowUps: [
                'Would have been aur have been mein kya difference hai?',
                'Daily spoken English ke 5 best formulas batao.',
              ],
            },
          ]);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Dark Premium Control Bar: Modes + Quota + Clear */}
      <View style={styles.topControlBar}>
        <View style={styles.modeTabs}>
          {(['beginner', 'intermediate', 'advanced'] as ExplanationMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                {m === 'beginner' ? 'Beginner (आसान)' : m === 'intermediate' ? 'Medium' : 'Advanced'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={clearChat} style={styles.clearChatBtn} accessibilityLabel="Clear chat">
          <Ionicons name="trash-outline" size={18} color="#A3A3A3" />
        </TouchableOpacity>
      </View>

      {/* Real-Time Voice Mode Banner */}
      <TouchableOpacity
        style={styles.voiceBanner}
        onPress={() => router.push(('/talk-to-ai' + (pinnedFormula ? `?formulaId=${pinnedFormula.id}` : '')) as any)}
        activeOpacity={0.88}
      >
        <View style={styles.voiceBannerLeft}>
          <View style={styles.voiceBannerIconCircle}>
            <Ionicons name="mic" size={16} color={colors.limeText} />
          </View>
          <View>
            <Text style={styles.voiceBannerTitle}>Try Real-Time Voice Mode (Live AI)</Text>
            <Text style={styles.voiceBannerSubtitle}>Speak in English & listen to live tutor</Text>
          </View>
        </View>
        <View style={styles.voiceBannerRight}>
          <Text style={styles.voiceBannerActionText}>Talk Now</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.lime} />
        </View>
      </TouchableOpacity>

      {/* Offline Status Banner */}
      <OfflineStatusBanner />

      {/* Pinned Formula Context Card */}
      {pinnedFormula && (
        <View style={styles.contextCardWrapper}>
          <FormulaContextCard
            formula={pinnedFormula}
            onClearContext={() => setPinnedFormula(null)}
            onViewFormula={() => router.push(`/formulas/${pinnedFormula.id}`)}
          />
        </View>
      )}

      {/* Quota reminder & Provider Status */}
      {quotaRemaining !== null && (
        <View style={styles.quotaBar}>
          <View style={styles.quotaDot} />
          <Text style={styles.quotaText}>
            {quotaRemaining >= 100
              ? '✨ Unlimited Free AI Answers (Testing Mode)'
              : `${quotaRemaining} of 10 free AI answers remaining today`}
          </Text>
          {fallbackActive && (
            <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#38BDF820' }}>
              <Text style={{ fontSize: 10, color: '#38BDF8', fontWeight: '700' }}>⚡ Backup AI Active (Gemini)</Text>
            </View>
          )}
        </View>
      )}

      {/* Messages ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => (
          <AIChatMessage
            key={m.id}
            message={m}
            isDark={true}
            onSelectFollowUp={handleSend}
            onNavigateFormula={(fid) => router.push(`/formulas/${fid}`)}
            onCopy={() => Alert.alert('Copied', 'Message copied to clipboard!')}
          />
        ))}

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={colors.orange} />
            <Text style={styles.typingText}>AI Teacher is preparing explanation...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Row with Correct + Send Buttons */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask in Hindi, English, or Hinglish..."
          placeholderTextColor="#737373"
          value={inputQuery}
          onChangeText={setInputQuery}
          onSubmitEditing={() => handleSend()}
          multiline
          maxLength={1000}
        />
        {/* Correct Sentence button */}
        <TouchableOpacity
          style={[styles.correctBtn, !inputQuery.trim() && styles.correctBtnDisabled]}
          onPress={handleCorrectSentence}
          disabled={!inputQuery.trim() || loading}
          accessibilityLabel="Correct sentence"
          activeOpacity={0.8}
        >
          <Ionicons name="brush" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendButton, !inputQuery.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputQuery.trim() || loading}
          accessibilityLabel="Send message"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
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
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.dock,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.dock,
  },
  modeTabActive: {
    backgroundColor: colors.lime,
    ...shadows.limeGlow,
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted2,
  },
  modeTabTextActive: {
    color: colors.limeText,
    fontWeight: '900',
  },
  clearChatBtn: {
    padding: spacing.xs,
  },
  contextCardWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.canvas,
  },
  quotaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  quotaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lime,
    ...shadows.limeGlow,
  },
  quotaText: {
    fontSize: 11,
    color: colors.textMuted2,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingText: {
    ...typography.caption,
    color: colors.textMuted2,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: colors.foreground,
    maxHeight: 100,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.limeGlow,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    opacity: 0.4,
  },
  correctBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.orange || '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    opacity: 0.4,
  },
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: 'rgba(212, 255, 0, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 24,
    ...shadows.card,
  },
  voiceBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  voiceBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.limeGlow,
  },
  voiceBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
  voiceBannerSubtitle: {
    fontSize: 11,
    color: colors.textMuted2,
    marginTop: 1,
  },
  voiceBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceBannerActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.lime,
  },
});
