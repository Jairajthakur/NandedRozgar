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
import CarScreen        from './src/screens/CarScreen';
import CarDetailScreen  from './src/screens/CarDetailScreen';
import RoomScreen       from './src/screens/RoomScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import PostCarScreen    from './src/screens/PostCarScreen';
import PostRoomScreen   from './src/screens/PostRoomScreen';
import BuySellScreen    from './src/screens/BuySellScreen';
import { C } from './src/utils/constants';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const ORANGE = '#f97316';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
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

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={s.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isPost = route.name === 'Post';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isPost) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={s.postSlot} activeOpacity={0.85}>
              <View style={s.postBtn}>
                <Text style={s.postBtnText}>+</Text>
              </View>
            </TouchableOpacity>
          );
        }

        const label = options.tabBarLabel || route.name;
        const icon  = options.tabBarIcon?.({ focused: isFocused, color: isFocused ? ORANGE : '#999', size: 22 });

        return (
          <TouchableOpacity key={route.key} onPress={onPress}
            style={s.tabItem} activeOpacity={0.8}>
            {icon}
            <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

const HEADER = {
  headerStyle:      { backgroundColor: '#111111' },
  headerTintColor:  '#ffffff',
  headerTitleStyle: { fontWeight: '800', fontSize: 16 },
};

// ─── Tab Navigators ───────────────────────────────────────────────────────────
function buildTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomTabBar {...props} />} screenOptions={HEADER}>
      <Tab.Screen name="Home"  component={HomeScreen}
        options={{ headerShown: false, tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Jobs"  component={BoardScreen}
        options={{ headerTitle: 'Find Jobs', tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💼" focused={focused} /> }} />
      <Tab.Screen name="Post"  component={PostScreen}
        options={{ headerTitle: 'Post a Job', tabBarLabel: 'Post',
          tabBarIcon: () => null }} />
      <Tab.Screen name="Rooms" component={RoomScreen}
        options={{ headerTitle: 'Rooms & PG', tabBarLabel: 'Rooms',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏢" focused={focused} /> }} />
      <Tab.Screen name="Cars"  component={CarScreen}
        options={{ headerTitle: 'Car Rental', tabBarLabel: 'Cars',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function MainTabs() { return buildTabs(); }

// ─── Root navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={s.splash}>
        <View style={s.splashIcon}>
          <Text style={{ fontSize: 32 }}>🏙️</Text>
        </View>
        <Text style={s.splashTitle}>
          <Text style={{ color: '#fff' }}>Nanded</Text>
          <Text style={{ color: ORANGE }}>Rozgar</Text>
        </Text>
        <Text style={s.splashSub}>Jobs · Cars · Rooms · Nanded</Text>
        <ActivityIndicator color={ORANGE} size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user
        ? <Stack.Screen name="Login"   component={LoginScreen} />
        : <Stack.Screen name="Main"    component={MainTabs} />
      }
      <Stack.Screen name="JobDetail"  component={JobDetailScreen}
        options={{ headerShown: true, headerTitle: 'Job Details', ...HEADER }} />
      <Stack.Screen name="CarDetail"  component={CarDetailScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostCar"    component={PostCarScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="PostRoom"   component={PostRoomScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="BuySell"    component={BuySellScreen}
        options={{ headerShown: true, headerTitle: 'Buy & Sell', ...HEADER }} />
      <Stack.Screen name="Profile"    component={ProfileScreen}
        options={{ headerShown: true, headerTitle: 'My Profile', ...HEADER }} />
      <Stack.Screen name="AIMatch"    component={AIScreen}
        options={{ headerShown: true, headerTitle: 'AI Job Match', ...HEADER }} />
      <Stack.Screen name="Admin"      component={AdminScreen}
        options={{ headerShown: true, headerTitle: 'Admin Panel', ...HEADER }} />
    </Stack.Navigator>
  );
}

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

const s = StyleSheet.create({
  // ── Custom tab bar ──
  tabBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#ebebeb',
    height: 66, paddingBottom: 10, paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4, gap: 3,
  },
  tabLabel:      { fontSize: 10, fontWeight: '500', color: '#999' },
  tabLabelActive:{ fontSize: 10, fontWeight: '700', color: ORANGE },

  // ── Post button ──
  postSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 0 },
  postBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -18,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  postBtnText: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36, marginTop: -2 },

  // ── Error ──
  errBox:    { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#111', padding:32 },
  errEmoji:  { fontSize:48, marginBottom:16 },
  errTitle:  { color:'#fff', fontSize:20, fontWeight:'800', marginBottom:12, textAlign:'center' },
  errMsg:    { color:'#aaa', fontSize:13, textAlign:'center', marginBottom:24, lineHeight:20 },
  errBtn:    { backgroundColor:ORANGE, borderRadius:10, paddingVertical:12, paddingHorizontal:28 },
  errBtnTxt: { color:'#fff', fontWeight:'700', fontSize:14 },

  // ── Splash ──
  splash:      { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#111' },
  splashIcon:  { width:80, height:80, backgroundColor:'#222', borderRadius:20, alignItems:'center', justifyContent:'center', marginBottom:16 },
  splashTitle: { fontSize:28, fontWeight:'900', letterSpacing:0.5 },
  splashSub:   { color:'#888', fontSize:13, marginTop:4 },
});
