import { useEffect, useRef, type ComponentRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { STATUSES, STATUS_LABELS } from '../features/tasks/model';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { useReducedMotion } from './Motion';

export function BoardTabs({ selected, counts, position, offset, onSelect }: {
  selected: number; counts: number[]; position: Animated.Value; offset: Animated.Value;
  onSelect: (index: number) => void;
}) {
  const { styles } = useThemedStyles(createStyles);
  const { width, fontScale } = useWindowDimensions();
  const tabWidth = Math.max((width - 56) / 3, 112 * fontScale);
  const reduced = useReducedMotion();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, selected * tabWidth - tabWidth / 2), animated: !reduced });
  }, [selected, tabWidth, reduced]);

  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
    style={styles.scroll} contentContainerStyle={styles.track}>
    <Animated.View pointerEvents="none" style={[styles.indicator, { width: tabWidth,
      transform: [{ translateX: reduced ? selected * tabWidth : Animated.multiply(Animated.add(position, offset), tabWidth) }],
    }]} />
    {STATUSES.map((status, index) => <Pressable key={status} accessibilityRole="tab"
      accessibilityLabel={`${STATUS_LABELS[status]}, ${counts[index]} tareas`}
      accessibilityState={{ selected: selected === index }} onPress={() => onSelect(index)}
      style={({ pressed }) => [styles.tab, { width: tabWidth }, pressed && styles.pressed]}>
      <Text style={[styles.label, selected === index && styles.active]}>{STATUS_LABELS[status]}</Text>
      <Text style={[styles.count, selected === index && styles.active]}>{counts[index]}</Text>
    </Pressable>)}
  </ScrollView>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0, marginHorizontal: 24, marginBottom: 20, borderRadius: 20, backgroundColor: colors.track },
  track: { padding: 4 },
  indicator: { position: 'absolute', top: 4, bottom: 4, left: 4, backgroundColor: colors.surface,
    borderRadius: 16, borderBottomWidth: 2, borderBottomColor: colors.primary, boxShadow: colors.subtleShadow },
  tab: { minHeight: 48, paddingHorizontal: 8, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  count: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  active: { color: colors.primary },
  pressed: { opacity: 0.65 },
});
