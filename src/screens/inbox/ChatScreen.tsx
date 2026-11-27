import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme/colors';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useConversationMessages,
  useSendMessage,
  useSendMediaMessage,
  useSendQuickReply,
  useQuickReplies,
  useArchiveConversation,
  useUpdateConversationStatus,
  usePinConversation,
  useConversationByContact,
  useConversationMedia,
  type QuickReply,
} from '../../hooks/useConversations';
import {
  useCheckCallPermission,
  useRequestCallPermission,
  useInitiateWhatsAppCall,
  useTerminateWhatsAppCall,
} from '../../hooks/useWhatsAppCalls';
import { useApprovedTemplates } from '../../hooks/useTemplates';
import { useSendTemplateMessage } from '../../hooks/useMessages';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { socketService } from '../../services/socket';
import { ENDPOINTS } from '../../config/api';
import * as webrtcService from '../../services/webrtcService';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Modular UI Components
import { ChatHeader } from './components/ChatHeader';
import { ChatOptionsMenuModal } from './components/ChatOptionsMenuModal';
import { ChatContactDetailsModal } from './components/ChatContactDetailsModal';
import { ActiveCallBar } from './components/calls/ActiveCallBar';
import { ActiveCallModal } from './components/calls/ActiveCallModal';
import { useCallTimer } from './components/calls/useCallTimer';
import { ArchivedChatBanner } from './components/banners/ArchivedChatBanner';
import { ExpiredWindowBanner } from './components/banners/ExpiredWindowBanner';
import { MessageBubble } from './components/MessageBubble';
import { MessageInput } from './components/MessageInput';
import { AttachMenu } from './components/AttachMenu';
import { TemplatePicker } from './components/TemplatePicker';
import { SlashSuggestions } from './components/SlashSuggestions';
import { MediaPreview } from './components/MediaPreview';
import { QuickReplyChip } from './components/QuickReplyChip';

type Props = NativeStackScreenProps<any, 'Chat'>;
type PendingMedia = { uri: string; name: string; mimeType: string; type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' };
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    conversationId: initialConversationId,
    contactName,
    contactId,
    isArchived: routeIsArchived,
  } = route.params as {
    conversationId: string | null;
    contactName: string;
    contactId: string;
    isArchived?: boolean;
  };

  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [message, setMessage] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showFullCallModal, setShowFullCallModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QuickReply | null>(null);
  const [slashSearch, setSlashSearch] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // ── Call State ──
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const prevMessagesLength = useRef(0);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useConversationMessages(conversationId);
  const { data: conversationData } = useConversationByContact(contactId);
  const { data: mediaList = [] } = useConversationMedia(conversationId);
  const { data: quickReplies = [] } = useQuickReplies();
  const { data: approvedTemplates = [] } = useApprovedTemplates();

  const sendMessage = useSendMessage();
  const sendMedia = useSendMediaMessage();
  const sendQuickReply = useSendQuickReply();
  const archiveMutation = useArchiveConversation();
  const updateStatusMutation = useUpdateConversationStatus();
  const pinMutation = usePinConversation();
  const sendTemplateMutation = useSendTemplateMessage();

  const { refetch: refetchPermission } = useCheckCallPermission(contactId);
  const requestPermissionMutation = useRequestCallPermission();
  const initiateCallMutation = useInitiateWhatsAppCall();
  const terminateCallMutation = useTerminateWhatsAppCall();

  const agentName = useAuthStore((s) => s.user?.name || 'Agent');
  const { formattedTime } = useCallTimer(Boolean(activeCallId), callStatus);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data: contactData } = useQuery({
    queryKey: ['contact-detail', contactId],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.contacts.getById(contactId));
      return data.data?.contact || data.contact || data.data || data;
    },
    enabled: !!contactId,
    staleTime: 60_000,
  });

  const isClosed = useMemo(() => {
    const status = (conversationData?.status || '').toUpperCase();
    return status === 'CLOSED' || status === 'SOLVED';
  }, [conversationData?.status]);

  const isPinned = !!conversationData?.isPinned;
  const isArchived = Boolean(conversationData?.isArchived ?? routeIsArchived);

  const reversedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return [...messages].reverse();
  }, [messages]);

  const isWindowExpired = useMemo(() => {
    if (!conversationId || isLoading) return false;
    const channel = (contactData?.channel || 'WHATSAPP').toUpperCase();
    if (channel !== 'WHATSAPP') return false;

    const inbound = messages.filter((m: any) => m.direction === 'INBOUND' || m.senderType === 'CONTACT');
    if (inbound.length === 0) return messages.length > 0;

    const latest = inbound.reduce((prev: any, curr: any) => {
      return new Date(curr.createdAt).getTime() > new Date(prev.createdAt).getTime() ? curr : prev;
    }, inbound[0]);

    return Date.now() - new Date(latest.createdAt).getTime() > TWENTY_FOUR_HOURS_MS;
  }, [conversationId, isLoading, contactData?.channel, messages]);

  // Clean up WebRTC if user unmounts screen during call
  useEffect(() => {
    return () => {
      webrtcService.endCall();
    };
  }, []);

  // Socket Listener for Live Messages & Call Status / SDP Answers
  useEffect(() => {
    const msgHandler = (data: any) => {
      if (data.conversationId === conversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    };

    const callHandler = (data: any) => {
      if (activeCallId && (data.wacid === activeCallId || data.callId === activeCallId)) {
        const nextStatus = data.status?.toUpperCase();
        setCallStatus(nextStatus);

        // Apply SDP Answer received via socket
        if (data.sdpAnswer) {
          webrtcService.handleRemoteAnswer(data.sdpAnswer);
        }

        if (['COMPLETED', 'REJECTED', 'FAILED', 'MISSED'].includes(nextStatus)) {
          webrtcService.endCall();
          setTimeout(() => {
            setActiveCallId(null);
            setCallStatus(null);
            setShowFullCallModal(false);
          }, 1500);
        }
      }
    };

    socketService.on('message_status_update', msgHandler);
    socketService.on('call_status_update', callHandler);

    return () => {
      socketService.off('message_status_update', msgHandler);
      socketService.off('call_status_update', callHandler);
    };
  }, [conversationId, activeCallId, queryClient]);

  // ── WebRTC Call Initiation Flow ──
  const handleCallPress = async () => {
    const permRes = await refetchPermission();
    if (!permRes.data) {
      Alert.alert(
        'Call Permission Required',
        `Meta requires that ${contactName} grant permission before calling on WhatsApp.\n\nSend a permission request message?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: () => {
              requestPermissionMutation.mutate(
                { contactId },
                {
                  onSuccess: () => Alert.alert('Request Sent', 'Permission request was sent.'),
                  onError: (err: any) =>
                    Alert.alert('Failed', err?.response?.data?.message || 'Failed to send request.'),
                }
              );
            },
          },
        ]
      );
      return;
    }

    Alert.alert('Start WhatsApp Call', `Place a WhatsApp call to ${contactName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: async () => {
          try {
            setCallStatus('DIALING');
            setShowFullCallModal(true);

            // 1. Generate local WebRTC SDP Offer + prime mic/audio
            const sdpOffer = await webrtcService.initiateOutboundCall();

            // 2. Send SDP Offer with Call Initiate API
            initiateCallMutation.mutate(
              { contactId, conversationId, sdpOffer },
              {
                onSuccess: (data: any) => {
                  const wacid = data?.callId || data?.data?.calls?.[0]?.id || data?.wacid;
                  const sdpAnswer = data?.sdpAnswer || data?.data?.sdpAnswer;

                  if (wacid) setActiveCallId(wacid);
                  if (sdpAnswer) {
                    webrtcService.handleRemoteAnswer(sdpAnswer);
                  }
                },
                onError: (err: any) => {
                  webrtcService.endCall();
                  setCallStatus(null);
                  setActiveCallId(null);
                  setShowFullCallModal(false);
                  Alert.alert('Call Failed', err?.response?.data?.message || 'Could not initiate call.');
                },
              }
            );
          } catch (e: any) {
            webrtcService.endCall();
            setCallStatus(null);
            setShowFullCallModal(false);
            Alert.alert('Audio Error', e.message || 'Could not initialize microphone or WebRTC session.');
          }
        },
      },
    ]);
  };

  const handleEndCall = () => {
    webrtcService.endCall();
    if (!activeCallId) {
      setShowFullCallModal(false);
      setCallStatus(null);
      return;
    }
    terminateCallMutation.mutate(
      { wacid: activeCallId },
      {
        onSettled: () => {
          setActiveCallId(null);
          setCallStatus(null);
          setShowFullCallModal(false);
        },
      }
    );
  };

  // Archive & Resolve Handlers
  const handleToggleArchive = () => {
    setShowOptionsMenu(false);
    if (!conversationId) return;
    archiveMutation.mutate(
      { id: conversationId, archive: !isArchived },
      {
        onSuccess: () => {
          if (!isArchived) navigation.goBack();
          else Alert.alert('Unarchived', 'Chat moved back to Inbox.');
        },
      }
    );
  };

  const handleResolveToggle = () => {
    setShowOptionsMenu(false);
    if (!conversationId) return;
    const nextStatus = isClosed ? 'OPEN' : 'CLOSED';
    updateStatusMutation.mutate({ id: conversationId, status: nextStatus });
  };

  // Send Text / Voice / Media
  const handleSendText = useCallback(() => {
    const text = message.trim();
    if (!text || sendMessage.isPending) return;
    setMessage('');
    sendMessage.mutate(
      { contactId, text },
      {
        onSuccess: (data: any) => {
          const newId = data?.data?.conversationId || data?.conversationId;
          if (newId && !conversationId) setConversationId(newId);
        },
      }
    );
  }, [message, contactId, sendMessage, conversationId]);

  const handleSendMedia = useCallback(() => {
    if (!pendingMedia || sendMedia.isPending || !conversationId) return;
    const caption = message.trim() || undefined;
    setPendingMedia(null);
    setMessage('');
    sendMedia.mutate({
      contactId,
      conversationId,
      fileUri: pendingMedia.uri,
      fileName: pendingMedia.name,
      mimeType: pendingMedia.mimeType,
      caption,
    });
  }, [pendingMedia, message, contactId, conversationId, sendMedia]);

  const handleSendVoice = useCallback(
    async (uri: string) => {
      if (!conversationId) return;
      sendMedia.mutate({
        contactId,
        conversationId,
        fileUri: uri,
        fileName: `voice_${Date.now()}.m4a`,
        mimeType: 'audio/mp4',
        isVoiceNote: true,
      });
    },
    [conversationId, contactId, sendMedia]
  );

  const handleSendQuickReply = useCallback(() => {
    if (!selectedQR || sendQuickReply.isPending) return;
    const qr = selectedQR;
    setSelectedQR(null);
    setMessage('');
    sendQuickReply.mutate({ contactId, quickReplyId: qr.id, text: message.trim() || undefined });
  }, [selectedQR, message, contactId, sendQuickReply]);

  const handleSend = () => {
    if (pendingMedia) handleSendMedia();
    else if (selectedQR) handleSendQuickReply();
    else handleSendText();
  };

  const isSending = sendMessage.isPending || sendMedia.isPending || sendQuickReply.isPending;
  const canSend = isSending ? false : pendingMedia || selectedQR ? true : !!message.trim();

  // Media Pickers
  const pickFromCamera = async () => {
    setShowAttachMenu(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setPendingMedia({
        uri: a.uri,
        name: a.fileName || `cam_${Date.now()}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
        type: a.type === 'video' ? 'VIDEO' : 'IMAGE',
      });
    }
  };

  const pickFromGallery = async () => {
    setShowAttachMenu(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setPendingMedia({
        uri: a.uri,
        name: a.fileName || `media_${Date.now()}.jpg`,
        mimeType: a.mimeType || 'image/jpeg',
        type: a.type === 'video' ? 'VIDEO' : 'IMAGE',
      });
    }
  };

  const pickDocument = async () => {
    setShowAttachMenu(false);
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    setPendingMedia({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType || 'application/octet-stream',
      type: 'FILE',
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ChatHeader
        contactName={contactName}
        channel={contactData?.channel}
        agentName={agentName}
        isCallPending={initiateCallMutation.isPending}
        hasActiveCall={!!activeCallId}
        onBack={() => navigation.goBack()}
        onContactPress={() => setShowContactDetails(true)}
        onCallPress={handleCallPress}
        onOptionsPress={() => setShowOptionsMenu(true)}
      />

      {/* Minimized Active Call Banner */}
      {(!!activeCallId || !!callStatus) && (
        <ActiveCallBar
          callStatus={callStatus}
          durationText={formattedTime}
          onPress={() => setShowFullCallModal(true)}
          onEndCall={handleEndCall}
        />
      )}

      {/* Archived Notice */}
      {isArchived && <ArchivedChatBanner onUnarchive={handleToggleArchive} />}

      {/* Message List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : reversedMessages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {conversationId ? 'No messages yet.' : 'Send a message to start chatting!'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          inverted
          keyExtractor={(item, index) => item.id || `msg-${index}`}
          renderItem={({ item, index }) => {
            const isFirstOfDay =
              index === reversedMessages.length - 1 ||
              new Date(item.createdAt).toDateString() !==
                new Date(reversedMessages[index + 1]?.createdAt).toDateString();
            return <MessageBubble item={item} showDateSeparator={isFirstOfDay} />;
          }}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Media & QR Previews */}
      {pendingMedia && <MediaPreview media={pendingMedia} onRemove={() => setPendingMedia(null)} />}
      {selectedQR && !pendingMedia && (
        <QuickReplyChip
          title={selectedQR.title}
          onClear={() => {
            setSelectedQR(null);
            setMessage('');
          }}
        />
      )}
      {slashSearch !== null && (
        <SlashSuggestions
          search={slashSearch}
          quickReplies={quickReplies}
          onSelect={(qr) => {
            setMessage(qr.content || '');
            setSlashSearch(null);
          }}
        />
      )}

      {/* Bottom Input Area */}
      {isWindowExpired ? (
        <ExpiredWindowBanner
          bottomInset={insets.bottom}
          onSelectTemplate={() => setShowTemplatePicker(true)}
        />
      ) : (
        <MessageInput
          message={message}
          onChangeText={(t) => {
            setMessage(t);
            const last = t.split(/\s/).pop() || '';
            setSlashSearch(last.startsWith('/') ? last.slice(1) : null);
          }}
          onSend={handleSend}
          onSendVoice={handleSendVoice}
          onAttach={() => setShowAttachMenu(true)}
          onTemplate={() => setShowTemplatePicker(true)}
          isSending={isSending}
          canSend={canSend}
          hasPendingMedia={!!pendingMedia}
          hasQuickReply={!!selectedQR}
          bottomInset={isKeyboardVisible ? 0 : insets.bottom}
        />
      )}

      {/* Full Screen In-Call Modal with Mute and Speaker Controls */}
      <ActiveCallModal
        visible={showFullCallModal && (!!activeCallId || !!callStatus)}
        contactName={contactName}
        callStatus={callStatus}
        durationText={formattedTime}
        onMinimize={() => setShowFullCallModal(false)}
        onEndCall={handleEndCall}
        onToggleMute={(muted) => webrtcService.muteMic(muted)}
        onToggleSpeaker={(speaker) => webrtcService.setSpeakerphone(speaker)}
      />

      {/* Modals & Sheets */}
      <AttachMenu
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
        onDocument={pickDocument}
      />

      <TemplatePicker
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        templates={approvedTemplates}
        onSend={async (templateId, params) => {
          await sendTemplateMutation.mutateAsync({ contactId, templateId, params });
          setShowTemplatePicker(false);
        }}
        isSending={sendTemplateMutation.isPending}
      />

      <ChatOptionsMenuModal
        visible={showOptionsMenu}
        isClosed={isClosed}
        isArchived={isArchived}
        hasConversation={!!conversationId}
        bottomInset={insets.bottom}
        onClose={() => setShowOptionsMenu(false)}
        onOpenDetails={() => {
          setShowOptionsMenu(false);
          setShowContactDetails(true);
        }}
        onToggleResolve={handleResolveToggle}
        onToggleArchive={handleToggleArchive}
      />

      <ChatContactDetailsModal
        visible={showContactDetails}
        onClose={() => setShowContactDetails(false)}
        contactName={contactName}
        contactData={contactData}
        conversationData={conversationData}
        messages={messages}
        mediaList={mediaList}
        agentName={agentName}
        isPinned={isPinned}
        isPinPending={pinMutation.isPending}
        onTogglePin={() => conversationId && pinMutation.mutate(conversationId)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  messagesContainer: { flex: 1 },
  messagesList: { paddingHorizontal: 14, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 11, color: '#9CA3AF' },
});