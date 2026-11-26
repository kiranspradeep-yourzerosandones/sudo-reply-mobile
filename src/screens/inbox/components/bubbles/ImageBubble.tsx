import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { MessageType } from '../MessageBubble';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAX_BUBBLE_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 270);
const MAX_BUBBLE_HEIGHT = 320;
const MIN_BUBBLE_HEIGHT = 140;

// Persistent in-memory caches across polling and list re-renders
const URI_DISK_CACHE = new Map<string, string>();
const SIZE_CACHE = new Map<string, { width: number; height: number }>();

function getCacheFilePath(url: string): string {
  // Strip query string (e.g. presigned S3 tokens/timestamps) for a stable disk key
  const cleanUrl = url.split('?')[0];
  let hash = 0;
  for (let i = 0; i < cleanUrl.length; i++) {
    hash = ((hash << 5) - hash) + cleanUrl.charCodeAt(i);
    hash |= 0;
  }
  const extMatch = cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  return `${FileSystem.cacheDirectory}chat_img_${Math.abs(hash)}.${ext}`;
}

interface ImageBubbleProps {
  mediaUrl: string;
  thumbnailUrl?: string | null;
  type: MessageType;
  mediaHeaders?: Record<string, string>;
  onPressMedia?: (url: string, type: MessageType) => void;
}

const ImageBubbleComponent: React.FC<ImageBubbleProps> = ({
  mediaUrl,
  thumbnailUrl,
  type,
  mediaHeaders,
  onPressMedia,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const cleanKey = useMemo(() => mediaUrl.split('?')[0], [mediaUrl]);

  // Synchronously initialize with cached values if already downloaded
  const [localUri, setLocalUri] = useState<string | null>(() => {
    if (!mediaUrl) return null;
    if (mediaUrl.startsWith('file://') || mediaUrl.startsWith('content://')) return mediaUrl;
    return URI_DISK_CACHE.get(cleanKey) || null;
  });

  const [aspectDimensions, setAspectDimensions] = useState<{ width: number; height: number }>(() => {
    return SIZE_CACHE.get(cleanKey) || { width: MAX_BUBBLE_WIDTH, height: 190 };
  });

  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(!localUri);

  // 1. Download to local disk cache once, then serve as file:// URI forever
  useEffect(() => {
    let isMounted = true;
    if (!mediaUrl) return;

    if (mediaUrl.startsWith('file://') || mediaUrl.startsWith('content://')) {
      URI_DISK_CACHE.set(cleanKey, mediaUrl);
      setLocalUri(mediaUrl);
      setDownloading(false);
      calculateDimensions(mediaUrl);
      return;
    }

    const diskPath = getCacheFilePath(mediaUrl);

    const syncFile = async () => {
      try {
        const info = await FileSystem.getInfoAsync(diskPath);
        let finalPath = diskPath;

        if (!info.exists) {
          const result = await FileSystem.downloadAsync(mediaUrl, diskPath, {
            headers: mediaHeaders,
          });
          finalPath = result.uri;
        }

        URI_DISK_CACHE.set(cleanKey, finalPath);

        if (isMounted) {
          setLocalUri(finalPath);
          setDownloading(false);
        }

        calculateDimensions(finalPath);
      } catch (err) {
        console.warn('Image disk caching failed, falling back to remote URL:', err);
        if (isMounted) {
          setLocalUri(mediaUrl);
          setDownloading(false);
          calculateDimensions(mediaUrl);
        }
      }
    };

    if (!localUri) {
      syncFile();
    } else {
      calculateDimensions(localUri);
    }

    return () => {
      isMounted = false;
    };
  }, [mediaUrl, cleanKey]);

  // 2. Measure aspect ratio using local file
  const calculateDimensions = (uri: string) => {
    if (SIZE_CACHE.has(cleanKey)) {
      setAspectDimensions(SIZE_CACHE.get(cleanKey)!);
      return;
    }

    Image.getSize(
      uri,
      (naturalWidth, naturalHeight) => {
        if (!naturalWidth || !naturalHeight) return;

        const ratio = naturalWidth / naturalHeight;
        let calculatedWidth = MAX_BUBBLE_WIDTH;
        let calculatedHeight = calculatedWidth / ratio;

        if (calculatedHeight > MAX_BUBBLE_HEIGHT) {
          calculatedHeight = MAX_BUBBLE_HEIGHT;
          calculatedWidth = calculatedHeight * ratio;
        }

        if (calculatedHeight < MIN_BUBBLE_HEIGHT) {
          calculatedHeight = MIN_BUBBLE_HEIGHT;
          calculatedWidth = Math.min(MAX_BUBBLE_WIDTH, calculatedHeight * ratio);
        }

        const dims = {
          width: Math.round(calculatedWidth),
          height: Math.round(calculatedHeight),
        };

        SIZE_CACHE.set(cleanKey, dims);
        setAspectDimensions(dims);
      },
      () => {
        // Fallback default
        const fallbackDims = { width: MAX_BUBBLE_WIDTH, height: 180 };
        SIZE_CACHE.set(cleanKey, fallbackDims);
        setAspectDimensions(fallbackDims);
      }
    );
  };

  const handlePress = () => {
    if (onPressMedia) {
      onPressMedia(localUri || mediaUrl, type);
    } else {
      setModalVisible(true);
    }
  };

  const currentDisplayUri = localUri || mediaUrl;

  return (
    <>
      {type === 'IMAGE' ? (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.wrapper,
            { width: aspectDimensions.width, height: aspectDimensions.height },
            pressed && { opacity: 0.92 },
          ]}
        >
          {failed ? (
            <View style={[styles.fill, styles.mediaFallback]}>
              <Ionicons name="image-outline" size={28} color="#94A3B8" />
              <Text style={styles.mediaFallbackText}>Couldn't load image</Text>
            </View>
          ) : (
            <>
              {downloading && (
                <View style={[styles.fill, styles.loaderOverlay]}>
                  <ActivityIndicator size="small" color="#008069" />
                </View>
              )}

              {!!currentDisplayUri && (
                <Image
                  source={{ uri: currentDisplayUri }}
                  style={[
                    styles.fill,
                    { width: aspectDimensions.width, height: aspectDimensions.height },
                  ]}
                  resizeMode="cover"
                  onError={() => setFailed(true)}
                />
              )}
            </>
          )}
        </Pressable>
      ) : (
        /* VIDEO ITEM */
        <Pressable
          onPress={() => onPressMedia?.(mediaUrl, 'VIDEO')}
          style={({ pressed }) => [
            styles.wrapper,
            { width: aspectDimensions.width, height: aspectDimensions.height },
            pressed && { opacity: 0.92 },
          ]}
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={[
                styles.fill,
                { width: aspectDimensions.width, height: aspectDimensions.height },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.fill, styles.videoPlaceholder]} />
          )}

          <View style={styles.playOverlay}>
            <View style={styles.playButtonCircle}>
              <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </Pressable>
      )}

      {/* Fullscreen Lightbox Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setModalVisible(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Pressable
            style={styles.modalContent}
            onPress={() => setModalVisible(false)}
          >
            {!!currentDisplayUri && (
              <Image
                source={{ uri: currentDisplayUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  );
};

// Strict memoization: do not re-render unless media URL or type actually changed
export const ImageBubble = React.memo(ImageBubbleComponent, (prev, next) => {
  return (
    prev.mediaUrl === next.mediaUrl &&
    prev.thumbnailUrl === next.thumbnailUrl &&
    prev.type === next.type
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  loaderOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    zIndex: 1,
  },
  mediaFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  mediaFallbackText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  videoPlaceholder: {
    backgroundColor: '#0F172A',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  playButtonCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
});