import React from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen    from './src/screens/LoginScreen';
import BoardScreen    from './src/screens/BoardScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import PostScreen     from './src/screens/PostScreen';
import ProfileScreen  from './src/screens/ProfileScreen';
import AIScreen       from './src/screens/AIScreen';
import AdminScreen    from './src/screens/AdminScreen';
import { C } from './src/utils/constants';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      {focused && (
        <View style={{ width: 4, height: 4, backgroundColor: C.dark, borderRadius: 2, marginTop: 2 }} />
      )}
    </View>
  );
}

function MainTabs() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isGiver = role === 'giver';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: C.dark,
        tabBarInactiveTintColor: C.muted,
        headerStyle: { backgroundColor: C.dark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerTitle: 'NandedRozgar 🏙️',
      }}
    >
      {/* Jobs board — visible to everyone */}
      <Tab.Screen
        name="Board"
        component={BoardScreen}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏙️" focused={focused} />,
        }}
      />

      {/* Post Job — only visible to employers (givers) and admins */}
      {(isGiver || isAdmin) && (
        <Tab.Screen
          name="Post"
          component={PostScreen}
          options={{
            tabBarLabel: 'Post Job',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} />,
          }}
        />
      )}

      {/* AI Match — visible to everyone */}
      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{
          tabBarLabel: 'AI Match',
          tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} />,
        }}
      />

      {/* Profile — visible to everyone */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />

      {/* Admin panel — only visible to admins */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🏙️</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 24 }}>
          NandedRozgar
        </Text>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="JobDetail"
            component={JobDetailScreen}
            options={{
              headerShown: true,
              headerTitle: 'Job Details',
              headerStyle: { backgroundColor: C.dark },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '800' },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor={C.dark} />
            <RootNavigator />
          </NavigationContainer>
          <Toast />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
