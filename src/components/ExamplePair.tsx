import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SentenceExample } from '../types/formula';
import { HighlightedSentence } from './HighlightedSentence';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface ExamplePairProps {
  example: SentenceExample;
  index?: number;
  isDark?: boolean;
  onCopy?: (text: string) => void;
}

export const ExamplePair: React.FC<ExamplePairProps> = ({
  example,
  index,
  isDark = true,
  onCopy,
}) => {
  const fullHindi = example.originalHindi || example.hindiSegments.map((s) => s.text).join('');
  const fullEnglish = example.originalEnglish || example.englishSegments.map((s) => s.text).join('');
  const exampleNum = index !== undefined ? `${index + 1}` : '•';

  return (
    <View style={styles.card}>
      {/* Top Header of Example: Index + Copy button */}
      <View style={styles.cardHeader}>
        <View style={styles.indexPill}>
          <Text style={styles.indexPillText}>EXAMPLE #{exampleNum}</Text>
        </View>

        <View style={styles.headerRight}>
          {onCopy && (
            <TouchableOpacity
              onPress={() => onCopy(`${fullEnglish}\n${fullHindi}`)}
              style={styles.copyBtn}
              accessibilityLabel="Copy example"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="copy-outline" size={14} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* High-Contrast Dark Obsidian Container for Beginners: Red Formula + White Words */}
      <View style={styles.sentencesBox}>
        {/* English Sentence Line */}
        <View style={styles.sentenceRow}>
          <View style={styles.langPillEn}>
            <Text style={styles.langPillTextEn}>EN</Text>
          </View>
          <View style={styles.sentenceTextCol}>
            <HighlightedSentence
              segments={example.englishSegments}
              fallbackText={fullEnglish}
              size="md"
              isHindi={false}
              isDark={true}
            />
          </View>
        </View>

        {/* Hairline Divider */}
        <View style={styles.divider} />

        {/* Hindi Translation Line */}
        <View style={styles.sentenceRow}>
          <View style={styles.langPillHi}>
            <Text style={styles.langPillTextHi}>HI</Text>
          </View>
          <View style={styles.sentenceTextCol}>
            <HighlightedSentence
              segments={example.hindiSegments}
              fallbackText={fullHindi}
              size="md"
              isHindi={true}
              isDark={true}
            />
          </View>
        </View>
      </View>

      {/* Review Status subtle badge */}
      {example.reviewStatus === 'pending' && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Pending Alignment Review</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  indexPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.dock,
  },
  indexPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  sentencesBox: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 2,
  },
  langPillEn: {
    backgroundColor: 'rgba(214, 255, 87, 0.20)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  langPillTextEn: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D6FF57',
    letterSpacing: 0.4,
  },
  langPillHi: {
    backgroundColor: 'rgba(255, 90, 138, 0.20)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  langPillTextHi: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF5A8A',
    letterSpacing: 0.4,
  },
  sentenceTextCol: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.dock,
    marginTop: 8,
  },
  pendingBadgeText: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
  },
});
