import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllHelpingVerbs, searchFormulas } from '../src/search/formulaSearch';
import { FormulaCard } from '../src/components/FormulaCard';
import { BookmarkRepository } from '../src/database/bookmarkRepository';
import { BottomNavBar } from '../src/components/BottomNavBar';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

interface VerbGroup {
  name: string;
  subtitle: string;
  verbs: string[];
}

const VERB_GROUPS: VerbGroup[] = [
  {
    name: 'HAVING & POSSESSION',
    subtitle: 'Possession, requirements & completed states',
    verbs: ['have', 'has', 'had', 'have to', 'has to', 'had to'],
  },
  {
    name: 'PERFECT CONTINUOUS',
    subtitle: 'Actions continuing over duration with since/for',
    verbs: ['have been', 'has been', 'had been'],
  },
  {
    name: 'BEING & CONTINUOUS',
    subtitle: 'State of being, continuous actions & passives',
    verbs: ['is', 'am', 'are', 'was', 'were', 'being', 'been'],
  },
  {
    name: 'GOING TO & INTENTIONS (वाला है / था)',
    subtitle: 'Actions about to happen, future intentions & plans',
    verbs: ['is going to', 'am going to', 'are going to', 'was going to', 'were going to', 'going to'],
  },
  {
    name: 'MODAL VERBS & ABILITY',
    subtitle: 'Ability, permission, obligations & advice',
    verbs: ['can', 'could', 'should', 'must', 'may', 'might', 'would'],
  },
  {
    name: 'ACTION & NEGATION (DO)',
    subtitle: 'Simple tenses, questions & emphasis',
    verbs: ['do', 'does', 'did'],
  },
  {
    name: 'FUTURE & CONDITIONAL',
    subtitle: 'Hypothetical situations & future perfects',
    verbs: ['will have', 'will have been', 'would have', 'would have been'],
  },
];

export default function HelpingVerbsScreen() {
  const router = useRouter();
  const [selectedVerb, setSelectedVerb] = useState<string | null>(null);
  const [verbSearch, setVerbSearch] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  const allVerbs = useMemo(() => getAllHelpingVerbs(), []);

  const matchingFormulas = useMemo(() => {
    if (!selectedVerb) return [];
    return searchFormulas({ helpingVerb: selectedVerb, limit: 600 });
  }, [selectedVerb]);

  const filteredVerbs = useMemo(() => {
    if (!verbSearch.trim()) return allVerbs;
    return allVerbs.filter((v) =>
      v.verb.toLowerCase().includes(verbSearch.toLowerCase().trim())
    );
  }, [allVerbs, verbSearch]);

  return (
    <View style={styles.container}>
      {/* Top Search Surface */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search helping verb (e.g. have been, could, had to)..."
            placeholderTextColor={colors.secondaryText}
            value={verbSearch}
            onChangeText={setVerbSearch}
            clearButtonMode="while-editing"
          />
          {verbSearch.length > 0 && (
            <TouchableOpacity onPress={() => setVerbSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected verb pill / Clear action */}
        {selectedVerb && (
          <View style={styles.activeFilterBanner}>
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterLabel}>Active Verb:</Text>
              <Text style={styles.activeFilterVerb}>{selectedVerb}</Text>
              <Text style={styles.activeFilterCount}>({matchingFormulas.length} formulas)</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedVerb(null)} style={styles.clearFilterBtn}>
              <Ionicons name="close" size={16} color={colors.darkSurface} />
              <Text style={styles.clearFilterBtnText}>Show All Groups</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* When a verb is selected, show matching formulas */}
      {selectedVerb ? (
        <View style={styles.resultsContainer}>
          <FlatList
            data={matchingFormulas}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
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
            ListEmptyComponent={
              <View style={styles.emptyResults}>
                <Text style={styles.emptyResultsTitle}>No matching formulas found</Text>
              </View>
            }
          />
        </View>
      ) : (
        /* Categorized Groups & Explorer Mode */
        <ScrollView style={styles.groupsContainer} contentContainerStyle={styles.groupsContent}>
          {/* Editorial Banner */}
          <View style={styles.editorialCard}>
            <View style={styles.editorialIconBadge}>
              <Ionicons name="compass-outline" size={20} color={colors.darkSurface} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.editorialCardTitle}>Helping Verb Explorer</Text>
              <Text style={styles.editorialCardDesc}>
                Tap any helping verb family below to instantly isolate all 600 sentence formulas using that specific structure.
              </Text>
            </View>
          </View>

          {/* If user is searching specifically, show matching chips first */}
          {verbSearch.trim().length > 0 && (
            <View style={styles.groupCard}>
              <Text style={styles.groupHeader}>SEARCH RESULTS ({filteredVerbs.length})</Text>
              <View style={styles.chipsWrap}>
                {filteredVerbs.map((v) => (
                  <TouchableOpacity
                    key={v.verb}
                    style={styles.verbChip}
                    onPress={() => setSelectedVerb(v.verb)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.verbChipText}>{v.verb}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{v.count}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Curated Verb Families */}
          {VERB_GROUPS.map((group, gIdx) => {
            // Find verbs in this group that exist in dataset
            const matchedDatasetVerbs = allVerbs.filter((v) =>
              group.verbs.some((gv) => gv.toLowerCase() === v.verb.toLowerCase())
            );

            // Pastel accent cycling
            const pastelAccents = [
              colors.accentYellow,
              colors.accentPink,
              colors.accentLilac,
              colors.accentPeach,
            ];
            const groupAccent = pastelAccents[gIdx % pastelAccents.length];

            return (
              <View key={group.name} style={styles.groupCard}>
                <View style={styles.groupHeaderRow}>
                  <View style={[styles.groupDot, { backgroundColor: groupAccent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupHeader}>{group.name}</Text>
                    <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.chipsWrap}>
                  {matchedDatasetVerbs.map((v) => (
                    <TouchableOpacity
                      key={v.verb}
                      style={styles.verbChip}
                      onPress={() => setSelectedVerb(v.verb)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.verbChipText}>{v.verb}</Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{v.count}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {matchedDatasetVerbs.length === 0 && (
                    <Text style={styles.emptyVerbsText}>No verbs recorded in this category</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* All Verbs Alphabetical Index */}
          <View style={[styles.groupCard, { marginBottom: 110 }]}>
            <Text style={styles.groupHeader}>ALL 48 HELPING VERBS INDEX</Text>
            <Text style={styles.groupSubtitle}>Alphabetical list with formula counts</Text>
            <View style={styles.chipsWrap}>
              {allVerbs.map((v) => (
                <TouchableOpacity
                  key={v.verb}
                  style={styles.verbChipSecondary}
                  onPress={() => setSelectedVerb(v.verb)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.verbChipSecondaryText}>{v.verb}</Text>
                  <View style={styles.countBadgeSecondary}>
                    <Text style={styles.countBadgeSecondaryText}>{v.count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Floating Bottom Nav */}
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
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
  activeFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.dock,
    gap: 6,
    ...shadows.limeGlow,
  },
  activeFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.limeText,
    textTransform: 'uppercase',
  },
  activeFilterVerb: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.limeText,
  },
  activeFilterCount: {
    fontSize: 10,
    color: colors.limeText,
    fontWeight: '700',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  clearFilterBtnText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.foreground,
  },
  resultsContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 130,
  },
  emptyResults: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyResultsTitle: {
    ...typography.h3,
    color: colors.textMuted2,
  },
  groupsContainer: {
    flex: 1,
  },
  groupsContent: {
    padding: spacing.md,
  },
  editorialCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 20,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  editorialIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialCardTitle: {
    ...typography.antonHero,
    fontSize: 22,
    lineHeight: 26,
    color: colors.foreground,
  },
  editorialCardDesc: {
    ...typography.caption,
    color: colors.textMuted2,
    marginTop: 2,
    lineHeight: 16,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupHeader: {
    ...typography.badge,
    color: colors.foreground,
    letterSpacing: 0.8,
    fontWeight: '900',
  },
  groupSubtitle: {
    ...typography.caption,
    color: colors.textMuted2,
    marginTop: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  verbChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.dock,
    gap: 6,
  },
  verbChipText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.foreground,
  },
  countBadge: {
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.limeText,
  },
  verbChipSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.dock,
    gap: 6,
  },
  verbChipSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.foreground,
  },
  countBadgeSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  countBadgeSecondaryText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted2,
  },
  emptyVerbsText: {
    ...typography.caption,
    color: colors.textMuted2,
    fontStyle: 'italic',
  },
});
