import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchFormulas } from '../../src/search/formulaSearch';
import { StatusBar } from 'expo-status-bar';
import { BookmarkRepository } from '../../src/database/bookmarkRepository';
import { FormulaCard } from '../../src/components/FormulaCard';
import { BottomNavBar } from '../../src/components/BottomNavBar';
import categoriesData from '../../src/data/categories.json';
import { colors, radii, shadows } from '../../src/theme';

export default function AllFormulasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [jumpId, setJumpId] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);

  const loadBookmarks = async () => {
    const list = await BookmarkRepository.getBookmarks();
    setBookmarkedIds(list);
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

  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const filteredFormulas = useMemo(() => {
    const results = searchFormulas({
      query: searchQuery,
      category: selectedCategory === 'All' ? undefined : selectedCategory,
      limit: 600,
    });
    if (onlyBookmarked) {
      return results.filter((f) => bookmarkedSet.has(f.id));
    }
    return results;
  }, [searchQuery, selectedCategory, onlyBookmarked, bookmarkedSet]);

  const handleJump = () => {
    const num = parseInt(jumpId.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= 600) {
      router.push(`/formulas/${num}`);
    }
  };

  const categories = useMemo(() => {
    return [{ id: 'all', name: 'All', count: 600 }, ...categoriesData];
  }, []);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const handleFormulaPress = useCallback(
    (id: number) => {
      router.push(`/formulas/${id}`);
    },
    [router]
  );

  const handleAskAI = useCallback(
    (id: number) => {
      router.push({ pathname: '/talk-to-ai' as any, params: { formulaId: id } });
    },
    [router]
  );

  const renderFormulaItem = useCallback(
    ({ item }: { item: any }) => (
      <FormulaCard
        formula={item}
        isBookmarked={bookmarkedSet.has(item.id)}
        onPress={() => handleFormulaPress(item.id)}
        onToggleBookmark={() => toggleBookmark(item.id)}
        onAskAI={() => handleAskAI(item.id)}
      />
    ),
    [bookmarkedSet, handleFormulaPress, toggleBookmark, handleAskAI]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Editorial Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.editorialTitle}>Formula Index</Text>
            <Text style={styles.editorialSubtitle}>600 formulas • Spoken English mastery</Text>
          </View>
          <TouchableOpacity
            style={[styles.bookmarkFilterBtn, onlyBookmarked && styles.bookmarkFilterBtnActive]}
            onPress={() => setOnlyBookmarked(!onlyBookmarked)}
            accessibilityLabel="Filter bookmarked formulas"
          >
            <Ionicons
              name={onlyBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={onlyBookmarked ? '#0A0A0B' : '#1E1E24'}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar & Jump to ID Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search formula, verbs or Hindi..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.jumpContainer}>
            <TextInput
              style={styles.jumpInput}
              placeholder="# 1-600"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={jumpId}
              onChangeText={setJumpId}
              onSubmitEditing={handleJump}
              maxLength={3}
            />
            <TouchableOpacity style={styles.jumpBtn} onPress={handleJump}>
              <Text style={styles.jumpBtnText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat.name;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => setSelectedCategory(cat.name)}
                activeOpacity={0.8}
              >
                {!isSelected && <View style={styles.chipDot} />}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {cat.name}
                </Text>
                <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
                  <Text style={[styles.countBadgeText, isSelected && styles.countBadgeTextSelected]}>
                    {cat.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count & Reset Filter */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          Showing <Text style={styles.countNumber}>{filteredFormulas.length}</Text> of 600 formulas
        </Text>
        {(selectedCategory !== 'All' || onlyBookmarked || searchQuery.length > 0) && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory('All');
              setOnlyBookmarked(false);
              setSearchQuery('');
            }}
          >
            <Text style={styles.resetText}>Reset filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Virtualized Formula List - 60fps tuned */}
      <FlatList
        data={filteredFormulas}
        keyExtractor={keyExtractor}
        renderItem={renderFormulaItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        updateCellsBatchingPeriod={30}
      />

      {/* Floating Modern Bottom Dock */}
      <BottomNavBar activeTab="formulas" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5EB', // LIGHT SOFT PAPER BACKGROUND
    position: 'relative',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editorialTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111114',
    letterSpacing: -1.0,
    textTransform: 'uppercase',
  },
  editorialSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  bookmarkFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  bookmarkFilterBtnActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111114',
  },
  clearBtn: {
    padding: 4,
  },
  jumpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 48,
    paddingLeft: 12,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  jumpInput: {
    width: 56,
    fontSize: 13,
    fontWeight: '700',
    color: '#111114',
    paddingVertical: 0,
  },
  jumpBtn: {
    backgroundColor: '#1E1E24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  jumpBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.lime,
  },
  categoriesSection: {
    marginBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#1E1E24',
    borderColor: '#1E1E24',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  countBadgeTextSelected: {
    color: colors.lime,
    fontWeight: '900',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  countNumber: {
    color: '#111114',
    fontWeight: '800',
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.pink,
  },
  listContent: {
    paddingTop: 4,
  },
});
