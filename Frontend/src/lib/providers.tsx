"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { ThemeSync } from "@/components/layout/theme-sync";
import { clearLegacyLocalStorageKeys } from "@/utils/cookies";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    clearLegacyLocalStorageKeys();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
    </QueryClientProvider>
  );
}
