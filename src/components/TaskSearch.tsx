import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTasks } from '../features/tasks/TasksProvider';
import type { Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';

export function TaskSearch() {
  const { searchQuery, setSearchQuery } = useTasks();
  const { colors, styles, isDark } = useThemedStyles(createStyles);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  return <View style={styles.container}>
    <TextInput ref={input} accessibilityLabel="Buscar tareas"
      accessibilityHint="Busca una frase en el título o la descripción, sin distinguir mayúsculas ni tildes."
      placeholder="Buscar tareas…" placeholderTextColor={colors.muted}
      value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false}
      autoComplete="off" returnKeyType="search" keyboardAppearance={isDark ? 'dark' : 'light'}
      selectionColor={colors.primary} style={styles.input} />
    {!!searchQuery && <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda"
      style={styles.clear} onPress={() => { setSearchQuery(''); input.current?.focus(); }}>
      <Text accessible={false} style={styles.clearText}>×</Text>
    </Pressable>}
  </View>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text },
  clear: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: colors.primary, fontSize: 24 },
});
