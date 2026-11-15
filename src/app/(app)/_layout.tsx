import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppHeader, BotonMenu, MenuLateral } from '@/components';
import { buscarSeccion } from '@/constants';
import { useCapacidadesEnvio } from '@/hooks';
import { useIsAuthenticated, useMensajeAbierto, usePushStore } from '@/store';

/**
 * Pantallas de la app. Se montan siempre, con o sin sesion (modo publico):
 * inicio, avisos y las secciones son para cualquier vecino. Lo que necesita
 * usuario —perfil y envio de avisos— va dentro de `Tabs.Protected`.
 *
 * Sigue siendo un navegador de pestanas —cada pantalla conserva su estado al
 * cambiar de seccion— pero sin barra inferior: la navegacion la hacen el
 * encabezado institucional (`AppHeader`) y el menu lateral, que se abre con
 * el boton flotante. Ambos van superpuestos al navegador, no dentro, para
 * verse en todas las pantallas.
 */
export default function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  // Mientras carga, o si falla, la opcion no aparece: es preferible a
  // ensenarla y que luego diga "no tienes permiso". La ve quien puede enviar
  // y tambien quien solo puede consultar lo enviado (rol "Consulta").
  const { data: capacidades } = useCapacidadesEnvio();
  const isAuthenticated = useIsAuthenticated();
  const veMensajes =
    isAuthenticated && Boolean(capacidades?.puedeEnviar || capacidades?.puedeVerHistorial);

  useAbrirMensajeTocado();

  return (
    <View className="flex-1">
      {/* El encabezado es azul oscuro en ambos temas: iconos de sistema claros. */}
      <StatusBar style="light" />

      <Tabs
        tabBar={() => null}
        screenOptions={{
          header: ({ options }) => <AppHeader title={options.title} />,
        }}
      >
        {/* Sin `title`: el inicio muestra solo el encabezado institucional. */}
        <Tabs.Screen name="index" />
        <Tabs.Screen name="avisos" options={{ title: 'Avisos' }} />
        {/*
          Secciones con tarjetas y visor. Sin `title`: la barra de seccion la
          pinta su Stack (`SeccionStack`), que cambia de titulo al entrar en
          una tarjeta. Al ser pestanas no se desmontan, y el visor conserva su
          posicion al ir y volver desde el menu.
        */}
        <Tabs.Screen name="reportes" />
        <Tabs.Screen name="boletines" />
        <Tabs.Screen name="jornadas" />
        <Tabs.Screen name="brigadas" />
        <Tabs.Screen name="proyectos" />
        {/* Al ser pestana, el mapa conserva camara y filtros al ir y volver. */}
        <Tabs.Screen name="mapa" options={{ title: 'Mapa general del municipio' }} />
        {/*
          Envio e historial de avisos. `Tabs.Protected` saca la ruta entera, no
          solo la opcion del menu: un vecino no puede llegar a ella ni con un
          enlace. Es comodidad, no seguridad: el API valida cada envio y cada
          lectura. La barra con el titulo la pinta el Stack de
          `mensajes/_layout.tsx`, debajo del encabezado institucional.
        */}
        <Tabs.Protected guard={veMensajes}>
          <Tabs.Screen name="mensajes" />
        </Tabs.Protected>
        {/* Al cerrar sesion estando aqui, la ruta desaparece y se vuelve al inicio. */}
        <Tabs.Protected guard={isAuthenticated}>
          <Tabs.Screen name="perfil" options={{ title: 'Mi perfil' }} />
        </Tabs.Protected>
        <Tabs.Screen
          name="seccion/[slug]"
          options={({ route }) => ({
            title:
              buscarSeccion((route.params as { slug?: string } | undefined)?.slug)?.etiqueta ??
              'Sección',
          })}
        />
      </Tabs>

      <BotonMenu onPress={() => setMenuAbierto(true)} />
      <MenuLateral
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
        conSesion={isAuthenticated}
        mostrarEnvioAvisos={veMensajes}
      />
    </View>
  );
}

/**
 * Lleva a la bandeja el aviso que se abrio desde una notificacion.
 *
 * Vive aqui y no en `PushProvider` porque solo aqui hay pantallas montadas
 * donde aterrizar. No depende de la sesion: la bandeja es del aparato.
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
