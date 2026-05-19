import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import MapScreen from '../screens/user/MapScreen';
import CourseDetailScreen from '../screens/user/CourseDetailScreen';
import SlotPickerScreen from '../screens/user/SlotPickerScreen';
import CheckoutScreen from '../screens/user/CheckoutScreen';
import BookingConfirmedScreen from '../screens/user/BookingConfirmedScreen';
import MyBookingsScreen from '../screens/user/MyBookingsScreen';
import BookingDetailScreen from '../screens/user/BookingDetailScreen';
import PostClassQuestionnaireScreen from '../screens/user/PostClassQuestionnaireScreen';
import UserProfileScreen from '../screens/user/UserProfileScreen';
import EditProfileScreen from '../screens/user/EditProfileScreen';
import FavoritesScreen from '../screens/user/FavoritesScreen';
import UserMessagesScreen from '../screens/user/UserMessagesScreen';
import TeacherProfileScreen from '../screens/user/TeacherProfileScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import SearchScreen from '../screens/user/SearchScreen';
import PaymentMethodsScreen from '../screens/user/PaymentMethodsScreen';
import MyInvoicesScreen from '../screens/user/MyInvoicesScreen';
import HelpCenterScreen from '../screens/user/HelpCenterScreen';
import ContactScreen from '../screens/user/ContactScreen';
import CGUScreen from '../screens/shared/CGUScreen';
import ProOnboarding1Screen from '../screens/auth/ProOnboarding1Screen';
import ProOnboarding2Screen from '../screens/auth/ProOnboarding2Screen';
import ProOnboarding3Screen from '../screens/auth/ProOnboarding3Screen';
import MyPointsScreen from '../screens/shared/MyPointsScreen';
import RewardsShopScreen from '../screens/shared/RewardsShopScreen';
import RewardDetailScreen from '../screens/shared/RewardDetailScreen';
import MyRedemptionsScreen from '../screens/shared/MyRedemptionsScreen';
import TeacherReviewsScreen from '../screens/shared/TeacherReviewsScreen';
import ProductCheckoutScreen from '../screens/user/ProductCheckoutScreen';
import MySubscriptionsScreen from '../screens/user/MySubscriptionsScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({
  name,
  focused,
  label,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={tabStyles.container}>
      {focused && <View style={tabStyles.indicator} />}
      <Ionicons
        name={name}
        size={22}
        color={focused ? colors.primary : colors.textLight}
      />
      <Text
        style={[
          tabStyles.label,
          { color: focused ? colors.primary : colors.textLight, fontWeight: focused ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 48,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 4,
  },
});

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapHome" component={MapScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SlotPicker" component={SlotPickerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TeacherReviews" component={TeacherReviewsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProductCheckout" component={ProductCheckoutScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="List" component={MyBookingsScreen} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PostClassQuestionnaire" component={PostClassQuestionnaireScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={UserProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="UserMessages" component={UserMessagesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MyInvoices" component={MyInvoicesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Contact" component={ContactScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CGU" component={CGUScreen} options={{ animation: 'slide_from_bottom' }} />
      {/* "Become a teacher" flow — shared with AuthNavigator screens but
          entered here with `isUpgrade: true` so no new account is created. */}
      <Stack.Screen name="ProOnboarding1" component={ProOnboarding1Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProOnboarding2" component={ProOnboarding2Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProOnboarding3" component={ProOnboarding3Screen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MyPoints" component={MyPointsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RewardsShop" component={RewardsShopScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RewardDetail" component={RewardDetailScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MyRedemptions" component={MyRedemptionsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TeacherReviews" component={TeacherReviewsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MySubscriptions" component={MySubscriptionsScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

export default function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 88,
          paddingTop: 12,
          paddingBottom: 30,
          shadowColor: '#1A1714',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 12,
        },
      }}
    >
      <Tab.Screen
        name="Explorer"
        component={ExploreStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} label="Explorer" />
          ),
        }}
      />
      <Tab.Screen
        name="Mes cours"
        component={BookingsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} label="Mes cours" />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person-circle' : 'person-circle-outline'} focused={focused} label="Profil" />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Profil', { screen: 'ProfileHome' });
          },
        })}
      />
    </Tab.Navigator>
  );
}
