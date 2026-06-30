import prisma from "@/lib/prisma";
import { RouteAlertType } from "@/lib/generated/prisma/client";

// Los controles/operativos se mueven; pasado este tiempo la alerta deja de
// mostrarse sin que nadie tenga que borrarla a mano.
const ALERT_TTL_HOURS = 3;

export async function createRouteAlert(input: {
  routeId: string;
  type: RouteAlertType;
  latitude: number;
  longitude: number;
  note?: string;
  userId: string;
}) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });

  if (!driver) throw new Error("Perfil de conductor no encontrado");

  return prisma.routeAlert.create({
    data: {
      routeId: input.routeId,
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      note: input.note,
      createdById: driver.id,
      expiresAt: new Date(Date.now() + ALERT_TTL_HOURS * 60 * 60 * 1000),
    },
  });
}

export async function listActiveRouteAlerts(routeId: string) {
  return prisma.routeAlert.findMany({
    where: {
      routeId,
      expiresAt: { gt: new Date() },
    },
    include: { createdBy: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function clearRouteAlert(input: {
  alertId: string;
  userId: string;
}) {
  const driver = await prisma.driverProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });

  if (!driver) throw new Error("Perfil de conductor no encontrado");

  const alert = await prisma.routeAlert.findUnique({
    where: { id: input.alertId },
  });

  if (!alert || alert.createdById !== driver.id) {
    throw new Error("Solo puedes quitar una alerta que tú reportaste");
  }

  return prisma.routeAlert.delete({ where: { id: input.alertId } });
}
