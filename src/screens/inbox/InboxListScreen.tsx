import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useAssignedConversations,
  useArchivedConversations,
  useMarkRead,
} from '../../hooks/useConversations';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { InboxHeader } from './components/InboxHeader';
import { InboxSearchBar } from './components/InboxSearchBar';
import { StatusPills, StatusTab } from './components/StatusPills';
import { ChannelFilterSheet, ChannelFilter } from './components/ChannelFilterSheet';
import { ConversationRow } from './components/ConversationRow';

type Props = NativeStackScreenProps<any, 'InboxList'>;

export const InboxListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('');
  const [channel, setChannel] = useState<ChannelFilter>('ALL');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Don't send 'UNREAD' to backend — it's not a real status
  const backendStatus =
    statusTab === 'UNREAD' ? undefined : statusTab || undefined;

  const { data, isLoading, refetch, isRefetching } = useAssignedConversations({
    status: backendStatus,
    channel,
  });

  const {
    data: archivedList = [],
    refetch: refetchArchived,
    isRefetching: isRefetchingArchived,
  } = useArchivedConversations();

  const markRead = useMarkRead();

  const conversations = data?.conversations || [];
  const archivedCount = Array.isArray(archivedList) ? archivedList.length : 0;

  // Derive counts from actual list data so pills always match what's shown
  const counts = useMemo(() => {
    const all = conversations.length;
    const unread = conversations.filter((c: any) => c.unreadCount > 0).length;
    const open = conversations.filter(
      (c: any) => (c.status || '').toUpperCase() === 'OPEN',
    ).length;
    const closed = conversations.filter((c: any) =>
      ['CLOSED', 'SOLVED'].includes((c.status || '').toUpperCase()),
    ).length;
    return { all, unread, open, closed };
  }, [conversations]);

  const filtered = useMemo(() => {
    let result = conversations;

    // Client-side unread filter
    if (statusTab === 'UNREAD') {
      result = result.filter((c: any) => c.unreadCount > 0);
    }

    // Client-side search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c: any) =>
          c.contact?.name?.toLowerCase().includes(q) ||
          c.contact?.phone?.includes(q),
      );
    }

    return result;
  }, [conversations, search, statusTab]);

  const handleRefresh = () => {
    refetch();
    refetchArchived();
  };

  const filterActive = channel !== 'ALL';

  // WhatsApp-style Archived Row
  const renderArchivedRow = () => {
    // Only show if at least 1 chat is archived and not searching
    if (archivedCount === 0 || search.trim().length > 0) return null;

    return (
      <TouchableOpacity
        style={styles.archivedRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ArchivedChats')}
      >
        <View style={styles.archivedLeft}>
          <View style={styles.archivedIconContainer}>
            <Ionicons name="archive-outline" size={18} color={colors.secondaryGrey} />
          </View>
          <Text style={styles.archivedTitle}>Archived</Text>
        </View>

        <View style={styles.archivedBadge}>
          <Text style={styles.archivedBadgeText}>{archivedCount}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <InboxHeader
        onBellPress={() => navigation.navigate('Profile', { screen: 'NotificationCenter' })}
      />

      <InboxSearchBar
        value={search}
        onChange={setSearch}
        onFilterPress={() => setSheetOpen(true)}
        filterActive={filterActive}
      />

      <StatusPills active={statusTab} onChange={setStatusTab} counts={counts} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderArchivedRow}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations"
              message={
                statusTab === 'UNREAD'
                  ? 'All caught up! No unread messages'
                  : search
                    ? 'No results match your search'
                    : 'Assigned conversations will appear here'
              }
            />
          }
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => {
                if (item.unreadCount > 0) markRead.mutate(item.id);
                navigation.navigate('Chat', {
                  conversationId: item.id,
                  contactName: item.contact?.name || 'Unknown',
                  contactId: item.contactId,
                });
              }}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isRefetchingArchived}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ChannelFilterSheet
        visible={sheetOpen}
        active={channel}
        onSelect={setChannel}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // WhatsApp-style Archived row styles
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    marginBottom: spacing.xs,
  },
  archivedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  archivedIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryGrey,
  },
  archivedBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  archivedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryGrey,
  },
});