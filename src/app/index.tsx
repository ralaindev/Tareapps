import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BoardViewToggle } from '../components/BoardViewToggle';
import { Button } from '../components/Button';
import { CompactBoard } from '../components/CompactBoard';
import { DetailedBoard } from '../components/DetailedBoard';
import { FadeIn } from '../components/Motion';
import { useBoardPreferences } from '../features/preferences/BoardPreferencesProvider';
import { useTasks } from '../features/tasks/TasksProvider';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';

export default function BoardScreen() {
  const { colors, styles } = useThemedStyles(createStyles);
  const { loading, error, busy, reload, undo, undoNotice, dismissUndo } = useTasks();
  const preferences = useBoardPreferences();
  const initialLoading = loading || preferences.loading;
  const { fontScale } = useWindowDimensions();
  const bottomInset = Math.max(88, Math.round(88 * fontScale));

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.heading}>Mi tablero</Text>
      <BoardViewToggle value={preferences.viewMode} disabled={preferences.loading || preferences.saving}
      dark={preferences.themeMode === 'dark'}
      onToggleTheme={() => void preferences.changeThemeMode(preferences.themeMode === 'dark' ? 'light' : 'dark')
        .catch(() => Alert.alert('No se pudo cambiar de tema', 'Inténtalo de nuevo. Tu preferencia anterior se conserva.'))}
      onChange={mode => void preferences.changeViewMode(mode).catch(() =>
        Alert.alert('No se pudo cambiar de vista', 'No se ha podido guardar la preferencia. Inténtalo de nuevo.'))} />
    </View>
    {preferences.error && <Text accessibilityRole="alert" style={styles.preferenceError}>{preferences.error}</Text>}
    <View style={styles.content} testID="board-content">
    {initialLoading ? <View style={styles.center}><ActivityIndicator color={colors.primary} accessibilityLabel="Cargando tablero" /></View>
      : error ? <View style={styles.center}><Text style={styles.error}>{error}</Text>
        <Button label="Reintentar" onPress={() => void reload()} disabled={busy} /></View>
        : <FadeIn key={preferences.viewMode} style={styles.content}>
          {preferences.viewMode === 'compact' ? <CompactBoard bottomInset={bottomInset} /> : <DetailedBoard bottomInset={bottomInset} />}
        </FadeIn>}
      {undoNotice && <FadeIn key={undoNotice.taskId} style={styles.notice}>
        <Text style={styles.noticeText}>{undoNotice.message}</Text>
        <Pressable accessibilityRole="button" disabled={busy} style={styles.noticeAction}
          onPress={() => void undo().catch(cause => Alert.alert('No se pudo deshacer', message(cause)))}>
          <Text style={styles.undoText}>Deshacer</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" style={styles.close}
          onPress={dismissUndo}><Text style={styles.noticeText}>×</Text></Pressable>
      </FadeIn>}
    </View>
    <View style={styles.footer} testID="board-footer">
      <Button label="＋ Nueva tarea" disabled={initialLoading || !!error || busy} onPress={() => router.push('/task')} />
    </View>
  </SafeAreaView>;
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : 'Inténtalo de nuevo.'; }

const createStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 },
  heading: { color: colors.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.6, flex: 1 },
  content: { flex: 1 },
  center: { flex: 1, padding: 24, gap: 20, justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 16, textAlign: 'center' },
  preferenceError: { color: colors.danger, fontSize: 13, marginHorizontal: 24, marginBottom: 8 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, gap: 12 },
  notice: { position: 'absolute', bottom: 8, left: 24, right: 24, zIndex: 1, elevation: 4,
    backgroundColor: colors.notice, borderRadius: 16, paddingLeft: 16, boxShadow: colors.cardShadow,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  noticeText: { color: colors.onNotice, fontSize: 15, flexShrink: 1 },
  noticeAction: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', marginLeft: 'auto' },
  undoText: { color: colors.noticeAction, fontWeight: '700', fontSize: 15 },
  close: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
});
