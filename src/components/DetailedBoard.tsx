import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { STATUSES, type Task } from '../features/tasks/model';
import { useTasks } from '../features/tasks/TasksProvider';
import { BoardTabs } from './BoardTabs';
import { EmptyColumn } from './EmptyColumn';
import { useReducedMotion } from './Motion';
import { TaskCard } from './TaskCard';

const AnimatedPager = Animated.createAnimatedComponent(PagerView);

export function DetailedBoard({ bottomInset = 88 }: { bottomInset?: number }) {
  const { tasks, busy, move, removeWithUndo, selectedColumn, setSelectedColumn, scrollMemory, creationRevision } = useTasks();
  const [initialOffsets] = useState(() => STATUSES.map(status => ({ x: 0, y: scrollMemory.get(status) })));
  const pendingList = useRef<FlatList<Task>>(null);
  const lastCreation = useRef(creationRevision);
  const pager = useRef<PagerView>(null);
  const reduceMotion = useReducedMotion();
  const settledPage = useRef(selectedColumn);
  const requestedPage = useRef<number | null>(null);
  const [position] = useState(() => new Animated.Value(selectedColumn));
  const [offset] = useState(() => new Animated.Value(0));
  const onPageScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { position, offset } }], { useNativeDriver: true },
  ), [position, offset]);
  const columns = useMemo(() => STATUSES.map(status => tasks.filter(task => task.status === status)), [tasks]);
  const onCardTouch = useCallback((active: boolean) => {
    // The pager must not compete for a gesture that starts on a task card.
    pager.current?.setScrollEnabled(!active);
  }, []);

  useEffect(() => {
    if (!pager.current || requestedPage.current === selectedColumn) return;
    if (requestedPage.current === null && settledPage.current === selectedColumn) return;
    requestedPage.current = selectedColumn;
    if (reduceMotion) pager.current.setPageWithoutAnimation(selectedColumn);
    else pager.current.setPage(selectedColumn);
  }, [selectedColumn, reduceMotion]);

  useEffect(() => {
    if (lastCreation.current !== creationRevision) {
      lastCreation.current = creationRevision;
      pendingList.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [creationRevision]);

  const advance = async (task: Task) => {
    try { await move(task.id, task.status === 'pending' ? 'in_progress' : 'done'); }
    catch (cause) { Alert.alert('No se pudo mover', cause instanceof Error ? cause.message : 'Inténtalo de nuevo.'); }
  };

  return <View style={styles.flex}>
    <BoardTabs selected={selectedColumn} counts={columns.map(column => column.length)}
      position={position} offset={offset} onSelect={setSelectedColumn} />
    <AnimatedPager ref={pager} style={styles.flex} initialPage={selectedColumn}
      offscreenPageLimit={2} overScrollMode="never" onPageScroll={onPageScroll}
      onPageScrollStateChanged={event => {
        if (event.nativeEvent.pageScrollState === 'dragging') requestedPage.current = null;
      }}
      onPageSelected={event => {
        const page = event.nativeEvent.position;
        settledPage.current = page;
        if (requestedPage.current !== null && requestedPage.current !== page) return;
        requestedPage.current = null;
        setSelectedColumn(page);
      }}>
      {STATUSES.map((status, index) => <View key={status} style={styles.flex} collapsable={false}
        accessibilityElementsHidden={selectedColumn !== index}
        importantForAccessibility={selectedColumn === index ? 'auto' : 'no-hide-descendants'}>
        <FlatList ref={status === 'pending' ? pendingList : undefined} testID={`detailed-list-${status}`}
          data={columns[index]} keyExtractor={task => task.id} contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
          contentOffset={initialOffsets[index]} scrollEventThrottle={32}
          onScroll={event => scrollMemory.set(status, event.nativeEvent.contentOffset.y)}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyColumn status={status} firstUse={tasks.length === 0} />}
          renderItem={({ item }) => <TaskCard task={item} busy={busy}
            onDelete={() => removeWithUndo(item.id)} onTouchActivity={onCardTouch}
            onEdit={() => router.push({ pathname: '/task', params: { id: item.id } })}
            onAdvance={() => void advance(item)} />} />
      </View>)}
    </AnimatedPager>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, flexGrow: 1 },
});
