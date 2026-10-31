import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, Easing, PanResponder, StyleSheet, View, type PanResponderGestureState } from 'react-native';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { BoardIcon } from './BoardIcon';
import { useReducedMotion } from './Motion';

export function SwipeToDelete({ children, disabled, onDelete, onTouchActivity, radius = 26, taskId }: {
  children: (deleteTask: () => void, deleting: boolean) => ReactNode;
  disabled: boolean; onDelete: () => Promise<void>; onTouchActivity?: (active: boolean) => void;
  radius?: number; taskId: string;
}) {
  const { colors, styles } = useThemedStyles(createStyles);
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(320);
  const [translation] = useState(() => new Animated.Value(0));
  const [deleting, setDeleting] = useState(false);
  const committing = useRef(false);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const threshold = width / 3;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; translation.stopAnimation(); onTouchActivity?.(false); };
  }, [translation, onTouchActivity]);

  const reset = useCallback(() => {
    translation.stopAnimation();
    if (reduced) translation.setValue(0);
    else Animated.spring(translation, {
      toValue: 0, stiffness: 360, damping: 32, mass: 0.8, useNativeDriver: true, isInteraction: false,
    }).start();
  }, [reduced, translation]);

  const deleteTask = useCallback(() => {
    if (committing.current) return;
    if (disabled) { reset(); return; }
    committing.current = true;
    setDeleting(true);
    onTouchActivity?.(false);
    const commit = async () => {
      try { await onDelete(); }
      catch (cause) {
        if (mounted.current) {
          reset();
          Alert.alert('No se pudo eliminar', cause instanceof Error ? cause.message : 'Inténtalo de nuevo.');
        }
      } finally {
        committing.current = false;
        if (mounted.current) setDeleting(false);
      }
    };
    if (!reduced) Animated.timing(translation, {
      toValue: width, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false,
    }).start();
    // Persistence starts on release, independently of the animation or a later view change.
    void commit();
  }, [disabled, onDelete, onTouchActivity, reduced, reset, translation, width]);

  // Recreate only when props/layout change; following the finger never renders React state.
  const responder = useMemo(() => {
    const shouldCapture = (_event: unknown, gesture: PanResponderGestureState) =>
      !disabled && !committing.current && gesture.numberActiveTouches === 1
      && gesture.dx > 12 && gesture.dx > Math.abs(gesture.dy) * 1.5;
    // These callbacks are registered here and only read refs when a native gesture fires.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onMoveShouldSetPanResponder: shouldCapture,
      onMoveShouldSetPanResponderCapture: shouldCapture,
      onPanResponderGrant: () => { cancelled.current = false; translation.stopAnimation(); },
      onPanResponderStart: (_event, gesture) => {
        if (gesture.numberActiveTouches > 1) { cancelled.current = true; reset(); }
      },
      onPanResponderMove: (_event, gesture) => {
        if (gesture.numberActiveTouches !== 1) { cancelled.current = true; reset(); return; }
        if (!cancelled.current) translation.setValue(Math.max(0, Math.min(width, gesture.dx)));
      },
      onPanResponderRelease: (_event, gesture) => {
        onTouchActivity?.(false);
        if (!cancelled.current && gesture.dx >= threshold) deleteTask();
        else reset();
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => { onTouchActivity?.(false); reset(); },
    });
  }, [disabled, width, threshold, deleteTask, reset, onTouchActivity, translation]);

  return <View style={{ borderRadius: radius, boxShadow: colors.subtleShadow }}>
  <View testID={`swipe-${taskId}`} style={[styles.container, { borderRadius: radius }]}
    onLayout={event => setWidth(Math.max(1, event.nativeEvent.layout.width))}
    onTouchStart={() => { if (!disabled) onTouchActivity?.(true); }}
    onTouchEnd={event => { if (event.nativeEvent.touches.length === 0) onTouchActivity?.(false); }}
    onTouchCancel={() => onTouchActivity?.(false)} {...responder.panHandlers}>
    <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants" style={[styles.background, {
        borderRadius: radius,
        opacity: translation.interpolate({ inputRange: [0, 12, threshold], outputRange: [0, 0.65, 1], extrapolate: 'clamp' }),
      }]}>
      <Animated.View style={{ opacity: translation.interpolate({ inputRange: [0, threshold], outputRange: [0.25, 1], extrapolate: 'clamp' }),
        transform: [{ scale: translation.interpolate({ inputRange: [0, threshold], outputRange: [0.75, 1.2], extrapolate: 'clamp' }) }] }}>
        <View style={styles.iconContainer}>
          <BoardIcon name="trash" color={colors.onDeleteBackground} />
          <Animated.View style={[styles.readyMark, {
            opacity: translation.interpolate({ inputRange: [Math.max(0, threshold - 1), threshold], outputRange: [0, 1], extrapolate: 'clamp' }),
          }]}>
            <BoardIcon name="trash" color={colors.deleteBackground} />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
    <Animated.View pointerEvents={deleting ? 'none' : 'auto'} style={{ transform: [{ translateX: translation }] }}>
      {/* The render callback receives deleteTask as an event handler, never invokes it. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {children(deleteTask, deleting)}
    </Animated.View>
  </View>
  </View>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { overflow: 'hidden' },
  iconContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  readyMark: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 12,
    backgroundColor: colors.onDeleteBackground, alignItems: 'center', justifyContent: 'center' },
  background: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.deleteBackground, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 28 },
});
