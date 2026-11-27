import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../components/ui/Avatar';
import { PlatformBadge } from '../../../components/ui/PlatformBadge';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

interface ChatHeaderProps {
  contactName: string;
  channel?: string;
  agentName: string;
  isCallPending: boolean;
  hasActiveCall: boolean;
  onBack: () => void;
  onContactPress: () => void;
  onCallPress: () => void;
  onOptionsPress: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  contactName,
  channel,
  agentName,
  isCallPending,
  hasActiveCall,
  onBack,
  onContactPress,
  onCallPress,
  onOptionsPress,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7} onPress={onContactPress}>
        <View style={styles.avatarWrap}>
          <Avatar name={contactName} size={40} />
          <PlatformBadge channel={channel} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {contactName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            via {channel || 'WhatsApp'} • {agentName}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={onCallPress}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
          style={styles.iconBtn}
          activeOpacity={0.7}
          disabled={isCallPending || hasActiveCall}
        >
          {isCallPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="call-outline"
              size={21}
              color={hasActiveCall ? '#10B981' : colors.darkGrey}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOptionsPress}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.darkGrey} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGrey,
  },
  backButton: { marginRight: 10 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative', width: 40, height: 40, marginRight: 12 },
  headerTextWrap: { flex: 1, justifyContent: 'center' },
  headerTitle: { ...typography.label, color: colors.darkGrey },
  headerSubtitle: { ...typography.bodySmall, color: colors.secondaryGrey, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBtn: { padding: 4, alignItems: 'center', justifyContent: 'center' },
});