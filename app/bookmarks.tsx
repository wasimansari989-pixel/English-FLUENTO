import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookmarkRepository } from '../src/database/bookmarkRepository';
import { getFormulaById } from '../src/search/formulaSearch';
import { FormulaCard } from '../src/components/FormulaCard';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { SentenceFormula } from '../src/types/formula';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

export default function BookmarksScreen() {
  const router = useRouter();
  const [bookmarkedFormulas, setBookmarkedFormulas] = useState<SentenceFormula[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBookmarks = async () => {
    const ids = await BookmarkRepository.getBookmarks();
    const formulas = ids
      .map((id) => getFormulaById(id))
      .filter((f): f is SentenceFormula => f !== undefined);
    setBookmarkedFormulas(formulas);
  };

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const toggleBookmark = async (id: number) => {
    await BookmarkRepository.toggleBookmark(id);
    await loadBookmarks();
  };

  const filtered = bookmarkedFormulas.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      f.englishFormula.toLowerCase().includes(q) ||
      f.hindiMeaning.toLowerCase().includes(q) ||
      f.id.toString() === q
    );
  });

  const renderFormulaItem = useCallback(
    ({ item }: { item: SentenceFormula }) => (
      <FormulaCard
        formula={item}
        isBookmarked={true}
        onPress={() => router.push(`/formulas/${item.id}`)}
        onToggleBookmark={() => toggleBookmark(item.id)}
        onAskAI={() => router.push({ pathname: '/ai-teacher', params: { formulaId: item.id } })}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: SentenceFormula) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Header Search & Title */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Saved Formulas</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{bookmarkedFormulas.length}</Text>
          </View>
        </View>

        {bookmarkedFormulas.length > 0 && (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search in saved formulas..."
              placeholderTextColor={colors.secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderFormulaItem}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="bookmark-outline" size={32} color={colors.secondaryText} />
            </View>
            <Text style={styles.emptyTitle}>No Bookmarks Saved Yet</Text>
            <Text style={styles.emptyDesc}>
              Tap the bookmark icon on any formula card to save it here for fast revision!
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => router.push('/formulas')}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Browse 600 Formulas</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <BottomNavBar activeTab="formulas" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.antonHero,
    fontSize: 28,
    lineHeight: 32,
    color: colors.foreground,
  },
  countBadge: {
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radii.dock,
    ...shadows.limeGlow,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.limeText,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    height: 46,
    marginTop: spacing.xs,
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 130,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  emptyTitle: {
    ...typography.antonHero,
    fontSize: 22,
    lineHeight: 26,
    color: colors.foreground,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
    color: colors.textMuted2,
  },
  browseBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.dock,
    ...shadows.limeGlow,
  },
  browseBtnText: {
    ...typography.button,
    color: colors.limeText,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
