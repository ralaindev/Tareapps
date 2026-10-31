import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STATUSES, STATUS_LABELS, validateTaskInput, type Task, type TaskStatus } from '../features/tasks/model';
import { useTasks } from '../features/tasks/TasksProvider';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { Button } from './Button';

const TITLE_HELP = 'Obligatorio: entre 1 y 120 caracteres, sin contar los espacios al principio y al final.';

function getTitleError(title: string): string | null {
  try {
    validateTaskInput({ title, description: '', status: 'pending' });
    return null;
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'Escribe un título de entre 1 y 120 caracteres.';
  }
}

export function TaskForm({ task }: { task?: Task }) {
  const { colors, styles, isDark } = useThemedStyles(createStyles);
  const { create, update, remove, busy } = useTasks();
  const [initial] = useState(() => ({ title: task?.title ?? '', description: task?.description ?? '', status: task?.status ?? 'pending' }));
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState<TaskStatus>(initial.status);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const titleValidationError = getTitleError(title);
  const changeTitle = (value: string) => {
    setTitle(value);
    if (titleError) setTitleError(getTitleError(value));
  };
  const dirty = title !== initial.title || description !== initial.description || status !== initial.status;
  const disablePrevention = usePreventRemove(!finished && (dirty || busy), ({ repeat }) => {
    if (busy) return;
    Alert.alert('¿Descartar los cambios?', 'Los cambios sin guardar se perderán.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => { setFinished(true); repeat(); } },
    ]);
  });
  const leave = () => {
    setFinished(true);
    disablePrevention();
    router.dismissTo('/');
  };
  const save = async () => {
    setError(null);
    try {
      const input = { title, description, status: task ? status : 'pending' as const };
      if (task) await update(task.id, input);
      else await create(input);
      leave();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Inténtalo de nuevo.'); }
  };
  const confirmDelete = () => task && Alert.alert('¿Eliminar tarea?', `Se eliminará «${task.title}».`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => {
      void remove(task.id).then(leave).catch(cause => setError(cause instanceof Error ? cause.message : 'No se pudo eliminar.'));
    } },
  ]);

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.dismissTo('/')} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.heading}>{task ? 'Editar tarea' : 'Nueva tarea'}</Text>
    </View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView testID="task-form-fields" style={styles.flex} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.label}>Título <Text style={styles.optional}>· obligatorio</Text></Text>
        <TextInput accessibilityLabel="Título" accessibilityHint={TITLE_HELP} value={title} onChangeText={changeTitle}
          onBlur={() => setTitleError(titleValidationError)} autoFocus={!task}
          editable={!busy} keyboardAppearance={isDark ? 'dark' : 'light'} maxLength={120} placeholder="¿Qué quieres hacer?" placeholderTextColor={colors.muted}
          style={[styles.input, titleError && styles.invalidInput]} selectionColor={colors.primary} multiline textAlignVertical="top" />
        <Text style={styles.help}>{TITLE_HELP}</Text>
        <Text accessibilityLiveRegion="none" style={styles.hint}>{title.trim().length}/120</Text>
        {titleError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{titleError}</Text>}
        <Text style={styles.label}>Descripción <Text style={styles.optional}>· opcional</Text></Text>
        <TextInput accessibilityLabel="Descripción opcional" value={description} onChangeText={setDescription}
          editable={!busy} keyboardAppearance={isDark ? 'dark' : 'light'} maxLength={2000} placeholder="Añade algún detalle…" placeholderTextColor={colors.muted}
          multiline style={[styles.input, styles.description]} selectionColor={colors.primary} textAlignVertical="top" />
        <Text accessibilityLiveRegion="none" style={styles.hint}>{description.length}/2000</Text>
        {task ? <View style={styles.statusSection}>
          <Text style={styles.label}>Estado</Text>
          {STATUSES.map(value => <Pressable key={value} accessibilityRole="radio"
            accessibilityLabel={STATUS_LABELS[value]} accessibilityState={{ checked: status === value, disabled: busy }}
            disabled={busy} onPress={() => setStatus(value)} style={[styles.status, status === value && styles.selectedStatus]}>
            <Text accessible={false} style={[styles.radio, status === value && styles.activeText]}>{status === value ? '●' : '○'}</Text>
            <Text style={[styles.statusText, status === value && styles.activeText]}>{STATUS_LABELS[value]}</Text>
          </Pressable>)}
        </View> : <Text style={styles.pendingNote}>○  Se añadirá a Pendiente</Text>}
        {task && <Pressable accessibilityRole="button" disabled={busy} onPress={confirmDelete} style={styles.delete}>
          <Text style={styles.deleteText}>Eliminar tarea</Text>
        </Pressable>}
      </ScrollView>
      <View style={styles.saveBar} testID="task-form-save-bar">
        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
        <Button label={busy ? 'Guardando…' : task ? 'Guardar cambios' : 'Crear tarea'}
          disabled={busy || !!titleValidationError || description.length > 2000}
          onPress={() => void save()} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 16, flexWrap: 'wrap' },
  cancel: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  cancelText: { color: colors.primary, fontSize: 16 },
  heading: { color: colors.text, fontWeight: '700', fontSize: 20, flexShrink: 1 },
  content: { padding: 24, paddingTop: 12, paddingBottom: 24, gap: 12 },
  saveBar: { paddingHorizontal: 24, paddingVertical: 12, gap: 8, backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 8 },
  optional: { fontWeight: '400', color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18,
    backgroundColor: colors.surface, fontSize: 17, color: colors.text, minHeight: 62 },
  hint: { textAlign: 'right', fontSize: 12, color: colors.muted },
  help: { fontSize: 14, lineHeight: 21, color: colors.muted },
  invalidInput: { borderColor: colors.danger },
  description: { minHeight: 104 },
  statusSection: { gap: 8, marginBottom: 12 },
  status: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    minHeight: 56, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selectedStatus: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { color: colors.muted, fontSize: 20 },
  statusText: { color: colors.text, fontSize: 16, flexShrink: 1 },
  activeText: { color: colors.primary },
  pendingNote: { color: colors.muted, fontSize: 15, marginVertical: 16 },
  error: { color: colors.danger, fontSize: 15, lineHeight: 23, marginBottom: 4 },
  delete: { minHeight: 56, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  deleteText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});
