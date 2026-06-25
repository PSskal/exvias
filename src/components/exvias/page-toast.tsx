"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages = {
  settingsSaved: {
    title: "Datos guardados",
    description: "Tu Yape, vehículo y datos de contacto ya están actualizados.",
    tone: "success",
  },
  driverEnabled: {
    title: "Conductor habilitado",
    description: "Ahora puede completar sus datos desde configuración.",
    tone: "success",
  },
  driverDisabled: {
    title: "Conductor deshabilitado",
    description: "Fue retirado de la rampa y no podrá tomar turnos.",
    tone: "success",
  },
  driverReenabled: {
    title: "Conductor rehabilitado",
    description: "Ya puede volver a entrar a rampa.",
    tone: "success",
  },
  driverBusy: {
    title: "No se pudo deshabilitar",
    description: "El conductor tiene un turno activo o publicado.",
    tone: "error",
  },
  driverSuspendAfterTrip: {
    title: "Suspensión programada",
    description: "El conductor será deshabilitado al finalizar su turno actual.",
    tone: "success",
  },
  driverTripCancelled: {
    title: "Turno cancelado",
    description: "El conductor fue retirado y las reservas del turno fueron canceladas.",
    tone: "success",
  },
  driverTripReassigned: {
    title: "Turno reasignado",
    description: "El turno continúa con el nuevo conductor seleccionado.",
    tone: "success",
  },
  driverReassignBlocked: {
    title: "No se pudo reasignar",
    description: "El conductor de reemplazo no está disponible o no tiene Yape listo.",
    tone: "error",
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
    const notify = message.tone === "error" ? toast.error : toast.success;
    notify(message.title, {
      description: message.description,
    });

    const params = new URLSearchParams(searchParams);
    params.delete("settings");
    params.delete("admin");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, type]);

  return null;
}
