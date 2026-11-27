import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let pendingRemoteAnswer: string | null = null;

// Wait for ICE candidates (host, srflx) to be gathered into localDescription.sdp
const waitForIceGathering = (pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> => {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      return resolve();
    }
    const onStateChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onStateChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onStateChange);
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onStateChange);
      resolve();
    }, timeoutMs);
  });
};

/**
 * Initiates an outbound WebRTC call session (matches tenant-web)
 * Returns the SDP offer string to be sent with initiate API
 */
export const initiateOutboundCall = async (): Promise<string> => {
  endCall();

  // Start InCall audio session (manages mic & earpiece/speaker)
  InCallManager.start({ media: 'audio', auto: true, ringback: '_BUNDLE_' });
  InCallManager.setForceSpeakerphoneOn(false); // default to earpiece

  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });
  peerConnection = pc;

  // 1. Get user microphone stream
  const stream = (await mediaDevices.getUserMedia({
    audio: true,
    video: false,
  })) as MediaStream;

  localStream = stream;
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });

  // 2. Setup remote audio track handler
  pc.ontrack = (event: any) => {
    console.log('🔊 [Mobile-WebRTC] Remote track received from Meta:', event.track);
    remoteStream = event.streams[0] || new MediaStream([event.track]);
    InCallManager.stopRingback();
  };

  pc.oniceconnectionstatechange = () => {
    console.log('🌐 [Mobile-WebRTC] ICE Connection State:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      InCallManager.stopRingback();
    }
  };

  // 3. Create Offer
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  });
  await pc.setLocalDescription(offer);

  // 4. Wait for ICE candidate gathering to generate complete SDP
  await waitForIceGathering(pc);

  console.log('✅ [Mobile-WebRTC] Outbound SDP Offer ready for Meta');

  if (pendingRemoteAnswer) {
    const ans = pendingRemoteAnswer;
    pendingRemoteAnswer = null;
    await handleRemoteAnswer(ans);
  }

  return (pc.localDescription as any)?.sdp || '';
};

/**
 * Handles SDP Answer returned by Meta via REST API response or Socket
 */
export const handleRemoteAnswer = async (sdpAnswer: string) => {
  if (!sdpAnswer) return;
  if (!peerConnection) {
    console.log('⏳ [Mobile-WebRTC] PeerConnection not initialized yet, caching remote answer');
    pendingRemoteAnswer = sdpAnswer;
    return;
  }
  try {
    if (peerConnection.signalingState === 'have-local-offer') {
      console.log('📥 [Mobile-WebRTC] Applying Meta SDP Answer to PeerConnection');
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: sdpAnswer })
      );
      console.log(
        '✅ [Mobile-WebRTC] Remote description applied. ICE State:',
        peerConnection.iceConnectionState
      );
    }
  } catch (err: any) {
    console.error('❌ [Mobile-WebRTC] Error setting remote description:', err?.message || err);
  }
};

/**
 * Accepts an inbound WhatsApp call
 */
export const acceptIncomingCall = async (sdpOffer: string): Promise<string> => {
  endCall();

  InCallManager.start({ media: 'audio', auto: true });
  InCallManager.setForceSpeakerphoneOn(false);

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnection = pc;

  const stream = (await mediaDevices.getUserMedia({
    audio: true,
    video: false,
  })) as MediaStream;

  localStream = stream;
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.ontrack = (event: any) => {
    console.log('🔊 [Mobile-WebRTC] Remote audio track received:', event.track);
    remoteStream = event.streams[0] || new MediaStream([event.track]);
  };

  await pc.setRemoteDescription(
    new RTCSessionDescription({ type: 'offer', sdp: sdpOffer })
  );

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGathering(pc);

  console.log('✅ [Mobile-WebRTC] Inbound SDP Answer ready');
  return (pc.localDescription as any)?.sdp || '';
};

/**
 * Mute / Unmute local microphone
 */
export const muteMic = (muted: boolean) => {
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }
  InCallManager.setMicrophoneMute(muted);
  console.log(`🎙️ [Mobile-WebRTC] Mic ${muted ? 'MUTED' : 'UNMUTED'}`);
};

/**
 * Toggle Speakerphone vs Earpiece
 */
export const setSpeakerphone = (enabled: boolean) => {
  InCallManager.setForceSpeakerphoneOn(enabled);
  console.log(`🔊 [Mobile-WebRTC] Speakerphone set to: ${enabled}`);
};

/**
 * End call & cleanup all native resources
 */
export const endCall = () => {
  pendingRemoteAnswer = null;
  if (peerConnection) {
    try {
      peerConnection.close();
    } catch (_) {}
    peerConnection = null;
  }
  if (localStream) {
    try {
      localStream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    localStream = null;
  }
  remoteStream = null;
  InCallManager.stop();
  InCallManager.stopRingback();
  console.log('🛑 [Mobile-WebRTC] Call ended & hardware released');
};