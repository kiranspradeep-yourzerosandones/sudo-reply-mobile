import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';

interface ChatOptionsMenuModalProps {
  visible: boolean;
  isClosed: boolean;
  isArchived: boolean;
  hasConversation: boolean;
  bottomInset: number;
  onClose: () => void;
  onOpenDetails: () => void;
  onToggleResolve: () => void;
  onToggleArchive: () => void;
}

export const ChatOptionsMenuModal: React.FC<ChatOptionsMenuModalProps> = ({
  visible,
  isClosed,
  isArchived,
  hasConversation,
  bottomInset,
  onClose,
  onOpenDetails,
  onToggleResolve,
  onToggleArchive,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 20) }]}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.item} onPress={onOpenDetails}>
            <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.itemText}>Contact Details</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {hasConversation && (
            <TouchableOpacity style={styles.item} onPress={onToggleResolve}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isClosed ? '#FEF3C7' : '#ECFDF5' },
                ]}
              >
                <Ionicons
                  name={isClosed ? 'refresh-outline' : 'checkmark-done-circle-outline'}
                  size={20}
                  color={isClosed ? '#D97706' : '#10B981'}
                />
              </View>
              <Text style={styles.itemText}>{isClosed ? 'Reopen Chat' : 'Resolve Chat'}</Text>
            </TouchableOpacity>
          )}

          {hasConversation && (
            <TouchableOpacity style={styles.item} onPress={onToggleArchive}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isArchived ? '#EFF6FF' : '#FEF2F2' },
                ]}
              >
                <Ionicons
                  name={isArchived ? 'arrow-up-circle-outline' : 'archive-outline'}
                  size={20}
                  color={isArchived ? colors.primary : '#EF4444'}
                />
              </View>
              <Text
                style={[
                  styles.itemText,
                  { color: isArchived ? colors.primary : '#EF4444' },
                ]}
              >
                {isArchived ? 'Unarchive Chat' : 'Archive Chat'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
});