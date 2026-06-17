import {
  approvePaymentAction,
  createTripTurnAction,
  joinDriverQueueAction,
  updateTripStatusAction,
} from "@/app/actions";
import { formatPen, routeDirectionLabels, tripStatusLabels } from "@/lib/exvias/constants";
import { getAdminDashboard } from "@/lib/exvias/trips";
import { RouteDirection, TripStatus } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/exvias/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { trips, payments, queue, drivers, metrics } = await getAdminDashboard();
  const routes = Array.from(new Map(trips.map((trip) => [trip.route.id, trip.route])).values());

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 pb-10 pt-5 text-zinc-950 sm:px-6">
      <section className="mx-auto max-w-6xl space-y-5">
        <header>
          <p className="text-sm font-medium text-[#1E5BFF]">EXVIASS S.A.</p>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="rounded-[8px]" size="sm">
            <CardContent>
              <p className="text-sm text-zinc-500">Viajes hoy</p>
              <p className="mt-1 text-2xl font-bold">{metrics.todayTrips}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[8px]" size="sm">
            <CardContent>
              <p className="text-sm text-zinc-500">Ingreso estimado</p>
              <p className="mt-1 text-2xl font-bold">{formatPen(metrics.revenueEstimate)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[8px]" size="sm">
            <CardContent>
              <p className="text-sm text-zinc-500">Ocupación</p>
              <p className="mt-1 text-2xl font-bold">
                {Math.round(metrics.occupancy * 100)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="space-y-4">
            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Viajes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trips.map((trip) => (
                  <div key={trip.id} className="rounded-[8px] bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{trip.turnLabel}</p>
                        <p className="text-sm text-zinc-500">
                          {routeDirectionLabels[trip.direction]} · {trip.bookedSeats}/{trip.route.capacity}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Conductor: {trip.driver?.user.name ?? "Sin asignar"}
                        </p>
                      </div>
                      <StatusBadge value={trip.status} />
                    </div>
                    <form action={updateTripStatusAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input type="hidden" name="tripId" value={trip.id} />
                      <select name="status" defaultValue={trip.status} className="h-10 rounded-[8px] border bg-white px-3 text-sm">
                        {Object.values(TripStatus).map((status) => (
                          <option key={status} value={status}>
                            {tripStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <label className="flex h-10 items-center gap-2 rounded-[8px] bg-white px-3 text-sm ring-1 ring-zinc-200">
                        <input type="checkbox" name="adminOverride" value="true" />
                        Forzar salida
                      </label>
                      <Button className="h-10 rounded-[8px]">Actualizar</Button>
                    </form>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Crear turno</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createTripTurnAction} className="grid gap-2 sm:grid-cols-4">
                  <select name="routeId" className="h-10 rounded-[8px] border bg-white px-3 text-sm">
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                  <select name="direction" className="h-10 rounded-[8px] border bg-white px-3 text-sm">
                    {Object.values(RouteDirection).map((direction) => (
                      <option key={direction} value={direction}>
                        {routeDirectionLabels[direction]}
                      </option>
                    ))}
                  </select>
                  <input
                    name="plannedDepartureAt"
                    type="datetime-local"
                    className="h-10 rounded-[8px] border bg-white px-3 text-sm"
                  />
                  <Button className="h-10 rounded-[8px]">Crear</Button>
                </form>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Pagos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.length === 0 && <p className="text-sm text-zinc-500">Sin pagos pendientes.</p>}
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-[8px] bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{payment.booking.passengerName}</p>
                        <p className="text-sm text-zinc-500">{formatPen(payment.amountPen)}</p>
                        <p className="text-xs text-zinc-500">{payment.proofUrl ?? "Sin comprobante"}</p>
                      </div>
                      <StatusBadge value={payment.status} />
                    </div>
                    <form action={approvePaymentAction} className="mt-3">
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <Button className="h-10 w-full rounded-[8px]">Aprobar</Button>
                    </form>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Cola de choferes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {queue.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-[8px] bg-zinc-50 p-3 text-sm">
                    <div>
                      <p className="font-semibold">#{entry.position} {entry.driver.user.name}</p>
                      <p className="text-zinc-500">{routeDirectionLabels[entry.direction]}</p>
                    </div>
                    <StatusBadge value={entry.status} />
                  </div>
                ))}
                <form action={joinDriverQueueAction} className="space-y-2 pt-2">
                  <select name="driverId" className="h-10 w-full rounded-[8px] border bg-white px-3 text-sm" disabled={drivers.length === 0}>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.user.name}
                      </option>
                    ))}
                  </select>
                  <select name="routeId" className="h-10 w-full rounded-[8px] border bg-white px-3 text-sm">
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                  <select name="direction" className="h-10 w-full rounded-[8px] border bg-white px-3 text-sm">
                    {Object.values(RouteDirection).map((direction) => (
                      <option key={direction} value={direction}>
                        {routeDirectionLabels[direction]}
                      </option>
                    ))}
                  </select>
                  <Button className="h-10 w-full rounded-[8px]" disabled={drivers.length === 0}>
                    Agregar a cola
                  </Button>
                  {drivers.length === 0 && (
                    <p className="text-xs text-zinc-500">Crea perfiles de chofer en la base para habilitar la cola.</p>
                  )}
                </form>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}
