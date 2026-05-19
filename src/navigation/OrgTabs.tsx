// Navigator exposed to users with an active org_admin membership. Minimal
// shell for phase 2 — phase 3 will flesh out Teachers / Products / Classes
// screens into full management flows.

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import OrgDashboardScreen from '../screens/org/OrgDashboardScreen';
import OrgTeachersScreen from '../screens/org/OrgTeachersScreen';
import OrgProductsScreen from '../screens/org/OrgProductsScreen';
import OrgClassesScreen from '../screens/org/OrgClassesScreen';
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
        color={focused ? colors.proAccent : colors.textLight}
      />
      <Text
        style={[
          tabStyles.label,
          { color: focused ? colors.proAccent : colors.textLight, fontWeight: focused ? '700' : '500' },
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
    width: 64,
    height: 48,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.proAccent,
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.3,
    marginTop: 4,
  },
});

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrgDashboardHome" component={OrgDashboardScreen} />
      <Stack.Screen name="OrgTeachers" component={OrgTeachersScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="OrgProducts" component={OrgProductsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="OrgClasses" component={OrgClassesScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

export default function OrgTabs() {
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
        name="Accueil"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} label="Accueil" />
          ),
        }}
      />
      <Tab.Screen
        name="Profs"
        component={OrgTeachersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} label="Profs" />
          ),
        }}
      />
      <Tab.Screen
        name="Offres"
        component={OrgProductsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'card' : 'card-outline'} focused={focused} label="Offres" />
          ),
        }}
      />
      <Tab.Screen
        name="Cours"
        component={OrgClassesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} label="Cours" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
