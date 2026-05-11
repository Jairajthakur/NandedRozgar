// GestureHandlerRootView must wrap the entire app on Android
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React from 'react';
import {
  View, Text, ActivityIndicator, StatusBar, TouchableOpacity, StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen     from './src/screens/LoginScreen';
import BoardScreen     from './src/screens/BoardScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import PostScreen      from './src/screens/PostScreen';
import ProfileScreen   from './src/screens/ProfileScreen';
import AIScreen        from './src/screens/AIScreen';
import AdminScreen     from './src/screens/AdminScreen';
import { C } from './src/utils/constants';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMsg}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={styles.errorBtn}
          >
            <Text style={styles.errorBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Tab Icon ──────────────────────────────────────────────────────────────────
function TabIcon({ emoji, focused }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

// Shared tab screen options
const tabScreenOptions = {
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 8,
  },
  tabBarActiveTintColor:   C.dark,
  tabBarInactiveTintColor: C.muted,
  headerStyle: { backgroundColor: C.dark },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '800', fontSize: 17 },
  headerTitle: 'NandedRozgar 🏙️',
};

const boardOpts   = { tabBarLabel: 'Jobs',    tabBarIcon: ({ focused }) => <TabIcon emoji="🏙️" focused={focused} /> };
const postOpts    = { tabBarLabel: 'Post Job', tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} /> };
const aiOpts      = { tabBarLabel: 'AI Match', tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} /> };
const profileOpts = { tabBarLabel: 'Profile',  tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> };
const adminOpts   = { tabBarLabel: 'Admin',    tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> };

// ── Main Tabs ─────────────────────────────────────────────────────────────────
// FIX: Conditional <Tab.Screen> inside one navigator causes a native Android crash.
// Solution: render separate Tab.Navigator instances per role — each is fully static.
function MainTabs() {
  const { role } = useAuth();

  if (role === 'admin') {
    return (
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen name="Board"   component={BoardScreen}   options={boardOpts} />
        <Tab.Screen name="Post"    component={PostScreen}    options={postOpts} />
        <Tab.Screen name="AI"      component={AIScreen}      options={aiOpts} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={profileOpts} />
        <Tab.Screen name="Admin"   component={AdminScreen}   options={adminOpts} />
      </Tab.Navigator>
    );
  }

  if (role === 'giver') {
    return (
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen name="Board"   component={BoardScreen}   options={boardOpts} />
        <Tab.Screen name="Post"    component={PostScreen}    options={postOpts} />
        <Tab.Screen name="AI"      component={AIScreen}      options={aiOpts} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={profileOpts} />
      </Tab.Navigator>
    );
  }

  // seeker (default)
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Board"   component={BoardScreen}   options={boardOpts} />
      <Tab.Screen name="AI"      component={AIScreen}      options={aiOpts} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={profileOpts} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={{ fontSize: 36 }}>🏙️</Text>
        </View>
        <Text style={styles.splashTitle}>NandedRozgar</Text>
        <Text style={styles.splashSub}>Local Jobs · Local Life · Nanded</Text>
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 36 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Job Details',
          headerStyle: { backgroundColor: C.dark },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    // GestureHandlerRootView is REQUIRED on Android.
    // Without it, the gesture handler native module crashes on launch.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar barStyle="light-content" backgroundColor={C.dark} />
              <RootNavigator />
            </NavigationContainer>
            <Toast />
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.dark, padding: 32,
  },
  errorTitle: {
    color: '#fff', fontSize: 20, fontWeight: '800',
    marginBottom: 12, textAlign: 'center',
  },
  errorMsg: {
    color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20,
  },
  errorBtn: {
    backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  errorBtnText: { color: C.dark, fontWeight: '700', fontSize: 14 },

  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark,
  },
  splashLogo: {
    width: 80, height: 80, backgroundColor: '#1a1a2e', borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    borderWidth: 2, borderColor: '#333',
  },
  splashTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  splashSub:   { color: '#888', fontSize: 13, marginTop: 4 },

  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  tabDot:  { width: 4, height: 4, backgroundColor: C.dark, borderRadius: 2, marginTop: 2 },
});
