import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { createQueryClient } from '@/api';

/**
 * Provee la cache de TanStack Query.
 *
 * El cliente se crea con `useState` (no como constante de modulo) para que
 * Fast Refresh y los tests no compartan una cache entre montajes.
 */
export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
