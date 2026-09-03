import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../providers/LanguageProvider';
import { theme } from '../../constants/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    counter: '📿',
    profile: '👤',
  };
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Text style={[styles.icon, focused && styles.iconActive]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="counter"
        options={{
          title: t.counter,
          tabBarIcon: ({ focused }) => <TabIcon name="counter" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.tabBar,
    borderTopColor: theme.colors.tabBarBorder,
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
    paddingBottom: 20,
  },
  tabBarLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  iconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    fontSize: 22,
  },
});