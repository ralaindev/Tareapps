import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type BoardViewMode } from '../features/preferences/repository';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { BoardIcon } from './BoardIcon';

export function BoardViewToggle({ value, disabled, onChange, dark, onToggleTheme }: {
  value: BoardViewMode; disabled: boolean; onChange: (mode: BoardViewMode) => void;
  dark: boolean; onToggleTheme: () => void;
}) {
  const { styles, colors } = useThemedStyles(createStyles);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const nextMode = value === 'detailed' ? 'compact' : 'detailed';
  const nextLabel = nextMode === 'compact' ? 'Vista compacta' : 'Vista detallada';
  useEffect(() => {
    if (!tooltip) return;
    const timer = setTimeout(() => setTooltip(null), 2200);
    return () => clearTimeout(timer);
  }, [tooltip]);
  return <View style={styles.row}>
  <Pressable accessibilityRole="button" accessibilityLabel={`Cambiar a ${nextLabel.toLowerCase()}`}
    accessibilityValue={{ text: value === 'compact' ? 'Vista actual: compacta' : 'Vista actual: detallada' }}
    accessibilityState={{ disabled }} disabled={disabled}
    onPress={() => { setTooltip(null); onChange(nextMode); }} onLongPress={() => setTooltip(nextLabel)}
    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
    <BoardIcon name={nextMode} color={colors.primary} />
  </Pressable>
  <Pressable accessibilityRole="switch" accessibilityLabel="Modo oscuro"
    accessibilityHint={dark ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro'}
    accessibilityState={{ checked: dark, disabled }} disabled={disabled}
    onPress={() => { setTooltip(null); onToggleTheme(); }}
    onLongPress={() => setTooltip(dark ? 'Tema claro' : 'Tema oscuro')}
    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
    <BoardIcon name={dark ? 'sun' : 'moon'} color={colors.primary} />
  </Pressable>
  {tooltip && <View pointerEvents="none" style={styles.tooltip}>
    <Text accessibilityLiveRegion="polite" style={styles.tooltipText}>{tooltip}</Text>
  </View>}
  </View>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 48, height: 48, backgroundColor: colors.track, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center' },
  tooltip: { position: 'absolute', top: 56, right: 0, minWidth: 152, padding: 12,
    borderRadius: 12, backgroundColor: colors.notice, boxShadow: colors.subtleShadow, zIndex: 1, elevation: 4 },
  tooltipText: { color: colors.onNotice, fontSize: 14, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
