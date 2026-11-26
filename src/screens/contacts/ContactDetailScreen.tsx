// sudo-reply-mobile/src/screens/contacts/ContactDetailScreen.tsx (do not remove this comment)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { useContact } from '../../hooks/useContacts';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'ContactDetail'>;

export const ContactDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route.params as { id: string };
  const { data: contact, isLoading } = useContact(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>Contact not found</Text>
      </View>
    );
  }

  const handleMessage = () => {
    // Navigate to Chat with no conversationId (ChatScreen handles the "new conversation" case)
    navigation.navigate('Inbox', {
      screen: 'Chat',
      params: {
        conversationId: null,
        contactId: contact.id,
        contactName: contact.name || contact.phone || 'Unknown',
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ContactForm', { id })}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={styles.profileSection}>
          <Avatar name={contact.name} size={80} />
          <Text style={styles.name}>{contact.name || 'Unknown'}</Text>
          <Text style={styles.phone}>{contact.phone}</Text>

          {/* Primary Message CTA */}
          <TouchableOpacity
            style={styles.messageCta}
            onPress={handleMessage}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble" size={18} color={colors.white} />
            <Text style={styles.messageCtaText}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <Card style={styles.card}>
          <InfoRow icon="mail-outline" label="Email" value={contact.email || '—'} />
          <InfoRow
            icon="time-outline"
            label="Added"
            value={new Date(contact.createdAt).toLocaleDateString()}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon as any} size={18} color={colors.secondaryGrey} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.h2, color: colors.darkGrey },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  profileSection: { alignItems: 'center', paddingVertical: spacing.xxl },
  name: { ...typography.h1, color: colors.darkGrey, marginTop: spacing.md },
  phone: { ...typography.body, color: colors.secondaryGrey, marginTop: spacing.xs },

  // ── Primary Message CTA ──
  messageCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: spacing.lg,
    minWidth: 140,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  messageCtaText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  card: { marginBottom: spacing.xl },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.secondaryGrey,
    marginLeft: spacing.sm,
    width: 60,
  },
  infoValue: { ...typography.label, color: colors.darkGrey, flex: 1, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});