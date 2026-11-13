/**
 * Catalogo unico de rutas del API COMRED.
 *
 * Todas son relativas a `env.apiUrl`, que ya incluye el prefijo de version
 * (`PREFIX=v1` en el `.env` del backend). Ningun `action` debe escribir rutas
 * a mano: si el backend cambia una ruta, se corrige solo aqui.
 */
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    verifyToken: '/auth/verify-token',
    me: '/auth/me',
  },

  usuarios: {
    base: '/auth/usuarios',
    byId: (id: string) => `/auth/usuarios/${id}`,
    cambiarClave: '/auth/usuarios/cambiar-clave',
    resetClave: '/auth/usuarios/reset-clave',
  },

  roles: {
    base: '/auth/roles',
    byId: (id: string) => `/auth/roles/${id}`,
  },

  puestos: {
    base: '/auth/puestos',
    byId: (id: string) => `/auth/puestos/${id}`,
  },

  sucursales: {
    base: '/auth/sucursal',
    byId: (id: string) => `/auth/sucursal/${id}`,
  },

  menus: {
    base: '/auth/menus',
  },

  permisos: {
    base: '/auth/permisos',
  },

  accesos: {
    base: '/auth/accesos',
  },

  organizaciones: {
    base: '/comred/organizaciones',
    byId: (id: string) => `/comred/organizaciones/${id}`,
    /** Bootstrap publico: marca + categorias. No requiere sesion. */
    publica: (id: string) => `/comred/organizaciones/${id}/publica`,
    /** Version minima y ultima de la app. Publico: se consulta antes del login. */
    version: (id: string) => `/comred/organizaciones/${id}/version`,
  },

  dispositivos: {
    /**
     * Raiz de las rutas que se autentican con las cabeceras del dispositivo y
     * no con el JWT. El cliente HTTP la usa para no confundir un 401 de estas
     * rutas con una sesion caducada.
     */
    base: '/comred/dispositivos',
    /** Alta anonima del dispositivo. Publica: se llama antes de cualquier login. */
    registro: '/comred/dispositivos/registro',
    /** Actualiza el token FCM. Se autentica con las cabeceras del dispositivo. */
    token: '/comred/dispositivos/token',
    /** Cierra en el servidor la sesion abierta en este aparato. */
    logout: '/comred/dispositivos/logout',
    /**
     * Bandeja de entrada del aparato: la fuente de verdad de lo que se le ha
     * enviado. El push no lo es, asi que se sincroniza en cada
     * `AppState -> active`.
     */
    mensajes: '/comred/dispositivos/mensajes',
    /** Acuse de recibo. El id es el del MENSAJE, el que viaja en el push. */
    marcarLeido: (mensajeId: string) =>
      `/comred/dispositivos/mensajes/${mensajeId}/leido`,
  },

  mensajes: {
    /** POST: alta del aviso (202, el reparto ocurre despues). GET: historial. */
    base: '/comred/mensajes',
    byId: (id: string) => `/comred/mensajes/${id}`,
    /** Entrega telefono por telefono. Exige `MSG_AUDITORIA`. */
    envios: (id: string) => `/comred/mensajes/${id}/envios`,
    /** Reanuda un envio a medias sin repetirselo a quien ya lo recibio. */
    reintentar: (id: string) => `/comred/mensajes/${id}/reintentar`,
    /** Cuantos telefonos alcanzaria, sin enviar nada. */
    preview: '/comred/mensajes/preview',
    /** Que alcances y destinos puede usar el usuario de la sesion. */
    capacidades: '/comred/mensajes/capacidades',
  },

  catalogo: {
    arbol: '/comred/catalogo/arbol',
    categorias: '/comred/catalogo/categorias',
    categoriaById: (id: string) => `/comred/catalogo/categorias/${id}`,
    subcategorias: '/comred/catalogo/subcategorias',
    subcategoriaById: (id: string) => `/comred/catalogo/subcategorias/${id}`,
    subcategoriasDeUsuario: (usuarioId: string) =>
      `/comred/catalogo/usuarios/${usuarioId}/subcategorias`,
  },

  storage: {
    upload: '/storage/upload',
    file: (categoria: string, nombre: string) => `/storage/${categoria}/${nombre}`,
  },
} as const;
