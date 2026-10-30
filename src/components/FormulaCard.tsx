import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { SentenceFormula } from '../types/formula';
import { HighlightedSentence } from './HighlightedSentence';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface FormulaCardProps {
  formula: SentenceFormula;
  isBookmarked?: boolean;
  onPress: () => void;
  onToggleBookmark?: () => void;
  onAskAI?: () => void;
  isDark?: boolean;
}

// Category badge styling helper using LinguaVerse PRO neon tints
const getCategoryStyle = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('am') || cat.includes('is') || cat.includes('are')) {
    return { bg: 'rgba(255, 90, 138, 0.14)', text: '#FF5A8A', border: 'rgba(255, 90, 138, 0.35)' };
  }
  if (cat.includes('have') || cat.includes('has') || cat.includes('had')) {
    return { bg: 'rgba(214, 255, 87, 0.14)', text: '#D6FF57', border: 'rgba(214, 255, 87, 0.35)' };
  }
  if (cat.includes('will') || cat.includes('would')) {
    return { bg: 'rgba(139, 92, 246, 0.16)', text: '#A78BFA', border: 'rgba(139, 92, 246, 0.4)' };
  }
  if (cat.includes('can') || cat.includes('could') || cat.includes('modal')) {
    return { bg: 'rgba(34, 197, 94, 0.14)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.35)' };
  }
  return { bg: 'rgba(255, 255, 255, 0.08)', text: 'rgba(255, 255, 255, 0.75)', border: 'rgba(255, 255, 255, 0.15)' };
};

export const FormulaCard: React.FC<FormulaCardProps> = React.memo(({
  formula,
  isBookmarked = false,
  onPress,
  onToggleBookmark,
  onAskAI,
  isDark = true,
}) => {
  const firstExample = formula.examples && formula.examples.length > 0 ? formula.examples[0] : null;
  const catStyle = getCategoryStyle(formula.category);

  const cardScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.985,
      speed: 50,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      speed: 35,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleBookmarkPress = () => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        onToggleBookmark?.();
        return;
      }
      Animated.sequence([
        Animated.timing(bookmarkScale, {
          toValue: 1.35,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.spring(bookmarkScale, {
          toValue: 1,
          friction: 3.5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
      onToggleBookmark?.();
    });
  };

  // Helper to render formula syntax tokens with structured high-clarity typography
  const renderFormulaSyntax = () => {
    const raw = formula.englishFormula || '';
    if (raw.includes('+')) {
      const parts = raw.split('+').map((p) => p.trim());
      return (
        <View style={styles.formulaTokensWrap}>
          {parts.map((part, idx) => {
            const isAnchor = idx === 0 && !part.toLowerCase().startsWith('sub');
            return (
              <React.Fragment key={idx}>
                <View style={[styles.formulaTokenPill, isAnchor && styles.formulaAnchorPill]}>
                  <Text style={[styles.formulaTokenText, isAnchor && styles.formulaAnchorText]}>
                    {part}
                  </Text>
                </View>
                {idx < parts.length - 1 && (
                  <View style={styles.plusContainer}>
                    <Text style={styles.formulaPlusSign}>+</Text>
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      );
    }
    return <Text style={styles.formulaText}>{raw}</Text>;
  };

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`Formula ${formula.id}: ${formula.englishFormula}`}
      >
        {/* 1. Header Metadata Row: ID Badge + Category + Action Buttons */}
        <View style={styles.topRow}>
          <View style={styles.headerLeft}>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeHash}>#</Text>
              <Text style={styles.idBadgeNumber}>{formula.id}</Text>
            </View>

            <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
              <View style={[styles.categoryDot, { backgroundColor: catStyle.text }]} />
              <Text style={[styles.categoryBadgeText, { color: catStyle.text }]} numberOfLines={1}>
                {formula.category}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {onToggleBookmark && (
              <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleBookmarkPress();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.iconButton, isBookmarked && styles.iconButtonBookmarked]}
                  accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <Ionicons
                    name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={17}
                    color={isBookmarked ? '#E11D48' : '#111114'}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}

            {onAskAI && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAskAI();
                }}
                style={styles.aiButton}
                accessibilityLabel="Ask AI Tutor"
              >
                <Ionicons name="sparkles" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* 2. Structured English Formula Bar */}
      <View style={styles.formulaBox}>
        <View style={styles.formulaHeaderRow}>
          <Text style={styles.formulaMicroLabel}>ENGLISH FORMULA STRUCTURE</Text>
          <Ionicons name="code-working" size={14} color="#6B7280" />
        </View>
        {renderFormulaSyntax()}
      </View>

      {/* 3. High-Contrast Hindi Meaning Ribbon */}
      <View style={styles.hindiMeaningRibbon}>
        <View style={styles.hindiIconBadge}>
          <Ionicons name="language" size={13} color="#D6FF57" />
          <Text style={styles.hindiBadgeText}>अर्थ</Text>
        </View>
        <Text style={styles.hindiMeaningContent} numberOfLines={2}>
          “{formula.hindiMeaning}”
        </Text>
      </View>

      {/* 4. Bilingual Dialogue Example Preview */}
      {firstExample && (
        <View style={styles.examplePreviewCard}>
          <View style={styles.exampleCardHeader}>
            <View style={styles.exampleHeaderLeft}>
              <Ionicons name="chatbubbles-outline" size={13} color="#8B5CF6" />
              <Text style={styles.exampleHeaderTitle}>REAL CONVERSATION USAGE</Text>
            </View>
            <View style={styles.audioIconWrapper}>
              <Ionicons name="volume-medium-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
            </View>
          </View>

          {/* English Sentence Row */}
          <View style={styles.sentenceLine}>
            <View style={styles.langPillEn}>
              <Text style={styles.langPillTextEn}>EN</Text>
            </View>
            <View style={styles.sentenceTextWrap}>
              <HighlightedSentence
                segments={firstExample.englishSegments}
                fallbackText={firstExample.originalEnglish}
                size="md"
                isHindi={false}
                isDark={true}
              />
            </View>
          </View>

          {/* Clean Separator */}
          <View style={styles.sentenceDivider} />

          {/* Hindi Translation Row */}
          <View style={styles.sentenceLine}>
            <View style={styles.langPillHi}>
              <Text style={styles.langPillTextHi}>HI</Text>
            </View>
            <View style={styles.sentenceTextWrap}>
              <HighlightedSentence
                segments={firstExample.hindiSegments}
                fallbackText={firstExample.originalHindi}
                size="md"
                isHindi={true}
                isDark={true}
              />
            </View>
          </View>
        </View>
      )}

      {/* 5. Footer Row with Examples Count & Lime Study Button */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Ionicons name="layers-outline" size={13} color="#6B7280" />
          <Text style={styles.examplesCountText}>
            {formula.examples ? `${formula.examples.length} practical examples` : '5 examples'}
          </Text>
        </View>

        <View style={styles.studyPillBtn}>
          <Text style={styles.studyPillBtnText}>Study Formula</Text>
          <Ionicons name="arrow-forward" size={13} color="#0A0A0B" />
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
});

FormulaCard.displayName = 'FormulaCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginVertical: 7,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 0 : 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 2,
  },
  idBadgeHash: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
  },
  idBadgeNumber: {
    color: '#111114',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: 170,
    gap: 5,
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
  iconButtonBookmarked: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  aiButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 3,
  },

  // Formula Container & Token Styles
  formulaBox: {
    backgroundColor: '#F9FAFB',
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  formulaMicroLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  formulaTokensWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  formulaTokenPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  formulaAnchorPill: {
    backgroundColor: '#1E1E24',
    borderColor: '#1E1E24',
  },
  formulaTokenText: {
    color: '#111114',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  formulaAnchorText: {
    color: colors.lime,
    fontWeight: '800',
  },
  plusContainer: {
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formulaPlusSign: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '900',
  },
  formulaText: {
    color: '#111114',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Hindi Meaning Ribbon
  hindiMeaningRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  hindiIconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hindiBadgeText: {
    color: '#854D0E',
    fontSize: 10,
    fontWeight: '800',
  },
  hindiMeaningContent: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111114',
    lineHeight: 18,
  },

  // Example Preview Card (High-Contrast Obsidian Block for Beginners: Red Formula + White Text)
  examplePreviewCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  exampleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exampleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exampleHeaderTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A78BFA',
    letterSpacing: 0.8,
  },
  audioIconWrapper: {
    padding: 2,
  },
  sentenceLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  langPillEn: {
    backgroundColor: 'rgba(214, 255, 87, 0.20)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  langPillTextEn: {
    color: '#D6FF57',
    fontSize: 9,
    fontWeight: '900',
  },
  langPillHi: {
    backgroundColor: 'rgba(255, 90, 138, 0.20)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  langPillTextHi: {
    color: '#FF5A8A',
    fontSize: 9,
    fontWeight: '900',
  },
  sentenceTextWrap: {
    flex: 1,
  },
  sentenceDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8,
  },

  // Footer Row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examplesCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  studyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lime,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 3,
  },
  studyPillBtnText: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '800',
  },
});
