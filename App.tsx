import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, BackHandler, Platform } from 'react-native';
import * as Font from 'expo-font';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Toast } from './src/components/ui/Toast';
import { pushNotificationService } from './src/services/pushNotificationService';
import { useAuthStore } from './src/stores/authStore';
import apiClient from './src/services/api';
import { ENDPOINTS } from './src/config/api';
import { navigate, navigationRef } from './src/navigation/navigationRef';

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const pushTokenSentRef = useRef(false);

  // ── Intercept Android swipe-back gesture / hardware back button ──
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true; // Handled by React Navigation -> DO NOT close app
      }
      return false; // At root screen -> allow Android to exit app normally
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
        });
        console.log('✅ Fonts loaded');
      } catch (err) {
        console.warn('⚠️ Font load failed, continuing anyway:', err);
      } finally {
        setFontsReady(true);
      }
    };

    const timeout = setTimeout(() => {
      console.warn('⚠️ Font load timeout — proceeding');
      setFontsReady(true);
    }, 5000);

    loadFonts().then(() => clearTimeout(timeout));

    // ── Register for push notifications ──
    pushNotificationService.register().then((token) => {
      if (token) {
        console.log('🔔 Push token ready, will send on auth');
      }
    });

    // ── Listen for notification taps → navigate to chat ──
    pushNotificationService.startListening(
      (notification) => {
        console.log('🔔 Foreground notification:', notification);
      },
      (response) => {
        const data = response?.notification?.request?.content?.data;
        console.log('🔔 Notification tapped:', data);

        if (data?.type === 'new_message' && data?.conversationId && data?.contactId) {
          navigate('Inbox', {
            screen: 'Chat',
            params: {
              conversationId: data.conversationId,
              contactId: data.contactId,
              contactName: data.contactName || 'Chat',
            },
          });
        } else if (data?.type === 'reassigned') {
          navigate('Inbox');
        }
      },
    );

    return () => {
      pushNotificationService.stopListening();
    };
  }, []);

  // ── Send push token to backend when user authenticates ──
  useEffect(() => {
    const sendToken = async () => {
      const { accessToken, isAuthenticated } = useAuthStore.getState();
      const token = pushNotificationService.getToken();

      if (isAuthenticated && accessToken && token && !pushTokenSentRef.current) {
        try {
          await apiClient.post(ENDPOINTS.auth.pushToken, { pushToken: token });
          pushTokenSentRef.current = true;
          console.log('🔔 Push token sent to backend ✅');
        } catch (err: any) {
          console.warn('⚠️ Failed to send push token:', err?.message);
        }
      }
    };

    sendToken();
    const interval = setInterval(sendToken, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#125EF2' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <RootNavigator />
      <Toast />
    </AppProviders>
  );
}