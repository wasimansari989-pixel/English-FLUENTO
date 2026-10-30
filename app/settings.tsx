import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getBackendUrl, setBackendUrl, AIClient } from '../src/services/aiClient';
import { ProgressRepository } from '../src/database/progressRepository';
import { BookmarkRepository } from '../src/database/bookmarkRepository';
import { UserProfileRepository, UserOnboardingProfile, defaultUserProfile } from '../src/database/userProfileRepository';
import { colors, spacing, typography, radii, shadows } from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserOnboardingProfile>(defaultUserProfile);
  const [backendUrl, setUrl] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hindiEnabled, setHindiEnabled] = useState(true);
  const [highlightEnabled, setHighlightEnabled] = useState(true);

  useEffect(() => {
    UserProfileRepository.getProfile().then(setProfile);
    getBackendUrl().then((url) => {
      setUrl(url);
      checkStatus(url);
    });
  }, []);

  const checkStatus = async (urlToCheck?: string) => {
    setChecking(true);
    try {
      const st = await AIClient.getStatus();
      setStatus(st);
    } catch {
      setStatus({ status: 'offline', remainingToday: 10, dailyLimit: 10 });
    } finally {
      setChecking(false);
    }
  };

  const handleSaveUrl = async () => {
    await setBackendUrl(backendUrl);
    Alert.alert('Settings Saved', 'Backend server URL has been updated.');
    checkStatus(backendUrl);
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Local Data',
      'This will delete all saved bookmarks, recently viewed formulas, and quiz learning progress. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await ProgressRepository.resetProgress();
            await BookmarkRepository.clearBookmarks();
            Alert.alert('Cleared', 'All local data has been reset.');
          },
        },
      ]
    );
  };

  const isConnected = status && status.status === 'ok';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>SETTINGS</Text>
        <Text style={styles.screenSubtitle}>Preferences & Engine Status</Text>
      </View>

      {/* Fluent Profile & Placement */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="person-outline" size={18} color="#111114" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Learning Profile</Text>
            <Text style={styles.cardSubtitle}>Level & Preferences</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{profile.level || 'Beginner'}</Text>
          </View>
        </View>

        <View style={styles.statusBox}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Country / Region:</Text>
            <Text style={styles.metricValue}>{profile.countryName || 'India'} ({profile.callingCode || '+91'})</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>App Language:</Text>
            <Text style={styles.metricValue}>{profile.language || 'Hindi'}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Daily Goal:</Text>
            <Text style={styles.metricValue}>{profile.dailyGoalMinutes || 10} minutes/day</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Daily Reminders:</Text>
            <Text style={styles.metricValue}>
              {profile.remindersEnabled
                ? `Enabled (${profile.reminderTime || '7:00 PM'})`
                : 'Off'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => router.push('/onboarding')}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-circle-outline" size={20} color="#171717" />
          <Text style={styles.retakeBtnText}>Retake Onboarding & Level Check</Text>
        </TouchableOpacity>
      </View>

      {/* AI Assistant Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="sparkles" size={18} color={colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>AI Teacher Status</Text>
            <Text style={styles.cardSubtitle}>Smart Spoken English Assistance</Text>
          </View>
          <TouchableOpacity
            onPress={() => checkStatus(backendUrl)}
            style={styles.refreshIconBtn}
            disabled={checking}
            accessibilityLabel="Refresh Status"
          >
            {checking ? (
              <ActivityIndicator size="small" color={colors.lime} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statusBox}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isConnected ? colors.lime : '#F59E0B' },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'Active & Ready' : 'Offline Learning Ready'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Daily AI Allowance:</Text>
            <Text style={styles.metricValue}>
              {status?.remainingToday ?? 10} / {status?.dailyLimit ?? 10} questions remaining
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Offline Library:</Text>
            <Text style={styles.metricValue}>All 600 Formulas Available Offline</Text>
          </View>
        </View>
      </View>

      {/* Learning Preferences */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="book-outline" size={18} color={colors.lime} />
          </View>
          <Text style={styles.cardTitle}>Learning Preferences</Text>
        </View>

        <View style={styles.prefRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.prefTitle}>Hindi Explanations</Text>
            <Text style={styles.prefDesc}>Show natural Hindi meanings and grammar notes</Text>
          </View>
          <Switch
            value={hindiEnabled}
            onValueChange={setHindiEnabled}
            trackColor={{ false: '#D1D5DB', true: colors.lime }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.prefTitle}>Red Formula Highlighting</Text>
            <Text style={styles.prefDesc}>Highlight key formula phrases in red for easy learning</Text>
          </View>
          <Switch
            value={highlightEnabled}
            onValueChange={setHighlightEnabled}
            trackColor={{ false: '#D1D5DB', true: colors.lime }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Reset & Privacy */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#111114" />
          </View>
          <Text style={styles.cardTitle}>Data & Privacy</Text>
        </View>

        <Text style={styles.privacyDesc}>
          All formula progress, bookmarks, and local search queries are stored strictly on your device. You can reset all personal records anytime.
        </Text>

        <TouchableOpacity style={styles.clearBtn} onPress={handleClearAllData} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
          <Text style={styles.clearBtnText}>Clear All Local Data & Bookmarks</Text>
        </TouchableOpacity>
      </View>

      {/* About App */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="information-circle-outline" size={18} color={colors.foreground} />
          </View>
          <Text style={styles.cardTitle}>About English Formula 600</Text>
        </View>
        <Text style={styles.aboutText}>
          Version 1.0.0
          {'\n'}Complete Spoken English Course with 600 sentence structures, 3,000 verified Hindi-English example sentences, synchronized phrase highlights, and AI teacher support.
        </Text>
      </View>

      {/* Advanced / Developer Options (Collapsible, default collapsed) */}
      <View style={styles.advancedCard}>
        <TouchableOpacity
          style={styles.advancedHeader}
          onPress={() => setShowAdvanced(!showAdvanced)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.advancedTitle}>Server Connection Settings</Text>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.secondaryText}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedBody}>
            <Text style={styles.label}>Server URL:</Text>
            <TextInput
              style={styles.input}
              value={backendUrl}
              onChangeText={setUrl}
              placeholder="http://192.168.1.5:3001"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => checkStatus(backendUrl)}
                activeOpacity={0.85}
              >
                <Text style={styles.checkBtnText}>Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E5EB',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  screenHeader: {
    marginBottom: spacing.lg,
  },
  screenTitle: {
    ...typography.antonHero,
    fontSize: 34,
    lineHeight: 38,
    color: '#111114',
    letterSpacing: -1.2,
  },
  screenSubtitle: {
    color: '#6B7280',
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.h3,
    color: '#111114',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 1,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: radii.full,
    backgroundColor: '#F3F4F6',
  },
  statusBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '800',
    color: '#111114',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricLabel: {
    ...typography.caption,
    color: '#6B7280',
  },
  metricValue: {
    ...typography.caption,
    fontWeight: '700',
    color: '#111114',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  prefTitle: {
    ...typography.body,
    fontWeight: '700',
    color: '#111114',
  },
  prefDesc: {
    ...typography.caption,
    color: '#6B7280',
    marginTop: 2,
  },
  privacyDesc: {
    marginBottom: spacing.md,
    lineHeight: 18,
    color: '#6B7280',
    fontSize: 13,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: radii.dock,
  },
  clearBtnText: {
    ...typography.buttonSmall,
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  aboutText: {
    ...typography.caption,
    color: '#6B7280',
    lineHeight: 18,
  },
  advancedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  advancedTitle: {
    ...typography.caption,
    color: '#6B7280',
    fontWeight: '700',
  },
  advancedBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: '#6B7280',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    height: 44,
    ...typography.body,
    fontSize: 13,
    color: '#111114',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.dock,
  },
  saveBtnText: {
    ...typography.buttonSmall,
    color: '#0A0A0A',
    fontWeight: '900',
    fontSize: 12,
  },
  checkBtn: {
    backgroundColor: '#F3F4F6',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.dock,
  },
  checkBtnText: {
    ...typography.buttonSmall,
    color: '#111114',
    fontSize: 12,
    fontWeight: '700',
  },
  profileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.lime,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0A0A0A',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: spacing.md,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#171717',
  },
});
