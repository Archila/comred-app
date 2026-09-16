import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { organizacionesActions } from '@/actions';
import { env } from '@/config';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore, useOrganizacionStore } from '@/store';
import type { OrganizacionPublica } from '@/models';

/**
 * Resuelve a que organizacion pertenece este dispositivo.
 *
 * Prioridad:
 *   1. La organizacion del usuario autenticado (dato autoritativo del API).
 *   2. La embebida en el build (`EXPO_PUBLIC_ORGANIZACION_ID`), que permite
 *      pintar la marca correcta ya en la pantalla de login.
 *
 * Con la sesion y el token atados a la organizacion del build ambas coinciden;
 * la del usuario se mantiene primero por ser la que confirma el API.
 */
export function useOrganizacionId(): string {
  const usuarioOrganizacionId = useAuthStore((state) => state.user?.organizacionId);
  return usuarioOrganizacionId ?? env.organizacionId;
}

/**
 * Descarga la configuracion publica de la organizacion y la deja en el store,
 * que es quien deriva el tema.
 *
 * El endpoint esta limitado a 5 llamadas por minuto en el API, asi que se
 * cachea por 24 h y no se reintenta de forma agresiva: si falla, la app sigue
 * con la marca cacheada en disco (o con la de COMRED por defecto la primera vez).
 */
export function useOrganizacionPublica() {
  const organizacionId = useOrganizacionId();
  const setOrganizacion = useOrganizacionStore((state) => state.setOrganizacion);

  const query = useQuery<OrganizacionPublica>({
    queryKey: QUERY_KEYS.organizaciones.publica(organizacionId),
    queryFn: () => organizacionesActions.getPublica(organizacionId),
    staleTime: 24 * 60 * 60_000,
    gcTime: 7 * 24 * 60 * 60_000,
    retry: 1,
  });

  const { data } = query;

  useEffect(() => {
    if (data) {
      void setOrganizacion(data);
    }
  }, [data, setOrganizacion]);

  return query;
}
