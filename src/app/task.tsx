import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { TaskForm } from '../components/TaskForm';
import { Button } from '../components/Button';
import { useTasks } from '../features/tasks/TasksProvider';
import { useTheme } from '../theme/ThemeProvider';

export default function TaskScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { tasks, loading, error, reload } = useTasks();
  const task = id ? tasks.find(item => item.id === id) : undefined;
  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} color={colors.primary} accessibilityLabel="Cargando tarea" />;
  if (error || (id && !task)) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20, backgroundColor: colors.background }}>
    <Text style={{ color: colors.text }}>{error ?? 'Esta tarea ya no existe.'}</Text>
    {error && <Button label="Reintentar" onPress={() => void reload()} />}
    <Button label="Volver al tablero" onPress={() => router.dismissTo('/')} />
  </View>;
  return <TaskForm key={id ?? 'new'} task={task} />;
}
