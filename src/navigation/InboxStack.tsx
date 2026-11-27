// sudo-reply-mobile/src/navigation/InboxStack.tsx (do not remove this comment)
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InboxListScreen } from '../screens/inbox/InboxListScreen';
import { ChatScreen } from '../screens/inbox/ChatScreen';
import { ArchivedChatsScreen } from '../screens/inbox/ArchivedChatsScreen';

const Stack = createNativeStackNavigator();

export const InboxStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name="InboxList" component={InboxListScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen
  name="ArchivedChats"
  component={ArchivedChatsScreen}
  options={{ headerShown: false }}
/>
  </Stack.Navigator>
);