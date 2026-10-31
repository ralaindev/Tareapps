import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { STATUS_LABELS, type Task } from '../features/tasks/model';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { usePressFeedback } from './Motion';
import { SwipeToDelete } from './SwipeToDelete';

export function CompactTaskCard({ task, busy, onEdit, onDelete }: {
  task: Task; busy: boolean; onEdit: () => void; onDelete: () => Promise<void>;
}) {
  const { styles } = useThemedStyles(createStyles);
  const feedback = usePressFeedback();
  return <View style={styles.wrapper}><SwipeToDelete taskId={task.id} disabled={busy} onDelete={onDelete} radius={16}>
    {(deleteTask, deleting) => <Animated.View style={[styles.card, feedback.style]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar: ${task.title}. ${STATUS_LABELS[task.status]}`}
      accessibilityState={{ disabled: busy || deleting }} disabled={busy || deleting} onPress={onEdit}
      accessibilityActions={[{ name: 'delete', label: 'Eliminar tarea' }]}
      onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') deleteTask(); }}
      onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut} style={styles.content}>
      <Text numberOfLines={2} style={styles.title}>{task.title}</Text>
    </Pressable>
  </Animated.View>}
  </SwipeToDelete></View>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  wrapper: { marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    boxShadow: colors.subtleShadow },
  content: { minHeight: 60, paddingVertical: 16, paddingHorizontal: 18, justifyContent: 'center' },
  title: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: colors.text },
});
