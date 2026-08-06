import { Lock, User } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { useLogin } from '@/hooks';

/**
 * Pantalla de login.
 *
 * Es la plantilla de referencia del flujo vertical de la app:
 *   pantalla -> hook (useLogin) -> action (authActions.login) -> api (httpClient)
 *
 * No navega al terminar: al guardarse la sesion, el guard de `app/_layout.tsx`
 * cambia de grupo de rutas automaticamente.
 */
export default function LoginScreen() {
  const { login, isPending, errorMessage, reset } = useLogin();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ userName?: string; password?: string }>({});

  // Mismas reglas que el LoginDto del API, para no gastar un viaje de red.
  function validate(): boolean {
    const errors: typeof fieldErrors = {};

    if (userName.trim().length < 3) {
      errors.userName = 'El usuario debe tener al menos 3 caracteres.';
    }
    if (password.length < 6) {
      errors.password = 'La contrasena debe tener al menos 6 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    reset();
    if (!validate()) return;

    login({ userName: userName.trim(), password });
  }

  return (
    <Screen scrollable avoidKeyboard contentClassName="justify-center gap-6 px-6">
      <View className="items-center gap-2">
        <View className="h-16 w-16 items-center justify-center rounded-card bg-primary-500">
          <Text className="text-2xl font-bold text-white">CR</Text>
        </View>
        <Text variant="title">COMRED</Text>
        <Text variant="subtitle" className="text-center">
          Ingresa con tu usuario institucional
        </Text>
      </View>

      <View className="gap-4">
        <Input
          label="Usuario"
          icon={User}
          placeholder="usuario.institucional"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          value={userName}
          onChangeText={setUserName}
          error={fieldErrors.userName}
          editable={!isPending}
        />

        <Input
          label="Contrasena"
          icon={Lock}
          placeholder="********"
          isPassword
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          error={fieldErrors.password}
          editable={!isPending}
        />

        {errorMessage && (
          <View className="rounded-field border border-danger-500 bg-danger-50 p-3 dark:bg-danger-500/10">
            <Text variant="error">{errorMessage}</Text>
          </View>
        )}

        <Button label="Iniciar sesion" fullWidth loading={isPending} onPress={handleSubmit} />
      </View>

      <Text variant="caption" className="text-center">
        Sistema de Coordinacion Municipal para la Reduccion de Desastres
      </Text>
    </Screen>
  );
}
