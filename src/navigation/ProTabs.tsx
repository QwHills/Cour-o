import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import ProDashboardScreen from '../screens/pro/ProDashboardScreen';
import ProPointsScreen from '../screens/pro/ProPointsScreen';
import ProAttendanceScreen from '../screens/pro/ProAttendanceScreen';
import QuickAddSessionScreen from '../screens/pro/QuickAddSessionScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import MyPointsScreen from '../screens/shared/MyPointsScreen';
import RewardsShopScreen from '../screens/shared/RewardsShopScreen';
import RewardDetailScreen from '../screens/shared/RewardDetailScreen';
import MyRedemptionsScreen from '../screens/shared/MyRedemptionsScreen';
import TeacherReviewsScreen from '../screens/shared/TeacherReviewsScreen';
import ProPlanningScreen from '../screens/pro/ProPlanningScreen';
import ProSettingsScreen from '../screens/pro/ProSettingsScreen';
import SessionParticipantsScreen from '../screens/pro/SessionParticipantsScreen';
import ParticipantHistoryScreen from '../screens/pro/ParticipantHistoryScreen';
import CalendarSyncScreen from '../screens/pro/CalendarSyncScreen';
import CertificationProgressScreen from '../screens/pro/CertificationProgressScreen';
import VatSettingsScreen from '../screens/pro/VatSettingsScreen';
import InvoicesScreen from '../screens/pro/InvoicesScreen';
import InvoiceDetailScreen from '../screens/pro/InvoiceDetailScreen';
import ProMessagesScreen from '../screens/pro/ProMessagesScreen';
import ProStatsScreen from '../screens/pro/ProStatsScreen';
import TeacherPhotosScreen from '../screens/pro/TeacherPhotosScreen';
import ProEditProfileScreen from '../screens/pro/ProEditProfileScreen';
import AddressZoneScreen from '../screens/pro/AddressZoneScreen';
import OpeningHoursScreen from '../screens/pro/OpeningHoursScreen';
import ClosedDaysScreen from '../screens/pro/ClosedDaysScreen';
import StripeAccountScreen from '../screens/pro/StripeAccountScreen';
import CommissionInfoScreen from '../screens/pro/CommissionInfoScreen';
import CancellationPolicyScreen from '../screens/pro/CancellationPolicyScreen';
import CGUScreen from '../screens/shared/CGUScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  // label kept in the public signature so existing call sites compile; we
  // no longer render it under the icon (icon-only design, like UserTabs).
  label?: string;
}) {
  return (
    <View style={tabStyles.container}>
      {focused && <View style={tabStyles.indicator} />}
      <Ionicons
        name={name}
        size={28}
        color={focused ? colors.proAccent : colors.textLight}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.proAccent,
  },
});

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={ProDashboardScreen} />
      <Stack.Screen name="MyPoints" component={MyPointsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RewardsShop" component={RewardsShopScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RewardDetail" component={RewardDetailScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MyRedemptions" component={MyRedemptionsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TeacherReviews" component={TeacherReviewsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="CertificationProgress"
        component={CertificationProgressScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ProMessages"
        component={ProMessagesScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ProStats"
        component={ProStatsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

function PlanningStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlanningHome" component={ProPlanningScreen} />
      <Stack.Screen
        name="SessionParticipants"
        component={SessionParticipantsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ParticipantHistory"
        component={ParticipantHistoryScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="QuickAddSession"
        component={QuickAddSessionScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={ProSettingsScreen} />
      <Stack.Screen name="CalendarSync" component={CalendarSyncScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="VatSettings" component={VatSettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TeacherPhotos" component={TeacherPhotosScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProEditProfile" component={ProEditProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AddressZone" component={AddressZoneScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="OpeningHours" component={OpeningHoursScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ClosedDays" component={ClosedDaysScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="StripeAccount" component={StripeAccountScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CommissionInfo" component={CommissionInfoScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CancellationPolicy" component={CancellationPolicyScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CGV" component={CGUScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

export default function ProTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 78,
          paddingTop: 14,
          paddingBottom: 28,
          shadowColor: '#1A1714',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 12,
        },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} label="Accueil" />
          ),
        }}
      />
      <Tab.Screen
        name="Planning"
        component={PlanningStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} label="Planning" />
          ),
        }}
      />
      <Tab.Screen
        name="Points"
        component={ProPointsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'star' : 'star-outline'} focused={focused} label="Points" />
          ),
        }}
      />
      <Tab.Screen
        name="Présences"
        component={ProAttendanceScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} label="Présences" />
          ),
        }}
      />
      <Tab.Screen
        name="Paramètres"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} label="Réglages" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
