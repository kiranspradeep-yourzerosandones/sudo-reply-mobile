// sudo-reply-mobile/src/screens/profile/ViewProfileScreen.tsx (do not remove this comment)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Divider } from '../../components/ui/Divider';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'ViewProfile'>;

type Availability = 'available' | 'away' | 'offline';

const AVAILABILITY_OPTIONS: {
  value: Availability;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    value: 'available',
    label: 'Available',
    desc: 'Ready to take conversations',
    color: '#22C55E',
  },
  {
    value: 'away',
    label: 'Away',
    desc: 'Temporarily unavailable',
    color: '#F59E0B',
  },
  {
    value: 'offline',
    label: 'Offline',
    desc: 'Not receiving conversations',
    color: '#94A3B8',
  },
];

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({
  icon,
  label,
  value,
  valueColor,
  onPress,
  showChevron = false,
}) => {
  const content = (
    <View style={styles.detailRow}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailLabelWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text
          style={[
            styles.detailValue,
            valueColor ? { color: valueColor } : undefined,
          ]}
        >
          {value}
        </Text>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.secondaryGrey} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const ViewProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s: any) => s.setUser);
  const userType = useAuthStore((s) => s.userType);

  const [showAvailabilitySheet, setShowAvailabilitySheet] = useState(false);
  const [localStatus, setLocalStatus] = useState<Availability>(
    (user?.availabilityStatus?.toLowerCase() as Availability) || 'available'
  );

  const handleSelectAvailability = (status: Availability) => {
    setLocalStatus(status);
    if (setUser && user) {
      setUser({ ...user, availabilityStatus: status.toUpperCase() });
    }
    setShowAvailabilitySheet(false);
    // TODO: Connect PATCH /api/profile/availability when endpoint is ready
  };

  const currentAvail =
    AVAILABILITY_OPTIONS.find((o) => o.value === localStatus) || AVAILABILITY_OPTIONS[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.darkGrey} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 110 + insets.bottom }, // Extra padding prevents floating bottom bar cutoff
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Avatar Section ── */}
        <View style={styles.heroSection}>
          <Avatar name={user?.name} size={84} />
          <Text style={styles.userName}>{user?.name || 'Agent'}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {userType === 'TENANT' ? 'Tenant Admin' : 'Support Agent'}
              </Text>
            </View>

            {/* Clickable Status Badge */}
            <TouchableOpacity
              style={[
                styles.statusBadge,
                { backgroundColor: currentAvail.color + '18' },
              ]}
              onPress={() => setShowAvailabilitySheet(true)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.statusDot, { backgroundColor: currentAvail.color }]}
              />
              <Text
                style={[styles.statusBadgeText, { color: currentAvail.color }]}
              >
                {currentAvail.label}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={currentAvail.color}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Personal Info ── */}
        <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
        <Card style={styles.card}>
          <DetailRow
            icon="person-outline"
            label="Full Name"
            value={user?.name || '—'}
          />
          <Divider />
          <DetailRow
            icon="mail-outline"
            label="Email Address"
            value={user?.email || '—'}
          />
          <Divider />
          <DetailRow
            icon="call-outline"
            label="Phone"
            value={(user as any)?.phone || 'Not provided'}
          />
        </Card>

        {/* ── Workspace & Role ── */}
        <Text style={styles.sectionTitle}>WORKSPACE & ACCESS</Text>
        <Card style={styles.card}>
          <DetailRow
            icon="business-outline"
            label="Workspace"
            value={user?.tenant?.tenantName || 'Default Workspace'}
          />
          <Divider />
          <DetailRow
            icon="shield-outline"
            label="Role"
            value={userType === 'TENANT' ? 'Administrator' : 'Agent'}
          />
          <Divider />
          {/* Clickable Availability Row with chevron */}
          <DetailRow
            icon="radio-button-on-outline"
            label="Availability (Tap to change)"
            value={currentAvail.label}
            valueColor={currentAvail.color}
            onPress={() => setShowAvailabilitySheet(true)}
            showChevron
          />
          {(user as any)?.createdAt && (
            <>
              <Divider />
              <DetailRow
                icon="calendar-outline"
                label="Member Since"
                value={new Date((user as any).createdAt).toLocaleDateString()}
              />
            </>
          )}
        </Card>
      </ScrollView>

      {/* ── Availability Bottom Sheet Modal ── */}
      <Modal
        visible={showAvailabilitySheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAvailabilitySheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowAvailabilitySheet(false)}
        >
          <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set Availability</Text>
            <Text style={styles.sheetSubtitle}>
              Control whether incoming conversations are routed to you.
            </Text>

            {AVAILABILITY_OPTIONS.map((option) => {
              const isSelected = localStatus === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sheetOption,
                    isSelected && styles.sheetOptionActive,
                  ]}
                  onPress={() => handleSelectAvailability(option.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.sheetOptionDot,
                      { backgroundColor: option.color },
                    ]}
                  />
                  <View style={styles.sheetOptionText}>
                    <Text
                      style={[
                        styles.sheetOptionLabel,
                        isSelected && { color: colors.primary },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.sheetOptionDesc}>{option.desc}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.lightGrey,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.darkGrey,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.darkGrey,
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: 14,
    color: colors.secondaryGrey,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  roleBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryGrey,
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.lightGrey,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailLabelWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.secondaryGrey,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.darkGrey,
    marginTop: 2,
  },

  // ── Availability Sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lightGrey,
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.darkGrey,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.secondaryGrey,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  sheetOptionActive: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  sheetOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sheetOptionText: {
    flex: 1,
  },
  sheetOptionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.darkGrey,
  },
  sheetOptionDesc: {
    fontSize: 12,
    color: colors.secondaryGrey,
    marginTop: 1,
  },
});