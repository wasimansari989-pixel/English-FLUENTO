import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkService } from '../services/networkService';
import { SyncQueueService } from '../services/syncQueueService';
import { colors } from '../theme';

interface OfflineStatusBannerProps {
  compact?: boolean;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ compact = false }) => {
  const [isOnline, setIsOnline] = useState<boolean>(NetworkService.getIsOnline());
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const wasOfflineRef = useRef<boolean>(false);

  useEffect(() => {
    const unsubscribe = NetworkService.subscribe((online) => {
      if (!online) {
        wasOfflineRef.current = true;
        setDismissed(false);
        setIsOnline(false);
      } else {
        if (wasOfflineRef.current) {
          // Reconnection event
          setShowReconnected(true);
          SyncQueueService.processQueue().catch(() => {});
          setTimeout(() => {
            setShowReconnected(false);
            wasOfflineRef.current = false;
          }, 3500);
        }
        setIsOnline(true);
      }
    });

    return unsubscribe;
  }, []);

  const handleRetry = async () => {
    const connected = await NetworkService.checkConnectivity();
    if (connected) {
      SyncQueueService.processQueue().catch(() => {});
    }
  };

  // If online and not showing the 3-second reconnected toast, or dismissed
  if (isOnline && !showReconnected) {
    return null;
  }

  if (dismissed && !showReconnected) {
    return null;
  }

  // Reconnected Toast
  if (showReconnected) {
    return (
      <View style={[styles.bannerContainer, styles.reconnectedBanner]}>
        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
        <Text style={styles.reconnectedText}>Online • Progress Synced</Text>
      </View>
    );
  }

  // Offline Banner
  return (
    <View style={[styles.bannerContainer, compact && styles.compactBanner]}>
      <View style={styles.leftRow}>
        <Ionicons name="cloud-offline" size={16} color="#F59E0B" />
        <Text style={styles.offlineText}>
          {compact
            ? 'Offline Mode'
            : 'Offline Mode • 600 Formulas & Quizzes Available'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
          <Text style={styles.retryText}>Check</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => setDismissed(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactBanner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  reconnectedBanner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    gap: 6,
  },
  reconnectedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  retryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  closeBtn: {
    padding: 2,
  },
});

