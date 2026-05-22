import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { useAuth } from '../../lib/hooks/useAuth';
import { useSubscriptionInit } from '../../lib/hooks/useSubscription';
import { Theme } from '../../theme';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  MessageCircle, 
  Trophy, 
  UserCircle,
  ShieldAlert
} from 'lucide-react-native';

function TabIcon({ Icon, focused, color, size = 22 }: { Icon: any; focused: boolean; color: string; size?: number }) {
  return (
    <View className="items-center justify-center pt-1">
      <Icon size={size} color={color} strokeWidth={focused ? 3 : 2} />
      {focused && (
        <View 
          className="absolute -bottom-3 w-1 h-1 rounded-full bg-white" 
          style={{ 
            shadowColor: '#ffffff', 
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 10, 
            shadowOpacity: 1, 
            elevation: 10 
          }} 
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  useSubscriptionInit();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#475569',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10, 15, 29, 0.95)',
          borderTopWidth: 0,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 32 : 20,
          left: 20,
          right: 20,
          height: 72,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.05)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 20,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={LayoutDashboard} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={PlusCircle} focused={focused} color={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="intercept"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ShieldAlert} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={BarChart3} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MessageCircle} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Trophy} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={UserCircle} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
