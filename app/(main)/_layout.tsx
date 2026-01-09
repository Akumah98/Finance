import { colors } from "@/constants/colors";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform } from "react-native";


export default function MainTabLayout() {
  const router = useRouter();

  return (

    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.select({
            ios: 90,
            android: 100,
          }),
          paddingTop: Platform.select({
            ios: 10,
            android: 0,
          }),
        },
        tabBarLabelStyle: {
          fontSize: Platform.select({
            ios: 12,
            android: 10,
          }),
          fontWeight: "600",
          marginBottom: Platform.select({
            ios: 10,
            android: 8,
          }),
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-dashboard"
              size={Platform.OS === 'android' ? 22 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome
              name="list-alt"
              size={Platform.OS === 'android' ? 20 : size - 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="analytics"
              size={Platform.OS === 'android' ? 22 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: "Bills",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="receipt"
              size={Platform.OS === 'android' ? 22 : size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-sharp"
              size={Platform.OS === 'android' ? 22 : size}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden Tabs (Auxiliary Screens) */}

      <Tabs.Screen name="profile" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="add-transaction" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="add-bill" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="add-goal" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="scan" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="groups" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="group-detail" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="create-group" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="manage-categories" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="test-connection" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="goals" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="budgets" options={{ href: null, tabBarStyle: { display: 'none' } }} />

    </Tabs>

  );
}