import { Stack } from 'expo-router';

/** Rutas publicas: solo accesibles cuando NO hay sesion. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
