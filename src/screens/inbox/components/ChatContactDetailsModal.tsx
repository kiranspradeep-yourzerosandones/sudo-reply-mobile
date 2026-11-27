// src/screens/inbox/components/ChatContactDetailsModal.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { Avatar } from '../../../components/ui/Avatar';
import { PlatformBadge } from '../../../components/ui/PlatformBadge';
import { resolveMediaUrl } from './bubbles/bubbleUtils';

interface ChatContactDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  contactName: string;
  contactData: any;
  conversationData: any;
  messages: any[];
  mediaList: any[];
  agentName: string;
  isPinned: boolean;
  isPinPending: boolean;
  onTogglePin: () => void;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const ChatContactDetailsModal: React.FC<ChatContactDetailsModalProps> = ({
  visible,
  onClose,
  contactName,
  contactData,
  conversationData,
  messages,
  mediaList,
  agentName,
  isPinned,
  isPinPending,
  onTogglePin,
}) => {
  const insets = useSafeAreaInsets();
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // Combine API media list or fallback to media messages in chat
  const allMediaItems = useMemo(() => {
    if (Array.isArray(mediaList) && mediaList.length > 0) return mediaList;
    return (messages || []).filter(
      (m: any) =>
        ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'].includes(String(m.type || '').toUpperCase()) &&
        m.mediaUrl
    );
  }, [mediaList, messages]);

  // Calls & Recordings info from contactData or conversationData
  const callsList = useMemo(() => {
    return (
      contactData?.calls ||
      conversationData?.calls ||
      (messages || []).filter((m: any) => String(m.type || '').toUpperCase() === 'CALL') ||
      []
    );
  }, [contactData, conversationData, messages]);

  const latestCallStatus = useMemo(() => {
    if (contactData?.latestCallStatus) return contactData.latestCallStatus;
    if (callsList.length > 0) {
      return (callsList[0]?.status || 'COMPLETED').toUpperCase();
    }
    return null;
  }, [contactData, callsList]);

  const tags: any[] = contactData?.tags || [];

  const createdDate = formatDate(contactData?.createdAt || conversationData?.createdAt);
  const lastActivityDate = formatDate(
    conversationData?.updatedAt ||
      messages?.[messages.length - 1]?.createdAt ||
      contactData?.updatedAt
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Details</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 24, 32) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Profile Card ── */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Avatar name={contactName || contactData?.name || 'U'} size={72} />
              <PlatformBadge channel={contactData?.channel || 'WHATSAPP'} />
            </View>
            <Text style={styles.profileName}>{contactName || contactData?.name || 'Unknown'}</Text>
            <Text style={styles.profileSub}>
              {contactData?.phone || 'No phone'} • {contactData?.channel || 'WhatsApp'}
            </Text>
          </View>

          {/* ── Media, links and docs ── */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              onPress={() => allMediaItems.length > 0 && setShowMediaGallery(!showMediaGallery)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="images-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.cardTitle}>Media, links and docs</Text>
              </View>
              <View style={styles.rowRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{allMediaItems.length}</Text>
                </View>
                <Ionicons
                  name={showMediaGallery ? 'chevron-up' : 'chevron-forward'}
                  size={18}
                  color="#94A3B8"
                />
              </View>
            </TouchableOpacity>

            {showMediaGallery && allMediaItems.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.mediaStrip}
              >
                {allMediaItems.slice(0, 12).map((item: any, idx: number) => {
                  const url = resolveMediaUrl(item.mediaUrl || item.url);
                  const isImg = String(item.type || '').toUpperCase() === 'IMAGE';
                  return (
                    <TouchableOpacity
                      key={item.id || idx}
                      style={styles.mediaThumbWrap}
                      onPress={() => url && Linking.openURL(url)}
                    >
                      {isImg && url ? (
                        <Image source={{ uri: url }} style={styles.mediaThumb} />
                      ) : (
                        <View style={styles.mediaDocThumb}>
                          <Ionicons
                            name={
                              item.type === 'AUDIO'
                                ? 'mic-outline'
                                : item.type === 'VIDEO'
                                  ? 'videocam-outline'
                                  : 'document-text-outline'
                            }
                            size={22}
                            color="#2563EB"
                          />
                          <Text style={styles.mediaDocType} numberOfLines={1}>
                            {item.type || 'FILE'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Calls & Recordings ── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="call-outline" size={18} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Calls & Recordings</Text>
                  {latestCallStatus ? (
                    <Text style={styles.subStatusText}>
                      Latest:{' '}
                      <Text
                        style={{
                          color: latestCallStatus === 'REJECTED' ? '#EF4444' : '#64748B',
                          fontWeight: '700',
                        }}
                      >
                        {latestCallStatus}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.subStatusText}>No call recordings yet</Text>
                  )}
                </View>
              </View>
              <View style={styles.rowRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{callsList.length}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Contact Info ── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Contact Info</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <TouchableOpacity
                onPress={() => contactData?.phone && Linking.openURL(`tel:${contactData.phone}`)}
              >
                <Text style={[styles.infoValue, { color: colors.primary }]}>
                  {contactData?.phone || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{contactData?.email || 'N/A'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Company</Text>
              <Text style={styles.infoValue}>{contactData?.company || 'N/A'}</Text>
            </View>
          </View>

          {/* ── Chat Pin & Agent ── */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chat Pin</Text>
              <TouchableOpacity
                style={[styles.pinBtn, isPinned && styles.pinBtnActive]}
                onPress={onTogglePin}
                disabled={isPinPending}
              >
                {isPinPending ? (
                  <ActivityIndicator size="small" color={isPinned ? '#FFFFFF' : colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isPinned ? 'pricetag' : 'pricetag-outline'}
                      size={14}
                      color={isPinned ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[styles.pinBtnText, isPinned && styles.pinBtnTextActive]}>
                      {isPinned ? 'Pinned' : 'Pin Chat'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Agent</Text>
              <View style={styles.assignedBadge}>
                <View style={styles.assignedDot} />
                <Text style={styles.assignedText}>
                  {agentName ? `Assigned (${agentName})` : 'Assigned'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Tags ── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Tags</Text>
            {tags.length === 0 ? (
              <Text style={styles.emptyMetaText}>No tags</Text>
            ) : (
              <View style={styles.tagsWrap}>
                {tags.map((t: any, index: number) => {
                  const tagName = typeof t === 'string' ? t : t.name || t.tag?.name || 'Tag';
                  const tagColor = t.color || t.tag?.color || '#DBEAFE';
                  return (
                    <View
                      key={t.id || index}
                      style={[styles.tagChip, { backgroundColor: tagColor + '25' }]}
                    >
                      <Text style={styles.tagChipText}>{tagName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Session ── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Session</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created</Text>
              <Text style={styles.infoValue}>{createdDate}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Activity</Text>
              <Text style={styles.infoValue}>{lastActivityDate}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 58,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  subStatusText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  mediaStrip: {
    marginTop: 14,
  },
  mediaThumbWrap: {
    marginRight: 10,
  },
  mediaThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  mediaDocThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  mediaDocType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pinBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pinBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  pinBtnTextActive: {
    color: '#FFFFFF',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  assignedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  assignedText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#065F46',
  },
  emptyMetaText: {
    fontSize: 13.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  tagChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E40AF',
  },
});