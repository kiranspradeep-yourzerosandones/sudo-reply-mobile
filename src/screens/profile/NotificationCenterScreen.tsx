// sudo-reply-mobile/src/screens/profile/NotificationCenterScreen.tsx (do not remove this comment)
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
  useClearAllNotifications,
  type Notification,
} from '../../hooks/useNotifications';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'NotificationCenter'>;

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  new_message:             { name: 'chatbubble',          color: '#3B82F6' },
  contact_assigned:        { name: 'person-add',          color: '#8B5CF6' },
  conversation_reopened:   { name: 'refresh',             color: '#F59E0B' },
  conversation_reassigned: { name: 'swap-horizontal',     color: '#EC4899' },
  broadcast_completed:     { name: 'megaphone',           color: '#16A34A' },
  template_approved:       { name: 'checkmark-circle',    color: '#16A34A' },
  template_rejected:       { name: 'close-circle',        color: '#DC2626' },
};

const DEFAULT_ICON = { name: 'notifications' as const, color: '#6B7280' };

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ── Skeleton Placeholder Card ──────────────────────────────────────
const SkeletonCard = ({ opacity }: { opacity: Animated.Value }) => (
  <Card style={styles.notifCard}>
    <Animated.View style={[styles.notifRow, { opacity }]}>
      {/* Skeleton Icon Circle */}
      <View style={styles.skeletonIcon} />

      {/* Skeleton Content Lines */}
      <View style={styles.notifContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonMessageLine1} />
        <View style={styles.skeletonMessageLine2} />
        <View style={styles.skeletonTime} />
      </View>
    </Animated.View>
  </Card>
);

export const NotificationCenterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount ?? 0;

  // Pulse animation for the skeleton loader
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isLoading && notifications.length === 0) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }
    return () => animation?.stop();
  }, [isLoading, notifications.length, pulseAnim]);

  const handleTap = (item: Notification) => {
    if (!item.isRead) markRead.mutate(item.id);

    const meta = item.metadata || {};
    if (meta.conversationId) {
      navigation.navigate('Inbox', {
        screen: 'Chat',
        params: {
          conversationId: meta.conversationId,
          contactName: meta.contactName || 'Chat',
          contactId: meta.contactId || '',
        },
      });
    }
  };

  const handleLongPress = (item: Notification) => {
    Alert.alert('Notification', 'Delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOne.mutate(item.id) },
    ]);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearAll.mutate() },
    ]);
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = ICON_MAP[item.type] || DEFAULT_ICON;

    return (
      <TouchableOpacity
        onPress={() => handleTap(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <Card style={[styles.notifCard, !item.isRead && styles.notifUnread]}>
          <View style={styles.notifRow}>
            <View style={[styles.iconCircle, { backgroundColor: icon.color + '18' }]}>
              <Ionicons name={icon.name} size={20} color={icon.color} />
            </View>
            <View style={styles.notifContent}>
              <Text style={styles.notifTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notifMessage} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // Show skeleton if actively loading and no cached data exists
  const isInitialLoading = isLoading && notifications.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header Always Stays Visible ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => markAllRead.mutate()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : notifications.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.markAllBtn}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── Body Content ── */}
      {isInitialLoading ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <SkeletonCard key={key} opacity={pulseAnim} />
          ))}
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="All caught up"
          message="No notifications right now"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lightGrey,
  },
  backBtn: { marginRight: spacing.md },
  headerTitle: { ...typography.h2, color: colors.darkGrey, flex: 1 },
  markAllBtn: { paddingHorizontal: spacing.sm },
  markAllText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  clearAllText: { ...typography.caption, color: '#DC2626', fontWeight: '700' },
  list: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, paddingBottom: spacing.huge },
  notifCard: { marginBottom: spacing.sm },
  notifUnread: { backgroundColor: '#F0F5FF' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  notifContent: { flex: 1 },
  notifTitle: { ...typography.label, color: colors.darkGrey },
  notifMessage: { ...typography.body, color: colors.secondaryGrey, marginTop: 2 },
  notifTime: { ...typography.caption, color: colors.secondaryGrey, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginLeft: spacing.sm,
  },

  // ── Skeleton Loader Styles ──
  skeletonContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: spacing.md,
  },
  skeletonTitle: {
    width: '45%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  skeletonMessageLine1: {
    width: '90%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 5,
  },
  skeletonMessageLine2: {
    width: '65%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  skeletonTime: {
    width: '25%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
});