import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Task } from '../features/tasks/model';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { FadeIn, usePressFeedback } from './Motion';
import { SwipeToDelete } from './SwipeToDelete';

export function TaskCard({ task, busy, onEdit, onAdvance, onDelete, onTouchActivity }: {
  task: Task; busy: boolean; onEdit: () => void; onAdvance: () => void;
  onDelete: () => Promise<void>; onTouchActivity?: (active: boolean) => void;
}) {
  const { colors, styles } = useThemedStyles(createStyles);
  const completed = task.status === 'done';
  const action = task.status === 'pending' ? 'Empezar' : 'Completar';
  const feedback = usePressFeedback();
  const accent = completed ? colors.success : colors.primary;
  return (
    <FadeIn style={styles.wrapper}>
    <SwipeToDelete taskId={task.id} disabled={busy} onDelete={onDelete} onTouchActivity={onTouchActivity}>
    {(deleteTask, deleting) => <>
    <Animated.View style={[styles.card, feedback.style]}>
      <View pointerEvents="none" style={[styles.accent, { backgroundColor: accent }]} />
      <Pressable onPress={onEdit} disabled={busy || deleting} accessibilityRole="button"
        accessibilityActions={[{ name: 'delete', label: 'Eliminar tarea' }]}
        onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') deleteTask(); }}
        onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut}
        accessibilityState={{ disabled: busy || deleting }}
        accessibilityLabel={`Editar: ${task.title}${task.description ? `. ${task.description}` : ''}`}
        style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[styles.title, completed && { color: colors.muted }]}>{task.title}</Text>
        </View>
        {!!task.description && <Text numberOfLines={2} style={styles.description}>{task.description}</Text>}
      </Pressable>
      {!completed && <View style={styles.actionRow}>
        <Pressable onPress={onAdvance} disabled={busy || deleting} accessibilityRole="button"
        onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut}
        accessibilityLabel={`${action}: ${task.title}`} accessibilityState={{ disabled: busy || deleting }}
        style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
        <Text style={styles.actionText}>{action} {task.status === 'pending' ? '→' : '✓'}</Text>
      </Pressable></View>}
    </Animated.View>
    </>}
    </SwipeToDelete>
    </FadeIn>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  wrapper: { marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 26, borderWidth: 1,
    borderColor: colors.border, boxShadow: colors.cardShadow },
  accent: { position: 'absolute', top: 26, left: 0, width: 4, height: 28, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  content: { padding: 24, minHeight: 88 },
  titleRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', flex: 1, lineHeight: 30, letterSpacing: -0.4 },
  description: { marginTop: 10, color: colors.muted, fontSize: 16, lineHeight: 24 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: 24, paddingVertical: 12, gap: 8 },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.primarySoft, marginLeft: 'auto' },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
});
