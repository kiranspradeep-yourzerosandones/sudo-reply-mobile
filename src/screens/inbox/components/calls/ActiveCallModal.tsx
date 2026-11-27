import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../../components/ui/Avatar';
import { colors } from '../../../../theme/colors';

interface ActiveCallModalProps {
  visible: boolean;
  contactName: string;
  callStatus: string | null;
  durationText: string;
  onMinimize: () => void;
  onEndCall: () => void;
  onToggleMute?: (muted: boolean) => void;
  onToggleSpeaker?: (speaker: boolean) => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  visible,
  contactName,
  callStatus,
  durationText,
  onMinimize,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
}) => {
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const handleMuteToggle = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    onToggleMute?.(nextState);
  };

  const handleSpeakerToggle = () => {
    const nextState = !isSpeakerOn;
    setIsSpeakerOn(nextState);
    onToggleSpeaker?.(nextState);
  };

  if (!visible) return null;

  const isConnected =
    callStatus === 'ACCEPTED' || callStatus === 'CONNECTED' || callStatus === 'IN_PROGRESS';

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        {/* Top Bar with Minimize */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onMinimize} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.encryptionBadge}>
            <Ionicons name="lock-closed" size={12} color="#94A3B8" />
            <Text style={styles.encryptionText}>End-to-end encrypted</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Contact Info & Waveform */}
        <View style={styles.contactSection}>
          <View style={styles.avatarWrap}>
            <Avatar name={contactName} size={96} />
            {isConnected && <View style={styles.livePulseRing} />}
          </View>
          <Text style={styles.contactName}>{contactName}</Text>
          <Text style={styles.statusText}>
            {isConnected ? durationText : callStatus || 'DIALING...'}
          </Text>
        </View>

        {/* Controls Grid */}
        <View style={styles.controlsSection}>
          <View style={styles.controlsRow}>
            {/* Speaker Toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
              onPress={handleSpeakerToggle}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSpeakerOn ? 'volume-high' : 'volume-medium-outline'}
                size={28}
                color={isSpeakerOn ? '#0F172A' : '#FFFFFF'}
              />
              <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
                Speaker
              </Text>
            </TouchableOpacity>

            {/* Mute Toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={handleMuteToggle}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={28}
                color={isMuted ? '#EF4444' : '#FFFFFF'}
              />
              <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
                {isMuted ? 'Muted' : 'Mute'}
              </Text>
            </TouchableOpacity>

            {/* Chat / Minimize */}
            <TouchableOpacity style={styles.controlBtn} onPress={onMinimize} activeOpacity={0.8}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* End Call Button */}
          <TouchableOpacity style={styles.endCallCircle} onPress={onEndCall} activeOpacity={0.85}>
            <Ionicons
              name="call"
              size={34}
              color="#FFFFFF"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  encryptionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  contactSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  livePulseRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#34D399',
    fontWeight: '600',
  },
  controlsSection: {
    alignItems: 'center',
    gap: 36,
    marginBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  controlBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  controlLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 8,
    position: 'absolute',
    bottom: -22,
  },
  controlLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  endCallCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});