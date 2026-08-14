# COMRED App

Aplicación móvil de COMRED (Coordinadora Municipal para la Reducción de Desastres).
React Native + Expo, consumiendo el API NestJS de `api-comred`.

## Stack

| Área | Elección | Por qué |
| --- | --- | --- |
| Framework | Expo SDK 57 · React Native 0.86 · React 19.2 | Base del proyecto |
| Navegación | expo-router (file-based) | Rutas tipadas y grupos protegidos |
| Estilos | **NativeWind v4** + Tailwind CSS 3.4 | Tailwind real sobre RN; el único con adopción productiva |
| Iconos | **lucide-react-native** + react-native-svg | 1500+ iconos, tree-shaking, trazo consistente |
| Datos del API | TanStack Query v5 | Cache, reintentos, estados de carga/error |
| Estado de cliente | Zustand v5 | Sesión y UI, sin boilerplate |
| HTTP | axios | Interceptores de token y de errores |
| Sesión | expo-secure-store | JWT cifrado en Keychain / Keystore |

## Puesta en marcha

```bash
npm install
cp .env.example .env      # ajustar EXPO_PUBLIC_API_URL
npx expo start --clear    # --clear es obligatorio tras tocar .env o tailwind.config.js
```

`EXPO_PUBLIC_API_URL` debe apuntar al API con su prefijo de versión (`/v1`):

- Web / simulador iOS → `http://localhost:3000/v1`
- Emulador Android → `http://10.0.2.2:3000/v1`
- Dispositivo físico → `http://<IP-LAN-de-tu-PC>:3000/v1`

## Arquitectura

Flujo de una funcionalidad, siempre en el mismo sentido:

```
app/ (pantalla)  →  hooks/  →  actions/  →  api/  →  models/
```

- **`app/`** — rutas de expo-router. Solo composición de UI y estado local del formulario.
- **`hooks/`** — TanStack Query y lectura del store. Aquí viven `useQuery` / `useMutation`.
- **`actions/`** — funciones puras que llaman al API y desenvuelven `ApiResponse`. No importan React.
- **`api/`** — cliente axios, interceptores, normalización de errores y configuración de la cache.
- **`models/`** — interfaces del dominio, espejo de las entidades del backend.

Nadie salta capas: una pantalla nunca importa `api/` ni `axios` directamente.

```
src/
├── app/                        # Rutas (expo-router)
│   ├── _layout.tsx             # Providers + guard de sesión (Stack.Protected)
│   ├── (auth)/                 # Rutas públicas — solo sin sesión
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (app)/                  # Rutas privadas — solo con sesión
│   │   ├── _layout.tsx         # Tabs
│   │   ├── index.tsx           # Inicio
│   │   └── perfil.tsx
│   └── +not-found.tsx
│
├── actions/                    # Llamadas al API por dominio
│   ├── auth/auth.actions.ts
│   ├── comred/organizaciones.actions.ts  # bootstrap público (marca)
│   ├── comred/dispositivos.actions.ts    # registro anónimo del dispositivo
│   └── usuarios/usuarios.actions.ts      # plantilla de CRUD paginado
│
├── api/
│   ├── http-client.ts          # axios + Bearer + manejo de 401
│   ├── api-error.ts            # ApiException + getErrorMessage
│   └── query-client.ts         # política de cache y reintentos
│
├── models/                     # Interfaces del dominio
│   ├── api/                    # ApiResponse, paginación
│   ├── auth/                   # Usuario, Rol, Sucursal, sesión
│   └── comred/                 # Organización, Dispositivo
│
├── hooks/                      # useQuery / useMutation por dominio
│   ├── auth/
│   └── usuarios/
│
├── store/                      # Zustand (estado de cliente)
│   ├── auth.store.ts
│   ├── dispositivo.store.ts    # identidad del aparato (previa al login)
│   ├── organizacion.store.ts   # marca + tema derivado
│   └── ui.store.ts
│
├── components/
│   ├── ui/                     # Sistema de diseño: Button, Input, Card, Text, Icon
│   ├── layout/                 # Screen (área segura, scroll, teclado)
│   ├── feedback/               # Loading, Error, Empty
│   └── common/
│
├── providers/                  # AppProviders → Query → Dispositivo → Auth → Branding
├── config/env.ts               # Contrato tipado del .env
├── constants/                  # ENDPOINTS, QUERY_KEYS, STORAGE_KEYS, Colors
├── lib/                        # color/branding, secureStorage, deviceInfo, cn, formato, url
└── global.css                  # Directivas de Tailwind
```

## Registro del dispositivo

El destinatario de una notificación no es una persona, es un aparato: FCM entrega a un
token. Por eso el dispositivo tiene identidad propia y **se registra antes de pedir
cualquier login** — un vecino que solo quiere recibir avisos no tiene por qué crear una
cuenta.

**Secuencia de arranque** (`DispositivoProvider` → `dispositivo.store.ts`):

1. Lee `instalacionId` del almacenamiento seguro. Si no existe, genera un UUID v4 con
   `expo-crypto` y lo persiste. Es la identidad estable del aparato: sobrevive a las
   actualizaciones de la app y se pierde al desinstalarla.
2. Lee el registro guardado (`dispositivoId` + `clave`). Si existe **y** su
   `organizacionId` e `instalacionId` siguen coincidiendo, no toca la red y termina.
3. Si falta cualquiera de las dos cosas, llama a `POST /comred/dispositivos/registro`.
   El API es idempotente por `(organizacionId, instalacionId)`: reinstalar o re-registrar
   actualiza la misma fila, nunca crea otra.
4. Guarda la clave y el registro, y deja las credenciales en el cliente HTTP, que las
   manda como `x-dispositivo-id` / `x-dispositivo-key`. Son independientes del JWT:
   siguen valiendo con el usuario deslogueado.

**La clave se entrega una sola vez.** El API guarda su bcrypt, no el original. Si se
pierde, la única salida es volver a registrarse — y eso es exactamente lo que hace el
paso 3, así que el fallo se autorepara en el siguiente arranque.

**Si el registro falla**, el layout raíz no monta el stack de navegación y muestra
`DispositivoErrorScreen` con un botón de reintento. Es un muro deliberado: dejar pasar
al login daría la falsa impresión de que la app está operativa cuando no recibiría
ningún aviso. El endpoint está limitado a 3 llamadas/minuto, así que reintentar en
bucle acaba en 429 (la pantalla lo traduce a un mensaje legible).

**Sin `EXPO_PUBLIC_ORGANIZACION_ID`** no hay a qué organización registrarse: el store
queda en `unavailable`, la app arranca igual y avisa por consola. Ese build no recibirá
notificaciones hasta que la variable esté puesta.

## Theming dinámico por organización

Cada municipalidad tiene su propia marca (`logoUrl`, `colorPrimario`, `colorSecundario`)
y el mismo código genera la app de todas. El color no está escrito en ningún componente.

**Cómo funciona.** En `tailwind.config.js` los colores `primary` y `secondary` no son
hex: son `rgb(var(--color-primary-500) / <alpha-value>)`. `BrandingProvider` inyecta
esas variables con `vars()` de NativeWind sobre una `View` raíz, y todo el árbol las
hereda. Escribir `bg-primary-500` en cualquier pantalla ya pinta el color de la muni.

**De dos colores a una paleta.** El API solo guarda dos colores, pero los componentes
usan una escala completa (`primary-50` … `primary-950`). [lib/color.ts](src/lib/color.ts)
la genera mezclando el color base con blanco y negro. Además calcula
`--color-primary-foreground` según la luminancia: si una muni configura un color claro,
el texto del botón pasa de blanco a oscuro solo, sin quedar ilegible.

**Secuencia de arranque:**

1. El store inicia con la marca por defecto de COMRED (azul `#208AEF`).
2. `hydrate()` lee del almacenamiento la última marca conocida → sin parpadeo de color.
3. `useOrganizacionPublica()` llama a `GET /comred/organizaciones/:id/publica` y persiste
   el resultado. El endpoint está limitado a 5 llamadas/minuto en el API, así que se
   cachea 24 h y solo se reintenta una vez.

**Qué organización es.** `useOrganizacionId()` resuelve en este orden:

1. `user.organizacionId` de la sesión (dato autoritativo del API).
2. `EXPO_PUBLIC_ORGANIZACION_ID` del build — es lo que permite que la pantalla de login
   ya muestre el logo y los colores correctos, antes de que exista sesión. Cada perfil
   de EAS Build define el suyo.

Sin la variable la app arranca con la marca de COMRED y adopta la de la municipalidad
al iniciar sesión.

**Colores donde no llega `className`.** La tab bar, el `ActivityIndicator` y la
`StatusBar` exigen un color literal. Para esos casos usa `useBrandColors()`, que
devuelve los hex ya resueltos — nunca importes `Colors.brand`, que es solo el fallback.

**Limitación conocida.** Los `Modal` de React Native se montan en una ventana aparte y
no heredan las variables CSS. Si un modal necesita la marca, envuelve su contenido o
usa `useBrandColors()`.

## Convenciones

**Estilos.** Todo con `className`. Los colores de marca (`primary`, `secondary`) son
dinámicos: se leen con clases o con `useBrandColors()`, nunca hardcodeados. Los colores
neutros (superficies, texto, bordes) sí son fijos y viven en `tailwind.config.js`, con
su espejo literal en `constants/theme.ts` para navegación y `StatusBar`.

**Iconos.** Siempre por el wrapper `<Icon as={LucideIcon} />`, que traduce
`className="text-primary-500"` al prop `color` que espera Lucide (vía `cssInterop`).

**Endpoints.** Nunca escribas rutas a mano: agrégalas a `constants/api-endpoints.ts`.

**Errores.** Todo error llega a la UI como `ApiException`. Para pintarlo, usa
`getErrorMessage(error)` o el componente `<ErrorState />`.

**Sesión.** La navegación entre público y privado la decide únicamente el guard de
`app/_layout.tsx`. Ninguna pantalla hace `router.replace` tras login o logout.

## Agregar un módulo nuevo

1. `models/<dominio>/` — interfaces del recurso.
2. `constants/api-endpoints.ts` — rutas del recurso.
3. `actions/<dominio>/` — copiar `usuarios.actions.ts` y adaptar.
4. `constants/query-keys.ts` — llaves de cache del dominio.
5. `hooks/<dominio>/` — copiar `use-usuarios.ts` y adaptar.
6. `app/(app)/<ruta>.tsx` — pantalla, usando `Screen`, `Card` y los estados de `feedback/`.

## Scripts

```bash
npm start          # bundler
npm run android    # abrir en Android
npm run ios        # abrir en iOS
npm run web        # abrir en navegador
npm run lint
npx tsc --noEmit   # verificación de tipos
```
