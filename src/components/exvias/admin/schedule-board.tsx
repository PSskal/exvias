"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import {
  publishNextRampTurnAction,
  saveRampQueuesAction,
} from "@/app/actions";
import type { RouteDirection } from "@/lib/generated/prisma/client";

const CUSCO_TO_COLQUEPATA = "CUSCO_TO_COLQUEPATA" satisfies RouteDirection;
const COLQUEPATA_TO_CUSCO = "COLQUEPATA_TO_CUSCO" satisfies RouteDirection;

type RampDriver = {
  id: string;
  name: string;
  plate: string;
  vehicle: string;
  yapePhone: string;
  available: boolean;
};

type RampDirection = {
  id: RouteDirection;
  label: string;
  startLabel: string;
  nextLabel: string;
};

type ColumnId = "free" | RouteDirection;

type Columns = Record<ColumnId, RampDriver[]>;

function driverDragId(driverId: string) {
  return `driver:${driverId}`;
}

function rawId(id: string) {
  return id.split(":").slice(1).join(":");
}

function findColumn(columns: Columns, driverId: string): ColumnId | null {
  for (const [columnId, drivers] of Object.entries(columns)) {
    if (drivers.some((driver) => driver.id === driverId)) {
      return columnId as ColumnId;
    }
  }

  return null;
}

export function ScheduleBoard({
  routeId,
  freeDrivers,
  queues,
  directions,
}: {
  routeId: string;
  freeDrivers: RampDriver[];
  queues: Record<RouteDirection, RampDriver[]>;
  directions: RampDirection[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(() => ({
    free: freeDrivers,
    [CUSCO_TO_COLQUEPATA]: queues[CUSCO_TO_COLQUEPATA] ?? [],
    [COLQUEPATA_TO_CUSCO]: queues[COLQUEPATA_TO_CUSCO] ?? [],
  }));
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const directionIds = useMemo(
    () => directions.map((direction) => direction.id),
    [directions],
  );

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (!activeId.startsWith("driver:") || !overId) return;

    const driverId = rawId(activeId);
    const fromColumn = findColumn(columns, driverId);
    if (!fromColumn) return;

    const overDriverId = overId.startsWith("driver:") ? rawId(overId) : null;
    const toColumn = overDriverId
      ? findColumn(columns, overDriverId)
      : (overId as ColumnId);

    if (!toColumn || !(toColumn in columns)) return;

    const fromDrivers = columns[fromColumn];
    const activeDriver = fromDrivers.find((driver) => driver.id === driverId);
    if (!activeDriver) return;

    if (fromColumn === toColumn) {
      const oldIndex = fromDrivers.findIndex((driver) => driver.id === driverId);
      const newIndex = overDriverId
        ? fromDrivers.findIndex((driver) => driver.id === overDriverId)
        : fromDrivers.length - 1;

      if (oldIndex === newIndex) return;

      setColumns((current) => ({
        ...current,
        [fromColumn]: arrayMove(current[fromColumn], oldIndex, newIndex),
      }));
      setDirty(true);
      setSavedMessage(null);
      return;
    }

    const targetDrivers = columns[toColumn];
    const insertIndex = overDriverId
      ? targetDrivers.findIndex((driver) => driver.id === overDriverId)
      : targetDrivers.length;

    setColumns((current) => ({
      ...current,
      [fromColumn]: current[fromColumn].filter((driver) => driver.id !== driverId),
      [toColumn]: [
        ...current[toColumn].slice(0, insertIndex),
        activeDriver,
        ...current[toColumn].slice(insertIndex),
      ],
    }));
    setDirty(true);
    setSavedMessage(null);
  }

  function handleSave() {
    setError(null);
    setSavedMessage(null);
    startSaveTransition(async () => {
      try {
        await saveRampQueuesAction({
          routeId,
          queues: directionIds.map((direction) => ({
            direction,
            driverIds: columns[direction].map((driver) => driver.id),
          })),
        });
        setDirty(false);
        setSavedMessage("Rampa guardada.");
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "No se pudo guardar la rampa.",
        );
      }
    });
  }

  function handlePublish(direction: RouteDirection) {
    setError(null);
    setSavedMessage(null);
    startPublishTransition(async () => {
      try {
        if (dirty) {
          await saveRampQueuesAction({
            routeId,
            queues: directionIds.map((item) => ({
              direction: item,
              driverIds: columns[item].map((driver) => driver.id),
            })),
          });
        }
        await publishNextRampTurnAction({ routeId, direction });
        setDirty(false);
        setSavedMessage("Siguiente turno publicado.");
        router.refresh();
      } catch (publishError) {
        setError(
          publishError instanceof Error
            ? publishError.message
            : "No se pudo publicar el turno.",
        );
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="sticky top-0 z-20 -mx-4 border-y border-zinc-200 bg-[#F5F7FA]/95 px-4 py-3 backdrop-blur sm:rounded-[12px] sm:border sm:shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black">
              {dirty ? "Hay cambios sin guardar" : "Rampa sincronizada"}
            </p>
            <p className="text-xs font-semibold text-zinc-500">
              Ordena la rampa. Los pasajeros solo ven turnos publicados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedMessage ? (
              <span className="text-xs font-black text-[#1c7c44]">
                {savedMessage}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || isSaving || isPublishing}
              className="h-10 rounded-[8px] bg-[#1E5BFF] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isSaving ? "Guardando..." : "Guardar rampa"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="mx-auto mt-2 max-w-7xl rounded-[8px] bg-[#E53935]/10 p-3 text-sm font-bold text-[#E53935]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <RampColumn
          id="free"
          title="Conductores libres"
          subtitle="Arrastra hacia la rampa"
          drivers={columns.free}
          emptyText="No hay conductores libres."
        />

        <section className="grid gap-5 lg:grid-cols-2">
          {directions.map((direction) => (
            <RampColumn
              key={direction.id}
              id={direction.id}
              title={direction.label}
              subtitle={`Primeros 3: ${direction.startLabel} · Siguientes: ${direction.nextLabel}`}
              drivers={columns[direction.id]}
              emptyText="Sin conductores en esta rampa."
              action={
                <button
                  type="button"
                  onClick={() => handlePublish(direction.id)}
                  disabled={columns[direction.id].length === 0 || isPublishing}
                  className="h-9 rounded-[8px] bg-[#2ECC71] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isPublishing ? "Publicando..." : "Publicar siguiente"}
                </button>
              }
            />
          ))}
        </section>
      </div>
    </DndContext>
  );
}

function RampColumn({
  id,
  title,
  subtitle,
  drivers,
  emptyText,
  action,
}: {
  id: ColumnId;
  title: string;
  subtitle: string;
  drivers: RampDriver[];
  emptyText: string;
  action?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={`space-y-3 rounded-[12px] bg-white p-4 shadow-sm ring-1 transition ${
        isOver ? "ring-[#1E5BFF]" : "ring-zinc-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-zinc-500">{subtitle}</p>
        </div>
        {action ?? (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">
            {drivers.length}
          </span>
        )}
      </div>

      <SortableContext
        items={drivers.map((driver) => driverDragId(driver.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 space-y-3 rounded-[10px] bg-[#F5F7FA] p-2">
          {drivers.length === 0 ? (
            <p className="rounded-[8px] bg-white p-3 text-sm font-semibold text-zinc-500">
              {emptyText}
            </p>
          ) : (
            drivers.map((driver, index) => (
              <SortableDriver
                key={driver.id}
                driver={driver}
                position={id === "free" ? null : index + 1}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableDriver({
  driver,
  position,
}: {
  driver: RampDriver;
  position: number | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: driverDragId(driver.id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className={`w-full cursor-grab rounded-[10px] bg-white p-3 text-left ring-1 ring-zinc-200 transition active:cursor-grabbing ${
        isDragging ? "opacity-70 shadow-lg" : "hover:bg-[#EEF3FF]"
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{driver.name}</p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {driver.vehicle} · {driver.plate}
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {driver.yapePhone}
          </p>
        </div>
        {position ? (
          <span className="grid size-8 place-items-center rounded-full bg-[#1E5BFF]/10 text-xs font-black text-[#1E5BFF]">
            {position}
          </span>
        ) : null}
      </div>
    </button>
  );
}
