import { redirect } from "next/navigation";
import { RouteDirection } from "@/lib/generated/prisma/client";
import { getRoutesWithPoints } from "@/lib/exvias/routes";
import { listActiveRouteAlerts } from "@/lib/exvias/alerts";
import { getDriverDashboard } from "@/lib/exvias/trips";
import { getCurrentUser } from "@/lib/session";
import { PhoneShell } from "@/components/exvias/mobile-shell";
import { RouteAlertSheet } from "@/components/exvias/route-alert-sheet";

export const dynamic = "force-dynamic";

export default async function DriverReportPage({
  searchParams,
}: {
  searchParams: Promise<{ alertId?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/driver/report");

  const [routes, dashboard] = await Promise.all([
    getRoutesWithPoints(),
    getDriverDashboard(user.id),
  ]);

  if (!dashboard) redirect("/driver");

  const route = routes[0];
  if (!route) redirect("/driver");

  const alerts = await listActiveRouteAlerts(route.id);

  // El mismo camino físico sirve de contexto visual para ambos sentidos.
  const points = route.points.filter(
    (point) => point.direction === RouteDirection.CUSCO_TO_COLQUEPATA,
  );

  return (
    <PhoneShell>
      <RouteAlertSheet
        routeId={route.id}
        backHref="/driver"
        points={points}
        alerts={alerts.map((alert) => ({
          id: alert.id,
          type: alert.type,
          latitude: alert.latitude,
          longitude: alert.longitude,
          note: alert.note,
          createdAt: alert.createdAt,
          createdByName: alert.createdBy.user.name,
          isOwn: alert.createdById === dashboard.driver.id,
        }))}
        initialViewAlertId={params.alertId ?? null}
      />
    </PhoneShell>
  );
}
