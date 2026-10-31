import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, PanResponder, Text, type GestureResponderEvent, type PanResponderCallbacks, type PanResponderGestureState } from 'react-native';
import { SwipeToDelete } from '../src/components/SwipeToDelete';

let callbacks: PanResponderCallbacks;
const event = { nativeEvent: {} } as GestureResponderEvent;
const gesture = (dx: number, dy = 0, touches = 1): PanResponderGestureState => ({
  stateID: 1, dx, dy, x0: 0, y0: 0, moveX: dx, moveY: dy, vx: 0, vy: 0, numberActiveTouches: touches,
});
const onDelete = jest.fn<() => Promise<void>>();
const onTouchActivity = jest.fn<(active: boolean) => void>();

beforeEach(() => {
  onDelete.mockReset().mockResolvedValue(undefined);
  onTouchActivity.mockClear();
  const create = PanResponder.create;
  // The native responder is simulated; Animated and the card's gesture decisions remain real.
  jest.spyOn(PanResponder, 'create').mockImplementation(config => { callbacks = config; return create(config); });
});
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });

async function mount(disabled = false) {
  await render(<SwipeToDelete taskId="one" disabled={disabled} onDelete={onDelete} onTouchActivity={onTouchActivity}>
    {() => <Text>Mi tarea</Text>}
  </SwipeToDelete>);
  await fireEvent(screen.getByTestId('swipe-one'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } } });
}

describe('Swipe to delete', () => {
  it('deletes only when released beyond a third of the card width', async () => {
    await mount();
    await act(() => { callbacks.onPanResponderGrant?.(event, gesture(0)); });
    await act(() => { callbacks.onPanResponderMove?.(event, gesture(120)); });
    expect(onDelete).not.toHaveBeenCalled();
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(120)); });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onTouchActivity).toHaveBeenCalledWith(false);
  });

  it('cancels when pulled back before release even after crossing the threshold', async () => {
    await mount();
    await act(() => { callbacks.onPanResponderGrant?.(event, gesture(0)); });
    await act(() => { callbacks.onPanResponderMove?.(event, gesture(180)); });
    await act(() => { callbacks.onPanResponderMove?.(event, gesture(20)); });
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(20)); });
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Mi tarea')).toBeTruthy();
  });

  it('ignores vertical/left gestures, disabled cards and multi-touch starts', async () => {
    await mount();
    expect(callbacks.onMoveShouldSetPanResponderCapture?.(event, gesture(10, 80))).toBe(false);
    expect(callbacks.onMoveShouldSetPanResponderCapture?.(event, gesture(-100))).toBe(false);
    expect(callbacks.onMoveShouldSetPanResponderCapture?.(event, gesture(100, 0, 2))).toBe(false);
    expect(callbacks.onMoveShouldSetPanResponderCapture?.(event, gesture(50, 3))).toBe(true);
    await cleanup();
    await mount(true);
    expect(callbacks.onMoveShouldSetPanResponderCapture?.(event, gesture(120))).toBe(false);
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(120)); });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('never deletes on interruption or after a second finger joins', async () => {
    await mount();
    await act(() => { callbacks.onPanResponderGrant?.(event, gesture(0)); });
    await act(() => { callbacks.onPanResponderMove?.(event, gesture(150)); });
    await act(() => { callbacks.onPanResponderTerminate?.(event, gesture(150)); });
    expect(onDelete).not.toHaveBeenCalled();
    await act(() => { callbacks.onPanResponderGrant?.(event, gesture(0)); });
    await act(() => { callbacks.onPanResponderMove?.(event, gesture(150, 0, 2)); });
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(150)); });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('prevents repeated deletion while persistence is pending and restores on failure', async () => {
    let reject!: (error: Error) => void;
    onDelete.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await mount();
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(120)); });
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(120)); });
    expect(onDelete).toHaveBeenCalledTimes(1);
    await act(() => { reject(new Error('No se pudo guardar')); });
    expect(alert).toHaveBeenCalledWith('No se pudo eliminar', 'No se pudo guardar');
    expect(screen.getByText('Mi tarea')).toBeTruthy();
    await act(() => { callbacks.onPanResponderRelease?.(event, gesture(120)); });
    expect(onDelete).toHaveBeenCalledTimes(2);
  });
});
