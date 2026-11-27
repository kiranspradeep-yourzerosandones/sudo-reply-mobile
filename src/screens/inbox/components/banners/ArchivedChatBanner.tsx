import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';

interface ArchivedChatBannerProps {
  onUnarchive: () => void;
}

export const ArchivedChatBanner: React.FC<ArchivedChatBannerProps> = ({ onUnarchive }) => {
  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Ionicons name="archive" size={16} color="#64748B" />
        <Text style={styles.text}>This conversation is archived</Text>
      </View>
      <TouchableOpacity onPress={onUnarchive} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.btnText}>Unarchive</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 13, color: '#475569', fontWeight: '500' },
  btnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});