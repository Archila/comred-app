import { usePathname, useRouter, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  House,
  ImageDown,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SECCIONES_MENU, estaEnSeccion, rutaDeSeccion } from '@/constants';
import { useLogout } from '@/hooks';
import { cn, recargarImagenes } from '@/lib';

import { MuniLogo, useNombreMunicipalidad } from '../common/muni-logo';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

const DURACION = 220;
const ANCHO_MAXIMO = 320;

/**
 * Boton flotante del menu (esquina inferior derecha). Va fuera del navegador,
 * superpuesto, para que siga visible en todas las pantallas.
 */
export function BotonMenu({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir menu"
      onPress={onPress}
      style={{ bottom: insets.bottom + 16, right: insets.right + 16, elevation: 6 }}
      className="absolute h-14 w-14 items-center justify-center rounded-full bg-primary-500 shadow-lg active:bg-primary-600"
    >
      <Icon as={Menu} size={26} className="text-primary-foreground" />
    </Pressable>
  );
}

/**
 * Menu lateral. Se superpone a toda la pantalla, encabezado incluido.
 *
 * No es un `Modal` a proposito: los modales de React Native se montan en otra
 * ventana y no heredan las variables de color de `BrandingProvider`.
 */
export function MenuLateral({
  abierto,
  onCerrar,
  conSesion,
  mostrarEnvioAvisos = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  /** Sin sesion la ultima opcion es "Login"; con sesion, perfil y salida. */
  conSesion: boolean;
  /** Solo para quien puede enviar avisos o consultar los enviados. */
  mostrarEnvioAvisos?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const nombreMunicipalidad = useNombreMunicipalidad();
  const queryClient = useQueryClient();

  // Ultima pantalla visitada de cada seccion. Plan Maestro 3.1: "conservar la
  // posicion cuando el usuario regrese desde el menu". Las pestanas no se
  // desmontan, asi que volver a la misma ruta encuentra el visor tal cual;
  // ir a la raiz, en cambio, cerraria el visor.
  const ultimaRuta = useRef<Record<string, string>>({});
  useEffect(() => {
    const seccion = SECCIONES_MENU.find((candidata) => estaEnSeccion(pathname, candidata));
    if (seccion) ultimaRuta.current[seccion.slug] = pathname;
  }, [pathname]);

  // El boton "atras" de Android cierra el menu en vez de salir de la pantalla.
  useEffect(() => {
    if (!abierto) return;

    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      onCerrar();
      return true;
    });
    return () => suscripcion.remove();
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  function ir(href: Href) {
    onCerrar();
    router.navigate(href);
  }

  return (
    <View className="absolute inset-0" style={{ elevation: 10 }}>
      <Animated.View
        entering={FadeIn.duration(DURACION)}
        exiting={FadeOut.duration(DURACION)}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar menu"
          onPress={onCerrar}
          className="flex-1 bg-black/60"
        />
      </Animated.View>

      <Animated.View
        entering={SlideInLeft.duration(DURACION)}
        exiting={SlideOutLeft.duration(DURACION)}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: Math.min(ANCHO_MAXIMO, width * 0.84),
        }}
      >
        <View
          className="flex-1 bg-secondary-500"
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            paddingLeft: insets.left,
          }}
        >
          <View className="flex-row items-center gap-3 px-4 pb-4">
            <MuniLogo size={52} />
            <View className="flex-1">
              <Text variant="plain" className="text-xl font-bold leading-6 text-secondary-foreground">COMRED</Text>
              <Text variant="plain" className="text-sm text-secondary-foreground">{nombreMunicipalidad}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar menu"
              hitSlop={10}
              onPress={onCerrar}
              className="h-10 w-10 items-center justify-center self-start active:opacity-70"
            >
              <Icon as={X} size={24} className="text-secondary-foreground" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerClassName="gap-1 px-3 pb-2"
            showsVerticalScrollIndicator={false}
          >
            <Opcion
              etiqueta="Información general"
              icono={House}
              activa={pathname === '/'}
              onPress={() => ir('/')}
            />

            {SECCIONES_MENU.map((seccion) => {
              const activa = estaEnSeccion(pathname, seccion);
              return (
                <Opcion
                  key={seccion.slug}
                  etiqueta={seccion.etiqueta}
                  icono={seccion.icono}
                  activa={activa}
                  // Desde dentro de la seccion, su opcion lleva a la raiz
                  // (las tarjetas). Desde fuera, a donde se quedo.
                  onPress={() =>
                    ir(
                      (activa
                        ? rutaDeSeccion(seccion)
                        : (ultimaRuta.current[seccion.slug] ?? rutaDeSeccion(seccion))) as Href,
                    )
                  }
                />
              );
            })}

            {mostrarEnvioAvisos && (
              <Opcion
                etiqueta="Enviar avisos"
                icono={Megaphone}
                activa={pathname.startsWith('/mensajes')}
                onPress={() => ir('/mensajes')}
              />
            )}

            <View className="mx-2 my-2 h-px bg-secondary-400" />

            {/*
              Para cuando una imagen se cambio en el servidor y la app sigue
              mostrando la anterior. Borra solo la cache de imagenes (la sesion
              y los demas datos se conservan) y vuelve a pedir el contenido de
              las pantallas abiertas.
            */}
            <Opcion
              etiqueta="Recargar imágenes"
              icono={ImageDown}
              activa={false}
              onPress={() => {
                onCerrar();
                void recargarImagenes().then(() => queryClient.invalidateQueries());
              }}
            />

            {conSesion ? (
              <>
                <Opcion
                  etiqueta="Mi perfil"
                  icono={UserRound}
                  activa={pathname === '/perfil'}
                  onPress={() => ir('/perfil')}
                />
                <Opcion
                  etiqueta="Cerrar sesión"
                  icono={LogOut}
                  activa={false}
                  onPress={() => {
                    onCerrar();
                    void logout();
                  }}
                />
              </>
            ) : (
              <Opcion
                etiqueta="Login"
                icono={LogIn}
                activa={false}
                onPress={() => {
                  onCerrar();
                  // Con push y no navigate: el login se apila sobre la app.
                  router.push('/login');
                }}
              />
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

function Opcion({
  etiqueta,
  icono,
  activa,
  onPress,
}: {
  etiqueta: string;
  icono: LucideIcon;
  activa: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      className={cn(
        'min-h-12 flex-row items-center gap-4 rounded-lg px-3 py-2',
        activa ? 'bg-primary-500' : 'active:bg-secondary-400',
      )}
    >
      <Icon
        as={icono}
        size={22}
        className={activa ? 'text-primary-foreground' : 'text-secondary-foreground'}
      />
      <Text
        variant="plain"
        className={cn(
          'flex-1 text-base',
          activa ? 'font-semibold text-primary-foreground' : 'text-secondary-foreground',
        )}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}
