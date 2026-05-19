import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { authService } from '../services/auth.service';
import { favoritesService } from '../services/favorites.service';
import { coursesService } from '../services/courses.service';
import { bookingsService } from '../services/bookings.service';
import { notificationsService } from '../services/notifications.service';
import { questionnaireService } from '../services/questionnaire.service';
import { messagingService } from '../services/messaging.service';
import { invoiceService } from '../services/invoice.service';
import { organizationsService } from '../services/organizations.service';
import { productsService } from '../services/products.service';
import { creditsService } from '../services/credits.service';
import { loadActiveCommission } from '../services/commission.service';
import { User } from '../types/domain';

import UserTabs from './UserTabs';
import ProTabs from './ProTabs';
import OrgTabs from './OrgTabs';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ProKindChoiceScreen from '../screens/auth/ProKindChoiceScreen';
import ProSignUpScreen from '../screens/auth/ProSignUpScreen';
import ProOnboarding1Screen from '../screens/auth/ProOnboarding1Screen';
import ProOnboarding2Screen from '../screens/auth/ProOnboarding2Screen';
import ProOnboarding3Screen from '../screens/auth/ProOnboarding3Screen';
import OrgSignUpScreen from '../screens/auth/OrgSignUpScreen';
import UserSignUpScreen from '../screens/auth/UserSignUpScreen';
import CGUScreen from '../screens/shared/CGUScreen';

const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen
        name="UserSignUp"
        component={UserSignUpScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="ProKindChoice"
        component={ProKindChoiceScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="ProSignUp"
        component={ProSignUpScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="OrgSignUp"
        component={OrgSignUpScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="ProOnboarding1"
        component={ProOnboarding1Screen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="ProOnboarding2"
        component={ProOnboarding2Screen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="ProOnboarding3"
        component={ProOnboarding3Screen}
        options={{ animation: 'slide_from_right' }}
      />
      <AuthStack.Screen
        name="CGU"
        component={CGUScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  // Tick to re-render when org memberships load (routes pro users with an
  // active admin membership toward OrgTabs instead of ProTabs).
  const [, setMembershipTick] = useState(0);

  useEffect(() => {
    // Hydrate public caches on app start (classes + sessions + teachers +
    // reviews + organizations + products). Reviews and orgs are publicly
    // readable per RLS so prospective students can browse before login.
    coursesService.load().catch(() => {});
    questionnaireService.load().catch(() => {});
    organizationsService.load().catch(() => {});
    productsService.load().catch(() => {});
    // Commission lives in DB now (table `commissions`). Loader caches the
    // active row and triggers a re-render on screens using useCommission().
    loadActiveCommission().catch(() => {});

    const unsubOrg = organizationsService.onChange(() => setMembershipTick((t) => t + 1));

    const unsubAuth = authService.onChange((u) => {
      setUser(u ? { ...u } : null);
      if (u) {
        // Hydrate per-user caches
        favoritesService.load(u.id).catch(() => {});
        bookingsService.load().catch(() => {});
        notificationsService.load(u.id).catch(() => {});
        messagingService.loadConversations().catch(() => {});
        invoiceService.load().catch(() => {});
        creditsService.load(u.id).catch(() => {});
        // Refresh public caches too (profiles may have updated)
        coursesService.load().catch(() => {});
        questionnaireService.load().catch(() => {});
        organizationsService.load().catch(() => {});
        productsService.load().catch(() => {});
      }
    });

    return () => {
      unsubOrg();
      unsubAuth();
    };
  }, []);

  // Pro users with an active org_admin membership get the OrgTabs shell.
  // This covers both the "just signed up a new structure" case and returning
  // admins. An indep teacher without any admin role keeps the regular ProTabs.
  const isOrgAdmin =
    user?.role === 'pro' &&
    !!user &&
    organizationsService
      .listMembershipsFor(user.id)
      .some((m) => m.role === 'admin');

  return (
    <NavigationContainer>
      {user === null ? (
        <AuthNavigator />
      ) : user.role === 'pro' ? (
        isOrgAdmin ? <OrgTabs /> : <ProTabs />
      ) : (
        <UserTabs />
      )}
    </NavigationContainer>
  );
}
