import Link from "next/link";
import { redirect } from "next/navigation";
import {
  approvePaymentAction,
  upsertDriverProfileAction,
} from "@/app/actions";
import {
  formatPen,
  getVehicleOption,
  vehicleCatalog,
} from "@/lib/exvias/constants";
import { getAdminDashboard } from "@/lib/exvias/trips";
import { TripStatus } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/exvias/status-badge";

export const dynamic = "force-dynamic";

type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
type AdminDriver = AdminDashboard["drivers"][number];

const operativeStatuses: TripStatus[] = [
  TripStatus.QUEUED,
  TripStatus.ACTIVE,
  TripStatus.BOARDING,
  TripStatus.DEPARTED,
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackURL=/admin");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") redirect("/account");

  const { trips, payments, drivers, users, metrics } =
    await getAdminDashboard();
  const passengerUsers = users.filter((item) => !item.driverProfile);
  const assignedDriverIds = new Set(
    trips
      .filter(
        (trip) =>
          trip.driverId && operativeStatuses.includes(trip.status),
      )
      .map((trip) => trip.driverId),
  );
  const availableDrivers = drivers.filter(
    (driver) => !assignedDriverIds.has(driver.id),
  );
  const publishedTrips = trips.filter((trip) => trip.driver);

  return (
    <main className="min-h-screen bg-[#F5F7FA] px-4 pb-10 pt-5 text-zinc-950 sm:px-6">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1E5BFF]">EXVIASS S.A.</p>
            <h1 className="text-2xl font-black">Operaciones del día</h1>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/admin/schedule"
              className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#1E5BFF] px-4 text-sm font-black text-white"
            >
              Gestionar rampa
            </Link>
            <p className="max-w-xl text-sm font-medium text-zinc-500">
              Ordena la rampa y publica el siguiente carro desde la cola real.
              El pasajero solo ve turnos publicados.
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Viajes hoy" value={String(metrics.todayTrips)} />
          <MetricCard
            label="Ingreso estimado"
            value={formatPen(metrics.revenueEstimate)}
          />
          <MetricCard
            label="Ocupación"
            value={`${Math.round(metrics.occupancy * 100)}%`}
          />
          <MetricCard
            label="Publicados"
            value={String(publishedTrips.length)}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section className="space-y-5">
            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Rampa del día</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold text-zinc-500">
                  Ordena los carros por llegada y publica el siguiente turno
                  desde la cola real.
                </p>
                <Link
                  href="/admin/schedule"
                  className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#1E5BFF] px-4 text-sm font-black text-white"
                >
                  Abrir gestión de rampa
                </Link>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Conductores disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableDrivers.length === 0 ? (
                  <p className="rounded-[8px] bg-zinc-50 p-3 text-sm text-zinc-500">
                    No hay conductores libres. Revisa la rampa o los turnos
                    publicados.
                  </p>
                ) : (
                  availableDrivers.map((driver) => (
                    <DriverSummary key={driver.id} driver={driver} />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Conductores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DriverProfileForms
                  drivers={drivers}
                  passengerUsers={passengerUsers}
                />
              </CardContent>
            </Card>

            <Card className="rounded-[8px]">
              <CardHeader>
                <CardTitle>Pagos pendientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin pagos pendientes.</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="rounded-[8px] bg-zinc-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {payment.booking.passengerName}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {formatPen(payment.amountPen)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Conductor:{" "}
                            {payment.booking.trip.driver?.user.name ??
                              "Sin asignar"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {payment.proofUrl ?? "Sin comprobante"}
                          </p>
                        </div>
                        <StatusBadge value={payment.status} />
                      </div>
                      {payment.status === "SUBMITTED" ? (
                        <form action={approvePaymentAction} className="mt-3">
                          <input
                            type="hidden"
                            name="paymentId"
                            value={payment.id}
                          />
                          <Button className="h-10 w-full rounded-[8px]">
                            Aprobar como admin
                          </Button>
                        </form>
                      ) : (
                        <p className="mt-3 rounded-[8px] bg-white p-2 text-xs font-semibold text-zinc-500">
                          Esperando captura del pasajero.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>

        <p className="text-xs font-semibold text-zinc-400">
          Turnos publicados: {publishedTrips.length}
        </p>
      </section>
    </main>
  );
}

function DriverProfileForms({
  drivers,
  passengerUsers,
}: {
  drivers: AdminDriver[];
  passengerUsers: AdminDashboard["users"];
}) {
  return (
    <>
      {drivers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Todavía no hay conductores registrados.
        </p>
      ) : (
        <details className="rounded-[8px] bg-zinc-50 p-3">
          <summary className="cursor-pointer text-sm font-black">
            Editar conductores existentes
          </summary>
          <div className="mt-3 space-y-3">
            {drivers.map((driver) => (
              <DriverProfileForm key={driver.id} driver={driver} />
            ))}
          </div>
        </details>
      )}

      <form
        action={upsertDriverProfileAction}
        className="space-y-3 rounded-[8px] border border-dashed border-zinc-300 bg-white p-3"
      >
        <div>
          <p className="font-semibold">Activar nuevo conductor</p>
          <p className="text-xs text-zinc-500">
            El usuario debe haber creado cuenta antes.
          </p>
        </div>
        <select
          name="userId"
          disabled={passengerUsers.length === 0}
          className="h-10 w-full rounded-[8px] border bg-white px-3 text-sm"
        >
          {passengerUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.email}
            </option>
          ))}
        </select>
        <DriverFields />
        <Button
          className="h-10 w-full rounded-[8px]"
          disabled={passengerUsers.length === 0}
        >
          Crear perfil de conductor
        </Button>
      </form>
    </>
  );
}

function DriverProfileForm({ driver }: { driver: AdminDriver }) {
  return (
    <form action={upsertDriverProfileAction} className="space-y-2 rounded-[8px] bg-white p-3">
      <input type="hidden" name="userId" value={driver.userId} />
      <div>
        <p className="font-semibold">{driver.user.name}</p>
        <p className="text-xs text-zinc-500">{driver.user.email}</p>
      </div>
      <DriverFields driver={driver} />
      <Button className="h-10 w-full rounded-[8px]">Guardar conductor</Button>
    </form>
  );
}

function DriverFields({ driver }: { driver?: AdminDriver }) {
  return (
    <div className="grid gap-2">
      <input
        name="phone"
        defaultValue={driver?.phone ?? ""}
        placeholder="Celular"
        className="h-10 rounded-[8px] border bg-white px-3 text-sm"
      />
      <input
        name="licensePlate"
        defaultValue={driver?.licensePlate ?? ""}
        placeholder="Placa"
        className="h-10 rounded-[8px] border bg-white px-3 text-sm"
      />
      <select
        name="vehicleName"
        defaultValue={getVehicleOption(driver?.vehicleName).id}
        className="h-10 rounded-[8px] border bg-white px-3 text-sm"
      >
        {vehicleCatalog.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.name}
          </option>
        ))}
      </select>
      <input
        name="yapePhone"
        defaultValue={driver?.yapePhone ?? ""}
        placeholder="Número Yape"
        className="h-10 rounded-[8px] border bg-white px-3 text-sm"
      />
      <input
        name="yapeName"
        defaultValue={driver?.yapeName ?? ""}
        placeholder="Titular Yape"
        className="h-10 rounded-[8px] border bg-white px-3 text-sm"
      />
    </div>
  );
}

function DriverSummary({ driver }: { driver: AdminDriver }) {
  const vehicle = getVehicleOption(driver.vehicleName);

  return (
    <div className="rounded-[8px] bg-zinc-50 p-3">
      <p className="font-semibold">{driver.user.name}</p>
      <p className="text-xs text-zinc-500">
        {vehicle.shortName} · {driver.licensePlate ?? "Sin placa"}
      </p>
      <p className="text-xs text-zinc-500">
        Yape: {driver.yapePhone ?? "Pendiente"}
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-[8px]" size="sm">
      <CardContent>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
