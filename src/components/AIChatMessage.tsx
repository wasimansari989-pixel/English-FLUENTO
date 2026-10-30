import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AIChatMessage as AIChatMessageType } from '../types/ai';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '../theme';

interface AIChatMessageProps {
  message: AIChatMessageType;
  onSelectFollowUp?: (text: string) => void;
  onNavigateFormula?: (id: number) => void;
  onCopy?: (text: string) => void;
  isDark?: boolean;
}

function renderInlineFormatted(text: string, baseStyle: any, boldStyle: any) {
  if (!text) return null;
  // Match **bold** and *italic*
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={index} style={boldStyle}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      return (
        <Text key={index} style={[baseStyle, { fontStyle: 'italic' }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={index} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  message,
  onSelectFollowUp,
  onNavigateFormula,
  onCopy,
  isDark = true,
}) => {
  const isUser = message.role === 'user';

  // Format AI text into clean, structured mobile blocks
  const renderFormattedBody = () => {
    if (isUser) {
      return <Text style={styles.userContent}>{message.content}</Text>;
    }

    const lines = (message.content || '').split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const baseTextStyle = isDark ? styles.aiTextDark : styles.aiText;
    const boldTextStyle = isDark ? styles.aiBoldDark : styles.aiBold;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        i++;
        continue;
      }

      // 1. Horizontal Dividers (--- or ***)
      if (/^[-*_]{3,}$/.test(line)) {
        elements.push(<View key={`div-${i}`} style={isDark ? styles.dividerDark : styles.divider} />);
        i++;
        continue;
      }

      // 2. Markdown Tables (| col1 | col2 |)
      if (line.startsWith('|') && line.endsWith('|')) {
        // Collect all table lines
        const tableRows: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableRows.push(lines[i].trim());
          i++;
        }

        // Filter out table headers and dividers
        const dataRows = tableRows.filter((r) => {
          const lower = r.toLowerCase();
          return !r.includes('---') && !lower.includes('english sentence') && !lower.includes('hindi translation');
        });

        elements.push(
          <View key={`table-${i}`} style={styles.tableCardContainer}>
            {dataRows.map((row, rIdx) => {
              const cells = row
                .split('|')
                .map((c) => c.trim())
                .filter(Boolean);
              const eng = cells[0]?.replace(/^\*\*|\*\*$/g, '') || '';
              const hin = cells[1]?.replace(/^\*\*|\*\*$/g, '') || '';

              return (
                <View key={`row-${rIdx}`} style={[styles.exampleCard, isDark && styles.exampleCardDark]}>
                  <View style={styles.exampleHeader}>
                    <View style={styles.langPill}>
                      <Text style={styles.langPillText}>English</Text>
                    </View>
                    <Text style={[styles.exampleEngText, isDark && styles.exampleEngTextDark]}>{eng}</Text>
                  </View>
                  {hin ? (
                    <View style={styles.exampleHindiRow}>
                      <View style={[styles.langPill, styles.langPillHindi]}>
                        <Text style={[styles.langPillText, styles.langPillHindiText]}>हिंदी</Text>
                      </View>
                      <Text style={[styles.exampleHinText, isDark && styles.exampleHinTextDark]}>{hin}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
        continue;
      }

      // 3. Section Headers (e.g. ### 1️⃣ Exact meaning or 🎯 आसान मतलब or **Title**)
      if (
        line.startsWith('###') ||
        line.startsWith('##') ||
        /^[🎯💡🗣️⚠️❓📌1️⃣2️⃣3️⃣4️⃣5️⃣]/.test(line)
      ) {
        const cleanTitle = line.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
        elements.push(
          <View key={`sec-${i}`} style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
              {cleanTitle}
            </Text>
          </View>
        );
        i++;
        continue;
      }

      // 4. Highlighted Formula Structure Title (e.g. **Would + have + been**)
      if (/^\*\*[A-Za-z0-9\s+/_()]+\*\*$/.test(line) && line.length > 5) {
        const formulaTitle = line.replace(/^\*\*|\*\*$/g, '').trim();
        elements.push(
          <View key={`title-${i}`} style={[styles.formulaBanner, isDark && styles.formulaBannerDark]}>
            <Ionicons name="flash" size={14} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.formulaBannerText}>{formulaTitle}</Text>
          </View>
        );
        i++;
        continue;
      }

      // 5. Spoken Examples formatted with English / Hindi prefixes
      if (line.startsWith('• English:') || line.startsWith('English:')) {
        const engText = line.replace(/^[•\s]*English:\s*/i, '').replace(/^"|"$/g, '').trim();
        let hinText = '';
        if (i + 1 < lines.length && (lines[i + 1].trim().startsWith('Hindi:') || lines[i + 1].trim().startsWith('• Hindi:'))) {
          hinText = lines[i + 1].trim().replace(/^[•\s]*Hindi:\s*/i, '').replace(/^"|"$/g, '').trim();
          i++; // skip hindi line as well
        }

        elements.push(
          <View key={`ex-${i}`} style={[styles.exampleCard, isDark && styles.exampleCardDark]}>
            <View style={styles.exampleHeader}>
              <View style={styles.langPill}>
                <Text style={styles.langPillText}>English</Text>
              </View>
              <Text style={[styles.exampleEngText, isDark && styles.exampleEngTextDark]}>{engText}</Text>
            </View>
            {hinText ? (
              <View style={styles.exampleHindiRow}>
                <View style={[styles.langPill, styles.langPillHindi]}>
                  <Text style={[styles.langPillText, styles.langPillHindiText]}>हिंदी</Text>
                </View>
                <Text style={[styles.exampleHinText, isDark && styles.exampleHinTextDark]}>{hinText}</Text>
              </View>
            ) : null}
          </View>
        );
        i++;
        continue;
      }

      // 6. Bullet Points (- or • or *)
      if (/^[•\-\*]\s/.test(line)) {
        const bulletContent = line.replace(/^[•\-\*]\s*/, '').trim();
        elements.push(
          <View key={`b-${i}`} style={styles.bulletRow}>
            <View style={[styles.bulletDot, isDark && styles.bulletDotDark]} />
            <Text style={styles.bulletTextContent}>
              {renderInlineFormatted(bulletContent, baseTextStyle, boldTextStyle)}
            </Text>
          </View>
        );
        i++;
        continue;
      }

      // 7. Standard Paragraph Text
      elements.push(
        <Text key={`p-${i}`} style={styles.paragraph}>
          {renderInlineFormatted(line, baseTextStyle, boldTextStyle)}
        </Text>
      );
      i++;
    }

    return elements;
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : (isDark ? styles.aiBubbleDark : styles.aiBubble),
        ]}
      >
        <View style={styles.header}>
          <View style={styles.senderRow}>
            {isUser ? (
              <View style={styles.userIconBox}>
                <Ionicons name="person" size={12} color={colors.limeText} />
              </View>
            ) : (
              <View style={styles.aiIconBox}>
                <Ionicons name="sparkles" size={12} color="#059669" />
              </View>
            )}
            <Text
              style={[
                styles.senderName,
                isUser ? styles.userName : (isDark ? styles.aiNameDark : styles.aiName),
              ]}
            >
              {isUser ? 'You' : 'AI Tutor'}
            </Text>
          </View>

          {onCopy && (
            <TouchableOpacity
              onPress={() => onCopy(message.content)}
              style={styles.copyBtn}
              accessibilityLabel="Copy message"
            >
              <Ionicons
                name="copy-outline"
                size={13}
                color={isUser ? 'rgba(255,255,255,0.7)' : colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Content with rich formatting */}
        <View style={styles.contentBody}>{renderFormattedBody()}</View>

        {/* Formula reference button */}
        {message.formulaId && onNavigateFormula && (
          <TouchableOpacity
            style={styles.formulaTag}
            onPress={() => onNavigateFormula(message.formulaId!)}
            accessibilityLabel={`View formula ${message.formulaId}`}
          >
            <Ionicons name="book-outline" size={13} color={colors.foreground} />
            <Text style={styles.formulaTagText}>View Formula #{message.formulaId}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Suggested Follow-Ups */}
      {!isUser && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && onSelectFollowUp && (
        <View style={styles.followUpsWrapper}>
          <Text style={[styles.followUpTitle, isDark && styles.followUpTitleDark]}>
            Suggested Questions:
          </Text>
          <View style={styles.chipsContainer}>
            {message.suggestedFollowUps.map((question, idx) => (
              <TouchableOpacity
                key={`${idx}-${question}`}
                style={[styles.chip, isDark && styles.chipDark]}
                onPress={() => onSelectFollowUp(question)}
              >
                <Ionicons
                  name="arrow-forward"
                  size={12}
                  color={colors.orange}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, isDark && styles.chipTextDark]}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 12,
    width: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radii.xl,
    padding: 14,
    maxWidth: '96%',
    ...shadows.card,
  },
  userBubble: {
    backgroundColor: colors.lime,
    borderBottomRightRadius: radii.xs,
    ...shadows.limeGlow,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: radii.xs,
  },
  aiBubbleDark: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.limeText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.purpleSoft,
    borderWidth: 1,
    borderColor: colors.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
  },
  userName: {
    color: colors.limeText,
    fontWeight: '800',
  },
  aiName: {
    color: '#0F172A',
  },
  aiNameDark: {
    color: colors.purpleLight,
    fontWeight: '800',
  },
  copyBtn: {
    padding: 4,
  },
  contentBody: {
    marginTop: 2,
  },
  userContent: {
    ...typography.body,
    color: colors.limeText,
    fontWeight: '700',
    lineHeight: 22,
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 23,
  },
  aiText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 23,
  },
  aiTextDark: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 23,
  },
  aiBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiBoldDark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  dividerDark: {
    height: 1,
    backgroundColor: colors.darkBorder,
    marginVertical: 10,
  },
  sectionHeaderRow: {
    marginTop: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sectionTitleDark: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  formulaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  formulaBannerDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  formulaBannerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginTop: 9,
    marginRight: 8,
  },
  bulletDotDark: {
    backgroundColor: '#34D399',
  },
  bulletTextContent: {
    flex: 1,
    lineHeight: 22,
  },
  tableCardContainer: {
    marginVertical: 6,
    gap: 8,
  },
  exampleCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.lg,
    padding: 10,
    marginVertical: 4,
  },
  exampleCardDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.darkBorder,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  exampleHindiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  langPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginTop: 2,
  },
  langPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  langPillHindi: {
    backgroundColor: '#E0E7FF',
  },
  langPillHindiText: {
    color: '#3730A3',
  },
  exampleEngText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  exampleEngTextDark: {
    color: '#F8FAFC',
  },
  exampleHinText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  exampleHinTextDark: {
    color: '#94A3B8',
  },
  formulaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  formulaTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  followUpsWrapper: {
    marginTop: 10,
    width: '100%',
  },
  followUpTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    marginBottom: 6,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  followUpTitleDark: {
    color: '#94A3B8',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.dock,
    ...shadows.card,
  },
  chipDark: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chipTextDark: {
    color: '#FFFFFF',
  },
});
