import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { STATUSES, STATUS_LABELS, type Task, type TaskStatus } from '../features/tasks/model';
import { useTasks } from '../features/tasks/TasksProvider';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { CompactTaskCard } from './CompactTaskCard';

type TaskSection = { key: TaskStatus; data: Task[] };
const symbols = { pending: '○', in_progress: '◉', done: '✓' };

export function CompactBoard({ bottomInset = 88 }: { bottomInset?: number }) {
  const { styles } = useThemedStyles(createStyles);
  const { tasks, busy, creationRevision, removeWithUndo, scrollMemory } = useTasks();
  const [initialOffset] = useState(() => ({ x: 0, y: scrollMemory.get('compact') }));
  const lastCreation = useRef(creationRevision);
  const list = useRef<SectionList<Task, TaskSection>>(null);
  const sections = useMemo(() => STATUSES.map(status => ({ key: status, data: tasks.filter(task => task.status === status) })), [tasks]);
  useEffect(() => {
    if (lastCreation.current !== creationRevision) {
      lastCreation.current = creationRevision;
      list.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
    }
  }, [creationRevision]);

  return <SectionList ref={list} testID="compact-board" sections={sections} extraData={busy}
    keyExtractor={task => task.id} contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
    contentOffset={initialOffset} scrollEventThrottle={32}
    onScroll={event => scrollMemory.set('compact', event.nativeEvent.contentOffset.y)}
    stickySectionHeadersEnabled showsVerticalScrollIndicator={false}
    renderSectionHeader={({ section }) => <View style={styles.headerBackdrop} accessible accessibilityRole="header"
      accessibilityLabel={`${STATUS_LABELS[section.key]}, ${section.data.length} tareas`}>
      <View style={[styles.header, section.key === 'pending' ? styles.pendingHeader
        : section.key === 'done' ? styles.doneHeader : styles.progressHeader]}>
        <Text accessible={false} style={[styles.symbol, section.key === 'pending' ? styles.pendingText
          : section.key === 'done' ? styles.doneText : styles.progressText]}>{symbols[section.key]}</Text>
        <Text style={styles.heading}>{STATUS_LABELS[section.key]}</Text>
        <View style={styles.countBadge}>
          <Text style={[styles.count, section.key === 'pending' ? styles.pendingText
            : section.key === 'done' ? styles.doneText : styles.progressText]}>{section.data.length}</Text>
        </View>
      </View>
    </View>}
    renderItem={({ item }) => <CompactTaskCard task={item} busy={busy}
      onDelete={() => removeWithUndo(item.id)}
      onEdit={() => router.push({ pathname: '/task', params: { id: item.id } })} />}
    renderSectionFooter={({ section }) => <View style={[styles.sectionEnd, section.key === 'done' && styles.lastSection]}>
      {section.data.length === 0 && <Text style={styles.empty}>Sin tareas en este estado</Text>}
      {section.key !== 'done' && <View style={styles.divider} />}
    </View>} />;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 12 },
  // An opaque backdrop prevents scrolling cards from showing through the sticky header.
  headerBackdrop: { backgroundColor: colors.background, paddingTop: 8, paddingBottom: 10 },
  header: { minHeight: 56, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    borderLeftWidth: 3, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingHeader: { backgroundColor: colors.track, borderLeftColor: colors.muted },
  progressHeader: { backgroundColor: colors.primarySoft, borderLeftColor: colors.primary },
  doneHeader: { backgroundColor: colors.successSoft, borderLeftColor: colors.success },
  symbol: { fontSize: 19 },
  pendingText: { color: colors.muted },
  progressText: { color: colors.primary },
  doneText: { color: colors.success },
  heading: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700', flex: 1 },
  countBadge: { backgroundColor: colors.surface, borderRadius: 10, minWidth: 30,
    minHeight: 28, paddingHorizontal: 9, paddingVertical: 4, justifyContent: 'center', alignItems: 'center' },
  count: { fontSize: 13, fontWeight: '700' },
  sectionEnd: { paddingBottom: 16 },
  lastSection: { paddingBottom: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: 8 },
  empty: { color: colors.muted, fontSize: 14, paddingHorizontal: 14, paddingVertical: 8 },
});
