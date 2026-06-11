// Password input with an inline "show / hide" eye toggle. Drop-in replacement
// for `<Input secureTextEntry … />` — same look, same validation hooks, just
// adds the visibility affordance signup flows expect today.
//
// Usage:
//   <PasswordInput label="Mot de passe" value={pwd} onChangeText={setPwd} />

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radii, spacing } from '../../theme/theme';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function PasswordInput({
  label,
  error,
  hint,
  style,
  ...rest
}: PasswordInputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          error && styles.inputRowError,
        ]}
      >
        <TextInput
          {...rest}
          secureTextEntry={!revealed}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, style]}
        />
        <TouchableOpacity
          onPress={() => setRevealed((v) => !v)}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.eyeBtn}
          accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textLight}
          />
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingRight: spacing.sm,
  },
  inputRowFocused: { borderColor: colors.primary },
  inputRowError: { borderColor: colors.error },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  errorText: { fontSize: 12, color: colors.error, marginTop: spacing.xs },
  hintText: { fontSize: 12, color: colors.textLight, marginTop: spacing.xs },
});
