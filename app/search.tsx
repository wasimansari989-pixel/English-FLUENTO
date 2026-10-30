import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchFormulas } from '../src/search/formulaSearch';
import { FormulaCard } from '../src/components/FormulaCard';
import { BookmarkRepository } from '../src/database/bookmarkRepository';
import { AIClient } from '../src/services/aiClient';
import { AIChatMessage } from '../src/components/AIChatMessage';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { AIChatMessage as AIChatMessageType } from '../src/types/ai';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

export default function SearchScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'local' | 'ai'>('local');
  const [localQuery, setLocalQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [aiMessages, setAiMessages] = useState<AIChatMessageType[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Local results
  const localResults = useMemo(() => {
    if (!localQuery.trim()) return [];
    return searchFormulas({ query: localQuery, limit: 100 });
  }, [localQuery]);

  const handleAskAI = async (textToSend?: string) => {
    const q = (textToSend || aiQuery).trim();
    if (!q || aiLoading) return;

    const userMsg: AIChatMessageType = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setAiQuery('');
    setAiLoading(true);

    try {
      const res = await AIClient.askTutor(q);
      const aiMsg: AIChatMessageType = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        formulaId: res.formulaId,
        suggestedFollowUps: res.suggestedFollowUps,
      };
      setAiMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: AIChatMessageType = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Something went wrong. Please try again.'}`,
        timestamp: Date.now(),
      };
      setAiMessages((prev) => [...prev, errMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  const sampleAiQuestions = [
    'Would have been aur have been mein kya difference hai?',
    'Have to aur had to ka use kaise karein?',
    'Show me to speak ka kya matlab hai?',
    "Is Hindi sentence ko English mein translate karo: 'मुझे जाना पड़ रहा है'",
  ];

  const searchHintTags = [
    'Have been',
    'Show me to',
    'It is time to',
    '207',
    'Used to',
    'अगर',
    'चाहिए',
    'आदत',
    'Can / Could',
    'V3',
  ];

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.activeTab]}
          onPress={() => setActiveTab('local')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="search"
            size={16}
            color={activeTab === 'local' ? colors.foreground : colors.secondaryText}
          />
          <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
            Local Formula Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={activeTab === 'ai' ? colors.foreground : colors.secondaryText}
          />
          <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
            Ask AI Teacher
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Local Formula Search */}
      {activeTab === 'local' && (
        <View style={styles.tabContent}>
          <View style={styles.searchBarBox}>
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search formula, verbs, Hindi or ID (e.g. 207)..."
              placeholderTextColor={colors.secondaryText}
              value={localQuery}
              onChangeText={setLocalQuery}
              clearButtonMode="while-editing"
              autoFocus
            />
            {localQuery.length > 0 && (
              <TouchableOpacity onPress={() => setLocalQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>

          {localQuery.trim().length === 0 ? (
            <ScrollView style={styles.hintContainer} contentContainerStyle={{ paddingBottom: 110 }}>
              <Text style={styles.hintTitle}>Popular Quick Searches</Text>
              <View style={styles.tagsContainer}>
                {searchHintTags.map((tag, idx) => {
                  const neonAccents = [
                    colors.limeSoft,
                    colors.purpleSoft,
                    colors.pinkSoft,
                    'rgba(34, 197, 94, 0.15)',
                  ];
                  const neonBorders = [
                    colors.limeBorder,
                    colors.purpleBorder,
                    'rgba(255, 90, 138, 0.3)',
                    colors.greenBorder,
                  ];
                  const neonTexts = [
                    colors.lime,
                    colors.purpleLight,
                    colors.pink,
                    colors.green,
                  ];
                  const tagAccent = neonAccents[idx % neonAccents.length];
                  const tagBorder = neonBorders[idx % neonBorders.length];
                  const tagTextColor = neonTexts[idx % neonTexts.length];

                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.sampleTag,
                        { backgroundColor: tagAccent, borderColor: tagBorder, borderWidth: 1 },
                      ]}
                      onPress={() => setLocalQuery(tag)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.sampleTagText, { color: tagTextColor }]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={localResults}
              keyExtractor={(item) => item.id.toString()}
              removeClippedSubviews={Platform.OS === 'android'}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              ListHeaderComponent={
                <Text style={styles.resultsCount}>
                  Found <Text style={{ fontWeight: '800' }}>{localResults.length}</Text> matching formulas
                </Text>
              }
              renderItem={({ item }) => (
                <FormulaCard
                  formula={item}
                  isBookmarked={bookmarkedIds.includes(item.id)}
                  onPress={() => router.push(`/formulas/${item.id}`)}
                  onToggleBookmark={async () => {
                    await BookmarkRepository.toggleBookmark(item.id);
                    const b = await BookmarkRepository.getBookmarks();
                    setBookmarkedIds(b);
                  }}
                  onAskAI={() => router.push({ pathname: '/ai-teacher', params: { formulaId: item.id } })}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matching formulas found.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Tab 2: Ask AI */}
      {activeTab === 'ai' && (
        <View style={styles.tabContent}>
          <ScrollView style={styles.aiChatArea} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
            {aiMessages.length === 0 ? (
              <View style={styles.aiWelcomeBox}>
                <View style={styles.aiWelcomeIconBadge}>
                  <Ionicons name="sparkles" size={24} color={colors.lime} />
                </View>
                <Text style={styles.aiWelcomeTitle}>Ask Any English Question</Text>
                <Text style={styles.aiWelcomeDesc}>
                  Ask in simple Hindi, Hinglish, or English. You can ask about differences between structures, sentence translations, or grammar rules.
                </Text>

                <Text style={styles.sampleHeader}>Popular Questions:</Text>
                {sampleAiQuestions.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.sampleQCard}
                    onPress={() => handleAskAI(q)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="help-circle-outline" size={16} color={colors.foreground} />
                    <Text style={styles.sampleQText}>{q}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.secondaryText} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              aiMessages.map((msg) => (
                <AIChatMessage
                  key={msg.id}
                  message={msg}
                  onSelectFollowUp={handleAskAI}
                  onNavigateFormula={(fid) => router.push(`/formulas/${fid}`)}
                />
              ))
            )}
            {aiLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.darkSurface} />
                <Text style={styles.loadingText}>AI Teacher is thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* AI Input Row */}
          <View style={styles.aiInputRow}>
            <TextInput
              style={styles.aiInput}
              placeholder="Type your question in Hindi or English..."
              placeholderTextColor={colors.secondaryText}
              value={aiQuery}
              onChangeText={setAiQuery}
              onSubmitEditing={() => handleAskAI()}
            />
            <TouchableOpacity
              style={[styles.aiSendBtn, !aiQuery.trim() && styles.aiSendBtnDisabled]}
              onPress={() => handleAskAI()}
              disabled={!aiQuery.trim() || aiLoading}
            >
              <Ionicons name="send" size={16} color={colors.darkSurface} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Floating Bottom Nav */}
      <BottomNavBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
    borderRadius: radii.dock,
  },
  activeTab: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tabText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted2,
  },
  activeTabText: {
    color: colors.lime,
    fontWeight: '900',
  },
  tabContent: {
    flex: 1,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 48,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.foreground,
    paddingVertical: 0,
  },
  resultsCount: {
    ...typography.caption,
    color: colors.textMuted2,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  hintContainer: {
    paddingHorizontal: spacing.md,
  },
  hintTitle: {
    ...typography.antonHero,
    fontSize: 22,
    lineHeight: 26,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sampleTag: {
    borderRadius: radii.dock,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  sampleTagText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.foreground,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    ...typography.bodySecondary,
    color: colors.textMuted2,
  },
  aiChatArea: {
    flex: 1,
  },
  aiWelcomeBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  aiWelcomeIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.purpleGlow,
  },
  aiWelcomeTitle: {
    ...typography.antonHero,
    fontSize: 28,
    lineHeight: 32,
    color: colors.foreground,
    letterSpacing: -1,
  },
  aiWelcomeDesc: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
    color: colors.textMuted2,
  },
  sampleHeader: {
    ...typography.badge,
    color: colors.textMuted2,
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sampleQCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    width: '100%',
    gap: spacing.sm,
  },
  sampleQText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted2,
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  aiInput: {
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
  aiSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.limeGlow,
  },
  aiSendBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    opacity: 0.4,
  },
});
