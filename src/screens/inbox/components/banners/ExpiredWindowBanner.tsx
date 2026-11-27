import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';

interface ExpiredWindowBannerProps {
  bottomInset: number;
  onSelectTemplate: () => void;
}

export const ExpiredWindowBanner: React.FC<ExpiredWindowBannerProps> = ({
  bottomInset,
  onSelectTemplate,
}) => {
  return (
    <View style={[styles.banner, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.row}>
        <Ionicons name="time-outline" size={20} color="#D97706" style={styles.icon} />
        <Text style={styles.text}>
          It has been more than 24 hours since customer messaged. You can only respond using a Template.
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onSelectTemplate} activeOpacity={0.8}>
        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>Select Template</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFFBEB',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  icon: { marginRight: 8, marginTop: 1 },
  text: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#92400E', fontWeight: '500' },
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});