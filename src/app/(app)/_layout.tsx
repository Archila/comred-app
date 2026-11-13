import { Tabs, useRouter } from 'expo-router';
import { Bell, House, Megaphone, UserRound } from 'lucide-react-native';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants';
import { useCapacidadesEnvio, useNoLeidos } from '@/hooks';
import { useBrandColors, useMensajeAbierto, usePushStore } from '@/store';

/**
 * Rutas privadas. Solo se montan cuando hay sesion activa (ver el guard en
 * `app/_layout.tsx`). Aqui se agregan los tabs de los modulos de COMRED.
 *
 * React Navigation no acepta `className` en la tab bar, por eso los colores
 * se leen del store de marca en lugar de usar clases de Tailwind.
 */
export default function AppLayout() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;
  const brand = useBrandColors();
  const { noLeidos } = useNoLeidos();
  // Mientras carga, o si falla, la pestana no aparece: es preferible a
  // ensenarla y que luego diga "no tienes permiso". La ve quien puede enviar
  // y tambien quien solo puede consultar lo enviado (rol "Consulta").
  const { data: capacidades } = useCapacidadesEnvio();
  const veMensajes = Boolean(capacidades?.puedeEnviar || capacidades?.puedeVerHistorial);

  useAbrirMensajeTocado();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: palette.textSubtle,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: noLeidos > 0 ? (noLeidos > 99 ? '99+' : noLeidos) : undefined,
        }}
      />
      {/*
        Envio e historial de avisos. `Tabs.Protected` saca la ruta entera, no
        solo el boton: un vecino no puede llegar a ella ni con un enlace. Es
        comodidad, no seguridad: el API valida cada envio y cada lectura.
        La cabecera la pinta el Stack de `mensajes/_layout.tsx`.
      */}
      <Tabs.Protected guard={veMensajes}>
        <Tabs.Screen
          name="mensajes"
          options={{
            title: 'Enviar',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} />,
          }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

/**
 * Lleva a la bandeja el aviso que se abrio desde una notificacion.
 *
 * Vive aqui y no en `PushProvider` porque solo aqui hay pantallas montadas
 * donde aterrizar. Si el tap llego sin sesion, el mensaje espera en el store y
 * se abre al entrar.
 */
function useAbrirMensajeTocado() {
  const router = useRouter();
  const mensajeAbierto = useMensajeAbierto();
  const consumir = usePushStore((state) => state.consumirMensajeAbierto);

  useEffect(() => {
    if (!mensajeAbierto) return;

    const mensajeId = consumir();
    if (mensajeId) router.navigate({ pathname: '/avisos', params: { mensajeId } });
  }, [mensajeAbierto, consumir, router]);
}
