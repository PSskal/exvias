"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type RouteMapPoint = {
  id: string;
  name: string;
  minuteOffset: number;
  latitude: number | null;
  longitude: number | null;
  isTerminal: boolean;
};

type GoogleMapsApi = {
  Map: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => GoogleMapInstance;
  LatLngBounds: new () => GoogleLatLngBounds;
  Marker: new (options: {
    map: GoogleMapInstance | null;
    position: LatLngLiteral;
    title: string;
    label?: {
      text: string;
      color: string;
      fontSize: string;
      fontWeight: string;
    };
    icon?: {
      path: number;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeWeight: number;
      scale: number;
    };
  }) => GoogleMarker;
  SymbolPath: {
    CIRCLE: number;
  };
  Polyline: new (options: Record<string, unknown>) => GooglePolyline;
  DirectionsService: new () => GoogleDirectionsService;
  DirectionsRenderer: new (
    options?: Record<string, unknown>,
  ) => GoogleDirectionsRenderer;
  TravelMode: {
    DRIVING: string;
  };
  DirectionsStatus: {
    OK: string;
  };
  ControlPosition: {
    RIGHT_BOTTOM: number;
  };
  importLibrary?: (library: string) => Promise<unknown>;
};

type GoogleLatLngBounds = {
  extend(position: LatLngLiteral): void;
  union(other: GoogleLatLngBounds): GoogleLatLngBounds;
};

type GooglePolyline = {
  setMap(map: GoogleMapInstance | null): void;
};

type GoogleDirectionsService = {
  route(
    request: {
      origin: LatLngLiteral;
      destination: LatLngLiteral;
      waypoints?: Array<{ location: LatLngLiteral; stopover: boolean }>;
      travelMode: string;
      optimizeWaypoints?: boolean;
    },
    callback: (result: GoogleDirectionsResult | null, status: string) => void,
  ): void;
};

type GoogleDirectionsResult = {
  routes: Array<{
    bounds: GoogleLatLngBounds;
    legs: Array<unknown>;
    overview_path: Array<LatLngLiteral>;
  }>;
};

type GoogleDirectionsRenderer = {
  setMap(map: GoogleMapInstance | null): void;
  setDirections(result: GoogleDirectionsResult): void;
};

type GoogleMapInstance = {
  fitBounds(bounds: unknown, padding?: number): void;
  setCenter(position: LatLngLiteral): void;
  panTo(position: LatLngLiteral): void;
};

type GoogleMarker = {
  setMap(map: GoogleMapInstance | null): void;
  addListener?: (eventName: string, listener: () => void) => void;
  addEventListener?: (eventName: string, listener: () => void) => void;
  map?: GoogleMapInstance | null;
};

type LatLngLiteral = {
  lat: number;
  lng: number;
};

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsApi;
    };
    exviassGoogleMapsPromise?: Promise<GoogleMapsApi>;
    exviassGoogleMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

function pointTime(
  point: RouteMapPoint,
  plannedDepartureAtIso?: string | null,
) {
  if (!plannedDepartureAtIso) return `+${point.minuteOffset} min`;

  const date = new Date(
    new Date(plannedDepartureAtIso).getTime() + point.minuteOffset * 60_000,
  );

  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pointPosition(point: RouteMapPoint): LatLngLiteral | null {
  if (point.latitude === null || point.longitude === null) return null;
  return { lat: point.latitude, lng: point.longitude };
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps solo carga en navegador"));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (window.exviassGoogleMapsPromise) {
    return window.exviassGoogleMapsPromise;
  }

  window.exviassGoogleMapsPromise = new Promise<GoogleMapsApi>(
    (resolve, reject) => {
      const fail = (message: string) => {
        window.exviassGoogleMapsPromise = undefined;
        window.exviassGoogleMapsReady = undefined;
        reject(new Error(message));
      };

      window.gm_authFailure = () => {
        fail(
          "Google rechazó la API key. Autoriza http://localhost:3000/* y guarda los cambios.",
        );
      };

      window.exviassGoogleMapsReady = () => {
        if (window.google?.maps?.Map) {
          resolve(window.google.maps);
        } else {
          fail("Google Maps no respondió correctamente");
        }
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-exviass-google-maps="true"]',
      );

      if (existingScript) {
        existingScript.addEventListener("error", () => {
          fail("No se pudo cargar Google Maps");
        });
        return;
      }

      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: apiKey,
        v: "weekly",
        callback: "exviassGoogleMapsReady",
        loading: "async",
        language: "es",
        region: "PE",
      });

      if (googleMapsMapId) {
        params.set("libraries", "marker");
      }

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.dataset.exviassGoogleMaps = "true";
      script.addEventListener("error", () => {
        fail("No se pudo cargar Google Maps");
      });
      document.head.appendChild(script);
    },
  );

  return window.exviassGoogleMapsPromise;
}

// Pide a la Directions API la ruta real por carretera entre todos los puntos.
// El primer y último punto son origen/destino; los del medio son waypoints.
function fetchDirectionsRoute(
  maps: GoogleMapsApi,
  positions: LatLngLiteral[],
): Promise<GoogleDirectionsResult> {
  return new Promise((resolve, reject) => {
    if (!maps.DirectionsService || !maps.TravelMode || !maps.DirectionsStatus) {
      reject(new Error("Directions API no disponible"));
      return;
    }

    const service = new maps.DirectionsService();
    const origin = positions[0];
    const destination = positions[positions.length - 1];

    // Los puntos intermedios van como waypoints
    const waypoints = positions.slice(1, -1).map((location) => ({
      location,
      stopover: false, // false = paso por ahí pero no para; la ruta sigue siendo continua
    }));

    service.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // respetar el orden real de la ruta
      },
      (result, status) => {
        if (status === maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(
            new Error(
              `Directions API falló con estado: ${status}. ` +
                "Verifica que la API key tenga habilitada la Directions API.",
            ),
          );
        }
      },
    );
  });
}

async function createMarker(input: {
  maps: GoogleMapsApi;
  map: GoogleMapInstance;
  point: RouteMapPoint;
  selected: boolean;
  onClick: () => void;
}): Promise<GoogleMarker | null> {
  const position = pointPosition(input.point);
  if (!position) return null;

  if (googleMapsMapId) {
    return createAdvancedMarker(input, position);
  }

  const marker = new input.maps.Marker({
    map: input.map,
    position,
    title: input.point.name,
    label: {
      text: input.point.isTerminal ? "T" : String(input.point.minuteOffset),
      color: "#ffffff",
      fontSize: "12px",
      fontWeight: "800",
    },
    icon: {
      path: input.maps.SymbolPath.CIRCLE,
      fillColor: input.selected
        ? "#2ECC71"
        : input.point.isTerminal
          ? "#E53935"
          : "#1E5BFF",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 4,
      scale: input.selected ? 11 : 9,
    },
  });
  marker.addListener?.("click", input.onClick);

  return marker;
}

async function createAdvancedMarker(
  input: {
    maps: GoogleMapsApi;
    map: GoogleMapInstance;
    point: RouteMapPoint;
    selected: boolean;
    onClick: () => void;
  },
  position: LatLngLiteral,
): Promise<GoogleMarker | null> {
  if (!input.maps.importLibrary) return null;

  const markerLibrary = await input.maps.importLibrary("marker");
  if (
    !markerLibrary ||
    typeof markerLibrary !== "object" ||
    !("AdvancedMarkerElement" in markerLibrary)
  ) {
    return null;
  }

  const AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement as new (
    options: Record<string, unknown>,
  ) => GoogleMarker;

  const marker = new AdvancedMarkerElement({
    map: input.map,
    position,
    title: input.point.name,
    gmpClickable: true,
    content: createAdvancedMarkerContent(input.point, input.selected),
  });

  marker.addEventListener?.("gmp-click", input.onClick);
  return marker;
}

function createAdvancedMarkerContent(point: RouteMapPoint, selected: boolean) {
  const wrapper = document.createElement("div");
  wrapper.className = cn(
    "grid size-9 place-items-center rounded-full border-[3px] border-white text-white shadow-[0_10px_24px_rgba(15,23,42,0.25)] transition",
    selected
      ? "scale-110 bg-[#2ECC71]"
      : point.isTerminal
        ? "bg-[#E53935]"
        : "bg-[#1E5BFF]",
  );

  const label = document.createElement("span");
  label.className = "text-xs font-black";
  label.textContent = point.isTerminal ? "T" : String(point.minuteOffset);
  wrapper.appendChild(label);

  return wrapper;
}

function clearMarkers(markers: GoogleMarker[]) {
  markers.forEach((marker) => {
    if (marker.setMap) marker.setMap(null);
    else marker.map = null;
  });
}

export function RoutePointMapPicker({
  points,
  boardablePointIds,
  plannedDepartureAtIso,
}: {
  points: RouteMapPoint[];
  boardablePointIds: string[];
  plannedDepartureAtIso?: string | null;
}) {
  const boardableSet = useMemo(
    () => new Set(boardablePointIds),
    [boardablePointIds],
  );
  const boardablePoints = useMemo(
    () => points.filter((point) => boardableSet.has(point.id)),
    [points, boardableSet],
  );

  const defaultPoint =
    boardablePoints.find((point) => !point.isTerminal)?.id ??
    boardablePoints[0]?.id ??
    null;

  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    defaultPoint,
  );
  const [mapError, setMapError] = useState<string | null>(null);

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  // Usamos DirectionsRenderer en vez de Polyline para dibujar la ruta real
  const directionsRendererRef = useRef<GoogleDirectionsRenderer | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);

  const locatedPoints = useMemo(
    () => points.filter((point) => pointPosition(point)),
    [points],
  );

  const selectedPoint = points.find((point) => point.id === selectedPointId);

  const canUseGoogleMap = Boolean(
    googleMapsApiKey &&
    locatedPoints.length === points.length &&
    points.length > 1,
  );

  const mapUnavailableMessage = !googleMapsApiKey
    ? "Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY y reiniciar el servidor."
    : locatedPoints.length !== points.length
      ? "Faltan coordenadas en algunos puntos de subida."
      : points.length <= 1
        ? "Se necesitan al menos dos puntos para mostrar el mapa."
        : mapError
          ? mapError
          : null;

  // Efecto 1: inicializar el mapa y trazar la ruta real con Directions API
  useEffect(() => {
    if (!canUseGoogleMap || !googleMapsApiKey || !mapElementRef.current) return;

    let cancelled = false;

    async function initMap() {
      try {
        const maps = await loadGoogleMaps(googleMapsApiKey!);
        if (cancelled || !mapElementRef.current) return;

        const firstPosition = pointPosition(locatedPoints[0]);
        if (!firstPosition) return;

        // Crear el mapa solo la primera vez
        if (!mapRef.current) {
          const zoomControlPosition = maps.ControlPosition?.RIGHT_BOTTOM;

          mapRef.current = new maps.Map(mapElementRef.current, {
            center: firstPosition,
            zoom: 11,
            ...(googleMapsMapId
              ? { mapId: googleMapsMapId }
              : {
                  styles: [
                    {
                      featureType: "poi.business",
                      stylers: [{ visibility: "off" }],
                    },
                    {
                      featureType: "transit",
                      stylers: [{ visibility: "off" }],
                    },
                  ],
                }),
            disableDefaultUI: true,
            zoomControl: true,
            ...(zoomControlPosition !== undefined
              ? { zoomControlOptions: { position: zoomControlPosition } }
              : {}),
            clickableIcons: false,
            gestureHandling: "greedy",
          });
        }

        const map = mapRef.current;
        const positions = locatedPoints
          .map(pointPosition)
          .filter((p): p is LatLngLiteral => Boolean(p));

        // Limpiar renderer anterior si existe
        directionsRendererRef.current?.setMap(null);

        // Crear un DirectionsRenderer nuevo con estilo personalizado
        // suppressMarkers: true porque nosotros ponemos nuestros propios markers
        const renderer = new maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#1E5BFF",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        });
        renderer.setMap(map);
        directionsRendererRef.current = renderer;

        // Pedir la ruta real a la Directions API
        const directionsResult = await fetchDirectionsRoute(maps, positions);

        if (cancelled) return;

        renderer.setDirections(directionsResult);

        // fitBounds usando los bounds que devuelve la propia ruta
        if (directionsResult.routes[0]?.bounds) {
          map.fitBounds(directionsResult.routes[0].bounds, 54);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(
            error instanceof Error
              ? error.message
              : "Google Maps no pudo cargar. Revisa la API key.",
          );
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current = null;
      clearMarkers(markersRef.current);
      markersRef.current = [];
    };
  }, [canUseGoogleMap, locatedPoints]);

  // Efecto 2: actualizar solo los markers al cambiar la selección
  useEffect(() => {
    if (!mapRef.current || !canUseGoogleMap) return;

    const maps = window.google?.maps;
    if (!maps) return;

    let cancelled = false;

    async function updateMarkers() {
      if (!mapRef.current) return;
      const map = mapRef.current;

      clearMarkers(markersRef.current);
      markersRef.current = [];

      const newMarkers = await Promise.all(
        locatedPoints.map((point) =>
          createMarker({
            maps: maps!,
            map,
            point,
            selected: point.id === selectedPointId,
            onClick: () => setSelectedPointId(point.id),
          }),
        ),
      );

      if (cancelled) {
        newMarkers.forEach((m) => m?.setMap(null));
        return;
      }

      markersRef.current = newMarkers.filter((m): m is GoogleMarker =>
        Boolean(m),
      );
    }

    void updateMarkers();

    return () => {
      cancelled = true;
    };
  }, [canUseGoogleMap, locatedPoints, selectedPointId]);

  // Efecto 3: panTo al punto seleccionado
  useEffect(() => {
    if (!mapRef.current || !selectedPoint) return;

    const selectedPosition = pointPosition(selectedPoint);
    if (selectedPosition) mapRef.current.panTo(selectedPosition);
  }, [selectedPoint]);

  if (points.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#f8fafc,#eef4f6)] p-4 shadow-inner ring-1 ring-slate-200/70">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          Paso 1
        </p>
        <h2 className="font-black text-slate-950">Selecciona dónde subirás</h2>
      </div>

      {canUseGoogleMap && !mapError ? (
        <div className="mb-3 overflow-hidden rounded-[22px] bg-slate-200 shadow-inner ring-1 ring-white">
          <div ref={mapElementRef} className="h-64 w-full" />
        </div>
      ) : (
        <div className="mb-3 rounded-[18px] bg-[#F4B400]/15 p-3 text-xs font-bold text-[#8a6500]">
          {mapUnavailableMessage ??
            "El mapa no está disponible por ahora. Puedes elegir tu punto en la lista."}
        </div>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-[22px] p-4 ring-1 ring-white",
          canUseGoogleMap && !mapError
            ? "bg-white"
            : "bg-[linear-gradient(145deg,#EAF1FF,#F8FAFC)]",
        )}
      >
        {canUseGoogleMap && !mapError ? null : (
          <div className="absolute bottom-8 left-8 top-8 w-1 rounded-full bg-[#1E5BFF]/20" />
        )}
        <div className="space-y-3">
          {points.map((point, index) => {
            const isSelected = point.id === selectedPointId;
            const isBoardable = boardableSet.has(point.id);
            return (
              <label
                key={point.id}
                className={cn(
                  "relative flex gap-3",
                  isBoardable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                )}
              >
                {isBoardable ? (
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="boardingPointId"
                    value={point.id}
                    checked={isSelected}
                    onChange={() => setSelectedPointId(point.id)}
                    required
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 mt-4 grid size-8 shrink-0 place-items-center rounded-full border-4 border-white text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] transition-colors",
                    isSelected
                      ? "bg-[#2ECC71]"
                      : point.isTerminal
                        ? "bg-[#E53935]"
                        : "bg-[#1E5BFF]",
                  )}
                >
                  <MapPin className="size-4" />
                </span>

                <span
                  className={cn(
                    "block min-w-0 flex-1 rounded-[18px] bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 transition",
                    isSelected ? "ring-2 ring-[#1E5BFF]" : "ring-transparent",
                  )}
                >
                  <span className="block truncate text-sm font-black text-slate-950">
                    {point.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                    Paso aprox: {pointTime(point, plannedDepartureAtIso)}
                  </span>
                  {!isBoardable ? (
                    <span className="mt-3 block rounded-full bg-slate-200 px-3 py-1.5 text-center text-[11px] font-black text-slate-600">
                      Destino final
                    </span>
                  ) : isSelected ? (
                    <span className="mt-3 block rounded-full bg-[#1E5BFF] px-3 py-1.5 text-center text-[11px] font-black text-white">
                      Elegido
                    </span>
                  ) : null}
                </span>

                {!defaultPoint && isBoardable && index === 0 ? (
                  <input
                    type="hidden"
                    name="boardingPointId"
                    value={point.id}
                  />
                ) : null}
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
