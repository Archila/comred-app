import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Lock, User, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Icon,
  Input,
  MuniLogo,
  Screen,
  Text,
  useNombreMunicipalidad,
} from '@/components';
import { useLogin } from '@/hooks';
import { getVersionApp } from '@/lib';
import { useBrandColors } from '@/store';

// Constante del binario: no cambia mientras la app esta abierta.
const VERSION_APP = getVersionApp();

/**
 * Pantalla de login.
 *
 * Es la plantilla de referencia del flujo vertical de la app:
 *   pantalla -> hook (useLogin) -> action (authActions.login) -> api (httpClient)
 *
 * Es opcional: la app se usa sin cuenta y aqui se llega desde el menu. Por eso
 * tiene "Volver".
 *
 * No navega al terminar: al guardarse la sesion, el guard de `app/_layout.tsx`
 * saca esta pantalla del stack y se vuelve solo a la app.
 */
export default function LoginScreen() {
  const { login, isPending, errorMessage, reset } = useLogin();
  const nombreMunicipalidad = useNombreMunicipalidad();
  const brand = useBrandColors();
  const router = useRouter();

  // Si se entro por enlace directo no hay pantalla detras a la que volver.
  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

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
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
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
    // Fondo azul institucional en ambos temas. Va por `style` y no por clase
    // porque `Screen` ya trae su propio fondo y `cn` no resuelve el conflicto.
    <Screen
      scrollable
      avoidKeyboard
      style={{ backgroundColor: brand.secondary }}
      contentClassName="justify-center gap-6 px-6"
    >
      <StatusBar style="light" />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a la aplicación"
        hitSlop={8}
        onPress={volver}
        disabled={isPending}
        className="flex-row items-center gap-1 self-start py-2 active:opacity-70"
      >
        <Icon as={ChevronLeft} size={22} className="text-secondary-foreground" />
        <Text variant="plain" className="text-base text-secondary-foreground">
          Volver
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-center gap-3">
        <MuniLogo size={64} />
        <View>
          <Text variant="plain" className="text-3xl font-bold leading-9 text-secondary-foreground">COMRED</Text>
          <Text variant="plain" className="text-sm text-secondary-foreground">{nombreMunicipalidad}</Text>
        </View>
      </View>

      <View className="items-center">
        <Icon as={Users} size={56} className="text-secondary-foreground" />
      </View>

      <View className="gap-4 rounded-card bg-surface p-5 dark:bg-surface-dark-muted">
        <View className="gap-1">
          <Text variant="heading" className="text-center">
            Iniciar sesión
          </Text>
          <Text variant="caption" className="text-center">
            Acceso para personal de COMRED, brigadas y COCODES
          </Text>
        </View>

        <Input
          accessibilityLabel="Usuario"
          icon={User}
          placeholder="Usuario"
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
          accessibilityLabel="Contraseña"
          icon={Lock}
          placeholder="Contraseña"
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

        <Button label="Ingresar" fullWidth loading={isPending} onPress={handleSubmit} />
      </View>

      <View className="gap-1">
        <Text variant="plain" className="text-center text-xs text-secondary-200">
          Coordinadora Municipal para la Reducción de Desastres
        </Text>

        {/* Para saber que version tiene cada telefono al dar soporte. */}
        {VERSION_APP.length > 0 && (
          <Text variant="plain" className="text-center text-xs text-secondary-200" selectable>
            {VERSION_APP}
          </Text>
        )}
      </View>
    </Screen>
  );
}
