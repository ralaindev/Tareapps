import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

const ReducedMotion = createContext(true);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduced(value);
    }).catch(() => undefined);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}

export const useReducedMotion = () => useContext(ReducedMotion);

export function usePressFeedback() {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const animate = (pressed: boolean) => {
    scale.stopAnimation();
    if (reduced) { scale.setValue(1); return; }
    Animated.spring(scale, {
      toValue: pressed ? 0.975 : 1, stiffness: 420, damping: 30, mass: 0.7,
      useNativeDriver: true, isInteraction: false,
    }).start();
  };
  return {
    style: { transform: [{ scale: reduced ? 1 : scale }] },
    onPressIn: () => animate(true),
    onPressOut: () => animate(false),
  };
}

/** Short, non-blocking entrance. Never delays an action or runs on every render. */
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 200, easing: Easing.out(Easing.cubic),
      useNativeDriver: true, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  return <Animated.View style={[style, !reduced && {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  }]}>{children}</Animated.View>;
}
