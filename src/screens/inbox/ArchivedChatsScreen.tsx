import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConversationRow } from './components/ConversationRow';
import {
  useArchivedConversations,
  useArchiveConversation,
  useMarkRead,
} from '../../hooks/useConversations';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'ArchivedChats'>;

export const ArchivedChatsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { data: archivedList = [], isLoading, refetch, isRefetching } = useArchivedConversations();
  const archiveMutation = useArchiveConversation();
  const markRead = useMarkRead();

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return archivedList;
    const q = search.toLowerCase();
    return archivedList.filter(
      (c: any) =>
        c.contact?.name?.toLowerCase().includes(q) ||
        c.contact?.phone?.includes(q)
    );
  }, [archivedList, search]);

  const handleUnarchive = (item: any) => {
    const contactName = item.contact?.name || 'this conversation';
    Alert.alert(
      'Unarchive Chat',
      `Move conversation with ${contactName} back to Inbox?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: () => {
            archiveMutation.mutate(
              { id: item.id, archive: false },
              {
                onSuccess: () => {
                  // If all archived chats are now restored, automatically go back
                  if (archivedList.length <= 1) {
                    navigation.goBack();
                  }
                },
              }
            );
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.secondaryGrey} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archived Chats</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{archivedList.length}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="archive-outline"
          title="No archived chats"
          message="Conversations you archive will be kept here"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.rowWrapper}>
              <View style={styles.rowMain}>
                <ConversationRow
                  item={item}
                  onPress={() => {
                    if (item.unreadCount > 0) markRead.mutate(item.id);
                    navigation.navigate('Chat', {
                      conversationId: item.id,
                      contactName: item.contact?.name || 'Unknown',
                      contactId: item.contactId,
                      isArchived: true,
                    });
                  }}
                />
              </View>

              {/* Quick Unarchive Action Button */}
              <TouchableOpacity
                style={styles.unarchiveActionBtn}
                onPress={() => handleUnarchive(item)}
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                activeOpacity={0.6}
              >
                <Ionicons name="arrow-up-circle-outline" size={22} color={colors.primary} />
                <Text style={styles.unarchiveBtnText}>Unarchive</Text>
              </TouchableOpacity>
            </View>
          )}
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
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lightGrey,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondaryGrey,
  },
  badgeContainer: {
    marginLeft: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryGrey,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.huge,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowMain: {
    flex: 1,
  },
  unarchiveActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: 2,
  },
  unarchiveBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
});