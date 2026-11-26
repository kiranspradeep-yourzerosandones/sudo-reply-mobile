// src/screens/inbox/components/MessageInput.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../../theme';

// Mono channel recording preset required for WhatsApp PTT voice notes
const VOICE_RECORDING_PRESET: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1, // Mono channel required for PTT
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1, // Mono channel required for PTT
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

interface MessageInputProps {
  onSendMessage?: (text: string) => void;
  onSend?: () => void;
  onSendMedia?: (file: { uri: string; name: string; mimeType: string }) => void;
  onSendVoice?: (uri: string, durationMs: number) => void;
  onAttach?: () => void;
  onTemplate?: () => void;
  isSending?: boolean;
  canSend?: boolean;
  hasPendingMedia?: boolean;
  hasQuickReply?: boolean;
  message?: string;
  onChangeMessage?: (text: string) => void;
  onChangeText?: (text: string) => void;
  bottomInset?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSend,
  onSendMedia,
  onSendVoice,
  onAttach,
  onTemplate,
  isSending = false,
  canSend,
  hasPendingMedia = false,
  hasQuickReply = false,
  message: externalMessage,
  onChangeMessage,
  onChangeText,
  bottomInset = 0,
}) => {
  const [internalMessage, setInternalMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const message = externalMessage !== undefined ? externalMessage : internalMessage;

  const setMessage = (text: string) => {
    if (onChangeText) onChangeText(text);
    if (onChangeMessage) onChangeMessage(text);
    if (!onChangeText && !onChangeMessage) setInternalMessage(text);
  };

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const isPreparingRef = useRef<boolean>(false);
  const stopRequestedRef = useRef<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop?.stop();
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (isPreparingRef.current || isRecording) return;
    isPreparingRef.current = true;
    stopRequestedRef.current = false;

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        isPreparingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      }

      const { recording } = await Audio.Recording.createAsync(VOICE_RECORDING_PRESET);

      if (stopRequestedRef.current) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 400));
          await recording.stopAndUnloadAsync();
        } catch {}
        isPreparingRef.current = false;
        return;
      }

      recordingRef.current = recording;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      durationTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      // Ignored cleanly
    } finally {
      isPreparingRef.current = false;
    }
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    stopRequestedRef.current = true;

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);

    if (!recording) return;

    try {
      const elapsed = Date.now() - recordingStartTimeRef.current;
      if (elapsed < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri && elapsed >= 600 && onSendVoice) {
        onSendVoice(uri, elapsed);
      }
    } catch {
      // Caught cleanly for brief taps
    }
  }, [onSendVoice]);

  const handleSend = () => {
    if (onSend) {
      onSend();
      return;
    }
    if (!message.trim() || isSending) return;
    if (onSendMessage) {
      onSendMessage(message);
    }
    setMessage('');
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (onSendMedia) {
          onSendMedia({
            uri: file.uri,
            name: file.name,
            mimeType: file.mimeType || 'application/octet-stream',
          });
        }
      }
    } catch {}
  };

  const handleAttachPress = () => {
    if (onAttach) {
      onAttach();
    } else {
      handlePickDocument();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const hasTextOrContent = !!message.trim() || hasPendingMedia || hasQuickReply;
  const isSendDisabled = isSending || (canSend !== undefined ? !canSend : false);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 8) }]}>
      {isRecording ? (
        <View style={styles.recordingContainer}>
          <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
          <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
          <Text style={styles.recordingHint}>Release to send</Text>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachPress}
            disabled={isSending}
          >
            <Ionicons name="attach-outline" size={24} color={colors.secondaryGrey} />
          </TouchableOpacity>

          {onTemplate && (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={onTemplate}
              disabled={isSending}
            >
              <Ionicons name="document-text-outline" size={22} color={colors.secondaryGrey} />
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.secondaryGrey}
            multiline
            maxLength={4096}
            editable={!isSending}
          />
        </View>
      )}

      {hasTextOrContent ? (
        <TouchableOpacity
          style={[styles.sendButton, isSendDisabled && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSendDisabled}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lightGrey,
    gap: 8,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 8,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.lightGrey,
  },
  attachButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.darkGrey,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { maxHeight: 100 },
      android: { maxHeight: 100 },
    }),
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    gap: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
  },
  recordingHint: {
    fontSize: 13,
    color: '#B91C1C',
    marginLeft: 'auto',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.15 }],
  },
});