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
│   └── usuarios/usuarios.actions.ts   # plantilla de CRUD paginado
│
├── api/
│   ├── http-client.ts          # axios + Bearer + manejo de 401
│   ├── api-error.ts            # ApiException + getErrorMessage
│   └── query-client.ts         # política de cache y reintentos
│
├── models/                     # Interfaces del dominio
│   ├── api/                    # ApiResponse, paginación
│   ├── auth/                   # Usuario, Rol, Sucursal, sesión
│   └── comred/                 # Organización
│
├── hooks/                      # useQuery / useMutation por dominio
│   ├── auth/
│   └── usuarios/
│
├── store/                      # Zustand (estado de cliente)
│   ├── auth.store.ts
│   └── ui.store.ts
│
├── components/
│   ├── ui/                     # Sistema de diseño: Button, Input, Card, Text, Icon
│   ├── layout/                 # Screen (área segura, scroll, teclado)
│   ├── feedback/               # Loading, Error, Empty
│   └── common/
│
├── providers/                  # AppProviders → Query → Auth
├── config/env.ts               # Contrato tipado del .env
├── constants/                  # ENDPOINTS, QUERY_KEYS, STORAGE_KEYS, Colors
├── lib/                        # secureStorage, cn, formato
└── global.css                  # Directivas de Tailwind
```

## Convenciones

**Estilos.** Todo con `className`. Los colores literales solo se permiten donde React
Native exige un valor crudo (navegación, `StatusBar`, `ActivityIndicator`) y salen de
`constants/theme.ts`. La paleta viva está en `tailwind.config.js`; si cambias un color
allí, refléjalo en `constants/theme.ts`.

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
