import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import {
  View, Text, ActivityIndicator, StatusBar,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen      from './src/screens/LoginScreen';
import HomeScreen       from './src/screens/HomeScreen';
import BoardScreen      from './src/screens/BoardScreen';
import JobDetailScreen  from './src/screens/JobDetailScreen';
import PostScreen       from './src/screens/PostScreen';
import ProfileScreen    from './src/screens/ProfileScreen';
import AIScreen         from './src/screens/AIScreen';
import AdminScreen      from './src/screens/AdminScreen';
import CarsScreen       from './src/screens/CarsScreen';
import CarDetailScreen  from './src/screens/CarDetailScreen';
import RoomsScreen      from './src/screens/RoomsScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import PostCarScreen    from './src/screens/PostCarScreen';
import PostRoomScreen   from './src/screens/PostRoomScreen';
import { C } from './src/utils/constants';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={s.errBox}>
          <Text style={s.errEmoji}>⚠️</Text>
          <Text style={s.errTitle}>Something went wrong</Text>
          <Text style={s.errMsg}>{this.state.error?.message || 'Unexpected error'}</Text>
          <TouchableOpacity style={s.errBtn}
            onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={s.errBtnTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Shared tab options ───────────────────────────────────────────────────────
const TAB_BAR_STYLE = {
  tabBarStyle: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e0e0e0',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabBarActiveTintColor:   '#111111',
  tabBarInactiveTintColor: '#777777',
  headerStyle:      { backgroundColor: '#111111' },
  headerTintColor:  '#ffffff',
  headerTitleStyle: { fontWeight: '800' },
  headerTitle:      'NandedRozgar 🏙️',
};

function icon(emoji) {
  return ({ focused }) => (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2,
        backgroundColor: '#111', marginTop: 2 }} />}
    </View>
  );
}

// ─── Three separate static navigators — no conditional screens inside one Tab ─
function SeekerTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_BAR_STYLE}>
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: 'Home',    tabBarIcon: icon('🏙️'), headerTitle: 'NandedRozgar 🏙️' }} />
      <Tab.Screen name="Jobs"    component={BoardScreen}   options={{ tabBarLabel: 'Jobs',    tabBarIcon: icon('💼'), headerTitle: 'Find Jobs' }} />
      <Tab.Screen name="Cars"    component={CarsScreen}    options={{ tabBarLabel: 'Cars',    tabBarIcon: icon('🚗'), headerTitle: 'Car Rental' }} />
      <Tab.Screen name="Rooms"   component={RoomsScreen}   options={{ tabBarLabel: 'Rooms',   tabBarIcon: icon('🏠'), headerTitle: 'Rooms & PG' }} />
      <Tab.Screen name="AI"      component={AIScreen}      options={{ tabBarLabel: 'AI Match', tabBarIcon: icon('✨'), headerTitle: 'AI Job Match' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: icon('👤'), headerTitle: 'My Profile' }} />
    </Tab.Navigator>
  );
}

function GiverTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_BAR_STYLE}>
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: 'Home',     tabBarIcon: icon('🏙️'), headerTitle: 'NandedRozgar 🏙️' }} />
      <Tab.Screen name="Jobs"    component={BoardScreen}   options={{ tabBarLabel: 'Jobs',     tabBarIcon: icon('💼'), headerTitle: 'Find Jobs' }} />
      <Tab.Screen name="Cars"    component={CarsScreen}    options={{ tabBarLabel: 'Cars',     tabBarIcon: icon('🚗'), headerTitle: 'Car Rental' }} />
      <Tab.Screen name="Rooms"   component={RoomsScreen}   options={{ tabBarLabel: 'Rooms',    tabBarIcon: icon('🏠'), headerTitle: 'Rooms & PG' }} />
      <Tab.Screen name="Post"    component={PostScreen}    options={{ tabBarLabel: 'Post Job', tabBarIcon: icon('📝'), headerTitle: 'Post a Job' }} />
      <Tab.Screen name="AI"      component={AIScreen}      options={{ tabBarLabel: 'AI Match', tabBarIcon: icon('✨'), headerTitle: 'AI Job Match' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile',  tabBarIcon: icon('👤'), headerTitle: 'My Profile' }} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_BAR_STYLE}>
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: 'Home',     tabBarIcon: icon('🏙️'), headerTitle: 'NandedRozgar 🏙️' }} />
      <Tab.Screen name="Jobs"    component={BoardScreen}   options={{ tabBarLabel: 'Jobs',     tabBarIcon: icon('💼'), headerTitle: 'Find Jobs' }} />
      <Tab.Screen name="Cars"    component={CarsScreen}    options={{ tabBarLabel: 'Cars',     tabBarIcon: icon('🚗'), headerTitle: 'Car Rental' }} />
      <Tab.Screen name="Rooms"   component={RoomsScreen}   options={{ tabBarLabel: 'Rooms',    tabBarIcon: icon('🏠'), headerTitle: 'Rooms & PG' }} />
      <Tab.Screen name="Post"    component={PostScreen}    options={{ tabBarLabel: 'Post Job', tabBarIcon: icon('📝'), headerTitle: 'Post a Job' }} />
      <Tab.Screen name="AI"      component={AIScreen}      options={{ tabBarLabel: 'AI Match', tabBarIcon: icon('✨'), headerTitle: 'AI Job Match' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile',  tabBarIcon: icon('👤'), headerTitle: 'My Profile' }} />
      <Tab.Screen name="Admin"   component={AdminScreen}   options={{ tabBarLabel: 'Admin',    tabBarIcon: icon('⚙️'), headerTitle: 'Admin Panel' }} />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { role } = useAuth();
  if (role === 'admin') return <AdminTabs />;
  if (role === 'giver') return <GiverTabs />;
  return <SeekerTabs />;
}

// ─── Root navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={s.splash}>
        <View style={s.splashIcon}><Text style={{ fontSize: 40 }}>🏙️</Text></View>
        <Text style={s.splashTitle}>NandedRozgar</Text>
        <Text style={s.splashSub}>Jobs · Cars · Rooms · Nanded</Text>
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user
        ? <Stack.Screen name="Login" component={LoginScreen} />
        : <Stack.Screen name="Main"  component={MainTabs} />
      }
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Job Details',
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
      <Stack.Screen
        name="CarDetail"
        component={CarDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostCar"
        component={PostCarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostRoom"
        component={PostRoomScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar barStyle="light-content" backgroundColor="#111111" />
              <RootNavigator />
            </NavigationContainer>
            <Toast />
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  errBox:   { flex:1, alignItems:'center', justifyContent:'center',
               backgroundColor:'#111', padding:32 },
  errEmoji: { fontSize:48, marginBottom:16 },
  errTitle: { color:'#fff', fontSize:20, fontWeight:'800', marginBottom:12, textAlign:'center' },
  errMsg:   { color:'#aaa', fontSize:13, textAlign:'center', marginBottom:24, lineHeight:20 },
  errBtn:   { backgroundColor:'#fff', borderRadius:10, paddingVertical:12, paddingHorizontal:28 },
  errBtnTxt:{ color:'#111', fontWeight:'700', fontSize:14 },

  splash:      { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#111' },
  splashIcon:  { width:80, height:80, backgroundColor:'#222', borderRadius:20,
                 alignItems:'center', justifyContent:'center', marginBottom:16 },
  splashTitle: { color:'#fff', fontSize:28, fontWeight:'800', letterSpacing:0.5 },
  splashSub:   { color:'#888', fontSize:13, marginTop:4 },
});
