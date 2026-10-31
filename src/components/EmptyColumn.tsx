import { StyleSheet, Text, View } from 'react-native';
import { type TaskStatus } from '../features/tasks/model';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';

export function EmptyColumn({ status, firstUse }: { status: TaskStatus; firstUse: boolean }) {
  const { styles } = useThemedStyles(createStyles);
  const title = status === 'pending'
    ? (firstUse ? 'Tu tablero empieza aquí' : 'Todo al día por aquí')
    : status === 'in_progress' ? 'Nada en marcha' : 'Aquí verás lo que completes';
  const subtitle = status === 'pending'
    ? (firstUse ? 'Añade tu primera tarea.' : 'Puedes añadir una nueva tarea cuando quieras.')
    : status === 'in_progress' ? 'Empieza una tarea de Pendiente.' : 'Las tareas terminadas aparecerán en esta sección.';
  return <View style={styles.container}>
    <View style={styles.icon}><Text accessible={false} style={styles.symbol}>{status === 'done' ? '✓' : '◇'}</Text></View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  icon: { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  symbol: { color: colors.primary, fontSize: 40 },
  title: { color: colors.text, fontWeight: '600', fontSize: 21, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 280 },
});
