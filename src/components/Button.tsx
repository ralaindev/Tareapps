import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { type Palette } from '../theme/tokens';
import { useThemedStyles } from '../theme/ThemeProvider';
import { usePressFeedback } from './Motion';

export function Button({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  const feedback = usePressFeedback();
  const { styles } = useThemedStyles(createStyles);
  return (
    <Animated.View style={feedback.style}>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut}
      onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary,
        disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  button: { backgroundColor: colors.button, minHeight: 60, borderRadius: 20, padding: 18,
    justifyContent: 'center', alignItems: 'center', boxShadow: colors.buttonShadow },
  secondary: { backgroundColor: colors.primarySoft },
  label: { color: colors.onButton, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryLabel: { color: colors.primary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
