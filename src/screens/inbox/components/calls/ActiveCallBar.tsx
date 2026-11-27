import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActiveCallBarProps {
  callStatus: string | null;
  durationText: string;
  onPress: () => void;
  onEndCall: () => void;
}

export const ActiveCallBar: React.FC<ActiveCallBarProps> = ({
  callStatus,
  durationText,
  onPress,
  onEndCall,
}) => {
  const isConnected =
    callStatus === 'ACCEPTED' || callStatus === 'CONNECTED' || callStatus === 'IN_PROGRESS';

  return (
    <TouchableOpacity style={styles.bar} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.left}>
        <View style={styles.pulseDot} />
        <Text style={styles.text}>
          WhatsApp Call • {isConnected ? durationText : callStatus || 'DIALING...'}
        </Text>
      </View>
      <TouchableOpacity style={styles.endBtn} onPress={onEndCall} activeOpacity={0.8}>
        <Ionicons name="call" size={14} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        <Text style={styles.endText}>End</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#064E3B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
  },
  text: {
    color: '#ECFDF5',
    fontSize: 13,
    fontWeight: '700',
  },
  endBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  endText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});