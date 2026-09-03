import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CounterButtonProps = {
  onPress: () => void;
  size?: number;
  children?: React.ReactNode;
  disabled?: boolean;
};

export function CounterButton({ onPress, size = 200, children, disabled }: CounterButtonProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    if (disabled) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Scale animation
    scale.value = withSequence(
      withTiming(0.92, { duration: 50 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    
    // Glow animation
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 300 })
    );

    onPress();
  };

  return (
    <View style={[styles.wrapper, { width: size + 40, height: size + 40 }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
          },
        ]}
      />
      <AnimatedPressable
        onPressIn={handlePress}
        style={[
          styles.button,
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.innerRing, { width: size - 16, height: size - 16, borderRadius: (size - 16) / 2 }]}>
          {children}
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    ...theme.shadow.gold,
  },
  button: {
    backgroundColor: theme.colors.counterButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadow.gold,
  },
  innerRing: {
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
    borderColor: theme.colors.textMuted,
  },
});