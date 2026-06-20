"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages = {
  settingsSaved: {
    title: "Datos guardados",
    description: "Tu Yape, vehículo y datos de contacto ya están actualizados.",
  },
} as const;

export function PageToast({
  type,
}: {
  type: keyof typeof messages | null | undefined;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!type) return;

    const message = messages[type];
    toast.success(message.title, {
      description: message.description,
    });

    const params = new URLSearchParams(searchParams);
    params.delete("settings");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, type]);

  return null;
}
