"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RouteMapPoint = {
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

type MapPadding = number | { top?: number; right?: number; bottom?: number; left?: number };

type GoogleMapInstance = {
  fitBounds(bounds: unknown, padding?: MapPadding): void;
  setCenter(position: LatLngLiteral): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  addListener(
    eventName: string,
    handler: (event: { latLng: { lat(): number; lng(): number } | null }) => void,
  ): { remove(): void };
};

type GoogleMarker = {
  setMap(map: GoogleMapInstance | null): void;
  addListener?: (eventName: string, listener: () => void) => void;
  addEventListener?: (eventName: string, listener: () => void) => void;
  map?: GoogleMapInstance | null;
};

export type LatLngLiteral = {
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

// Arma un <svg> plano (string) a partir de nodos de ícono estilo lucide
// ([tag, atributos][]), para usar dentro de marcadores del mapa (DOM normal,
// no React). No usa renderToStaticMarkup a propósito: invocarlo desde dentro
// de un render del lado del servidor puede chocar con el propio render de
// Next y tirar un "Invalid hook call".
export function svgIconHtml(
  nodes: Array<[string, Record<string, string | number>]>,
  color: string,
  size = 18,
) {
  const inner = nodes
    .map(([tag, attrs]) => {
      const attrString = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `<${tag} ${attrString} />`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

export function pointPosition(point: RouteMapPoint): LatLngLiteral | null {
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
  boardable: boolean;
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
        : !input.boardable
          ? "#94A3B8"
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
    boardable: boolean;
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
    content: createAdvancedMarkerContent(input.point, input.selected, input.boardable),
  });

  marker.addEventListener?.("gmp-click", input.onClick);
  return marker;
}

function createAdvancedMarkerContent(
  point: RouteMapPoint,
  selected: boolean,
  boardable: boolean,
) {
  const wrapper = document.createElement("div");
  wrapper.className = cn(
    "grid place-items-center rounded-full border-[3px] border-white text-white shadow-[0_10px_24px_rgba(15,23,42,0.3)] transition-transform",
    selected ? "size-11 scale-110 bg-[#2ECC71]" : "size-9",
    !selected && !boardable
      ? "bg-slate-400"
      : !selected && point.isTerminal
        ? "bg-[#E53935]"
        : !selected
          ? "bg-[#1E5BFF]"
          : "",
  );

  const label = document.createElement("span");
  label.className = "text-xs font-black";
  label.textContent = point.isTerminal ? "T" : String(point.minuteOffset);
  wrapper.appendChild(label);

  return wrapper;
}

// Marcador simple con un emoji, usado para el pin libre (driver eligiendo
// dónde reportar) y para mostrar alertas existentes sobre la ruta.
export type MapMarkerPoint = {
  id: string;
  position: LatLngLiteral;
  // Markup de un ícono ya renderizado (p.ej. con renderToStaticMarkup sobre
  // un ícono de lucide-react). Este componente no sabe nada de qué ícono es,
  // solo lo inserta — así no depende de lucide-react directamente.
  iconHtml: string;
  highlighted?: boolean;
  // Anillo pulsante rojo: señala "esto es una alerta activa" en el mapa.
  pulse?: boolean;
  onClick?: () => void;
};

async function createMapMarker(input: {
  maps: GoogleMapsApi;
  map: GoogleMapInstance;
  point: MapMarkerPoint;
}): Promise<GoogleMarker | null> {
  if (googleMapsMapId && input.maps.importLibrary) {
    const markerLibrary = await input.maps.importLibrary("marker");
    if (
      markerLibrary &&
      typeof markerLibrary === "object" &&
      "AdvancedMarkerElement" in markerLibrary
    ) {
      const AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement as new (
        options: Record<string, unknown>,
      ) => GoogleMarker;

      const wrapper = document.createElement("div");
      wrapper.className = "relative grid place-items-center";

      if (input.point.pulse) {
        const ring = document.createElement("span");
        ring.className =
          "absolute inset-0 animate-ping rounded-full bg-[#E53935]/60";
        wrapper.appendChild(ring);
      }

      const badge = document.createElement("span");
      badge.className = cn(
        "relative grid place-items-center rounded-full border-[3px] border-white bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.3)]",
        input.point.highlighted ? "size-11 scale-110" : "size-9",
      );
      badge.innerHTML = input.point.iconHtml;
      wrapper.appendChild(badge);

      const marker = new AdvancedMarkerElement({
        map: input.map,
        position: input.point.position,
        gmpClickable: Boolean(input.point.onClick),
        content: wrapper,
      });
      if (input.point.onClick) {
        marker.addEventListener?.("gmp-click", input.point.onClick);
      }
      return marker;
    }
  }

  const marker = new input.maps.Marker({
    map: input.map,
    position: input.point.position,
    title: "Alerta",
    icon: {
      path: input.maps.SymbolPath.CIRCLE,
      fillColor: "#ffffff",
      fillOpacity: 1,
      strokeColor: input.point.pulse ? "#E53935" : "#ffffff",
      strokeWeight: 4,
      scale: input.point.highlighted ? 14 : 12,
    },
  });
  if (input.point.onClick) {
    marker.addListener?.("click", input.point.onClick);
  }
  return marker;
}

function clearMarkers(markers: GoogleMarker[]) {
  markers.forEach((marker) => {
    if (marker.setMap) marker.setMap(null);
    else marker.map = null;
  });
}

// Centra el mapa en `position` con zoom `targetZoom`, pero desplazado hacia
// arriba para que el punto caiga a la mitad del área visible (encima de la
// ficha inferior), no en el centro geométrico del div.
//
// No usamos panTo + setZoom + panBy porque setZoom no aplica su nueva escala
// de forma síncrona: un panBy inmediatamente después se calcula con el zoom
// viejo, y si el salto de zoom es grande (p.ej. de la vista general a un
// punto puntual) el desplazamiento termina siendo completamente erróneo.
// En vez de eso, calculamos el corrimiento en grados directamente con la
// resolución del zoom final.
function focusMapOn(
  map: GoogleMapInstance,
  position: LatLngLiteral,
  bottomInsetPx: number,
  minZoom: number,
) {
  const targetZoom = Math.max(map.getZoom() ?? 0, minZoom);
  const metersPerPixel =
    (156543.03392 * Math.cos((position.lat * Math.PI) / 180)) /
    Math.pow(2, targetZoom);
  const shiftMeters = (bottomInsetPx / 2) * metersPerPixel;
  const shiftDegreesLat = shiftMeters / 111_320;

  map.setZoom(targetZoom);
  map.setCenter({ lat: position.lat - shiftDegreesLat, lng: position.lng });
}

const OVERVIEW_PADDING = { top: 100, right: 56, left: 56 };
// Aire extra debajo del alto real de la ficha, para que la ruta no quede
// pegada al borde del panel sino centrada con margen en el área visible.
const OVERVIEW_BOTTOM_GAP = 90;
const SELECTED_POINT_ZOOM = 15;

export function RouteMapCanvas({
  points,
  boardablePointIds,
  selectedPointId,
  onSelectPoint,
  bottomInsetPx = 320,
  onMapClick,
  draftPin,
  extraMarkers,
  focusTarget,
  className,
}: {
  points: RouteMapPoint[];
  boardablePointIds: string[];
  selectedPointId: string | null;
  onSelectPoint: (id: string) => void;
  // Alto aproximado del panel inferior que tapa parte del mapa, para que la
  // ruta y el punto seleccionado queden centrados en el área realmente
  // visible (arriba de la ficha), no en el centro geométrico del div.
  bottomInsetPx?: number;
  // Modo "pin libre": si se pasa, tocar cualquier parte del mapa reporta la
  // posición tocada (se usa para que un conductor marque una alerta, a
  // diferencia de los `points` fijos que elige un pasajero).
  onMapClick?: (position: LatLngLiteral) => void;
  draftPin?: MapMarkerPoint | null;
  extraMarkers?: MapMarkerPoint[];
  // Pide centrar y hacer zoom a una posición arbitraria (p.ej. al tocar una
  // alerta existente para verla). `key` debe cambiar para que se repita el
  // enfoque aunque la posición sea la misma que la anterior.
  focusTarget?: { position: LatLngLiteral; key: string } | null;
  className?: string;
}) {
  const boardableSet = useMemo(
    () => new Set(boardablePointIds),
    [boardablePointIds],
  );

  const [mapError, setMapError] = useState<string | null>(null);
  // Bounds de la ruta ya resuelta por Directions API. Es estado (no ref) para
  // que el efecto de encuadre reaccione tanto a esto como al alto real de la
  // ficha inferior, sin importar cuál de los dos esté listo primero.
  const [routeBounds, setRouteBounds] = useState<GoogleLatLngBounds | null>(null);

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  // Usamos DirectionsRenderer en vez de Polyline para dibujar la ruta real
  const directionsRendererRef = useRef<GoogleDirectionsRenderer | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const extraMarkersRef = useRef<GoogleMarker[]>([]);
  // Espejo del callback en un ref: el listener de click del mapa se agrega
  // una sola vez y siempre debe llamar a la versión más reciente.
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);
  // Mientras el usuario no haya tocado un punto, el encuadre general (overview)
  // puede seguir re-ajustándose cuando se mide el alto real de la ficha inferior.
  const userHasSelectedRef = useRef(false);

  const locatedPoints = useMemo(
    () => points.filter((point) => pointPosition(point)),
    [points],
  );

  const selectedPoint = points.find((point) => point.id === selectedPointId);
  // Espejo del prop en un ref para leerlo dentro de efectos sin que su
  // cambio dispare ese efecto (solo nos importa el valor más reciente).
  const bottomInsetRef = useRef(bottomInsetPx);
  useEffect(() => {
    bottomInsetRef.current = bottomInsetPx;
  }, [bottomInsetPx]);

  const canUseGoogleMap = Boolean(
    googleMapsApiKey &&
    locatedPoints.length === points.length &&
    points.length > 1,
  );

  const mapUnavailableMessage = !googleMapsApiKey
    ? "Falta configurar el mapa. Elige tu punto en la lista de abajo."
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

          mapRef.current.addListener("click", (event) => {
            const latLng = event.latLng;
            if (latLng) {
              onMapClickRef.current?.({ lat: latLng.lat(), lng: latLng.lng() });
            }
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

        // El encuadre (fitBounds) lo aplica el efecto dedicado más abajo,
        // que también reacciona si el alto real de la ficha llega después.
        if (directionsResult.routes[0]?.bounds) {
          setRouteBounds(directionsResult.routes[0].bounds);
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
      clearMarkers(extraMarkersRef.current);
      extraMarkersRef.current = [];
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
            boardable: boardableSet.has(point.id),
            onClick: () => {
              if (boardableSet.has(point.id)) onSelectPoint(point.id);
            },
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
    // `routeBounds` se incluye solo como señal de "el mapa ya está listo"
    // (el mapa se crea de forma asíncrona en el efecto 1): sin esto, si
    // ninguna otra dependencia cambia después del montaje, los marcadores
    // nunca llegan a dibujarse.
  }, [canUseGoogleMap, locatedPoints, selectedPointId, boardableSet, onSelectPoint, routeBounds]);

  // Efecto 2b: dibuja el pin libre (borrador) y los marcadores extra (p.ej.
  // alertas ya reportadas en la ruta), independiente de los `points` fijos.
  useEffect(() => {
    if (!mapRef.current || !canUseGoogleMap) return;

    const maps = window.google?.maps;
    if (!maps) return;

    const map = mapRef.current;
    let cancelled = false;

    const allMarkerPoints = [
      ...(extraMarkers ?? []),
      ...(draftPin ? [draftPin] : []),
    ];

    async function updateExtraMarkers() {
      clearMarkers(extraMarkersRef.current);
      extraMarkersRef.current = [];

      const newMarkers = await Promise.all(
        allMarkerPoints.map((point) => createMapMarker({ maps: maps!, map, point })),
      );

      if (cancelled) {
        newMarkers.forEach((m) => m?.setMap(null));
        return;
      }

      extraMarkersRef.current = newMarkers.filter((m): m is GoogleMarker => Boolean(m));
    }

    void updateExtraMarkers();

    return () => {
      cancelled = true;
    };
  }, [canUseGoogleMap, draftPin, extraMarkers, routeBounds]);

  // Efecto 3: al cambiar la selección, hacer zoom y centrar el punto en el
  // área visible (arriba de la ficha inferior), como un mapa de apps modernas.
  // La primera selección (al montar) no anima: ya se ve completa por el fitBounds.
  const isFirstSelectionRef = useRef(true);
  useEffect(() => {
    if (isFirstSelectionRef.current) {
      isFirstSelectionRef.current = false;
      return;
    }

    userHasSelectedRef.current = true;

    if (!mapRef.current || !selectedPoint) return;

    const selectedPosition = pointPosition(selectedPoint);
    if (!selectedPosition) return;

    focusMapOn(mapRef.current, selectedPosition, bottomInsetRef.current, SELECTED_POINT_ZOOM);
  }, [selectedPoint]);

  // Efecto 3b: enfocar una posición arbitraria a pedido (p.ej. el conductor
  // tocó una alerta existente para verla). Mismo zoom/offset que el efecto 3.
  // También reacciona a `routeBounds` porque el mapa se crea de forma
  // asíncrona: si `focusTarget` ya viene listo al montar (se entró por un
  // link "ver en mapa"), el primer intento puede caer antes de que
  // `mapRef.current` exista; cuando el mapa queda listo, se reintenta.
  useEffect(() => {
    if (!mapRef.current || !focusTarget) return;

    userHasSelectedRef.current = true;
    focusMapOn(mapRef.current, focusTarget.position, bottomInsetRef.current, SELECTED_POINT_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.key, routeBounds]);

  // Efecto 4: encuadre general (overview). Reacciona tanto a que la ruta ya
  // esté resuelta como a que se mida el alto real de la ficha inferior,
  // sin importar cuál de los dos llegue primero. No hace nada una vez que
  // el usuario seleccionó un punto (para no pelear con el zoom del efecto 3).
  useEffect(() => {
    if (userHasSelectedRef.current) return;
    if (!mapRef.current || !routeBounds) return;

    mapRef.current.fitBounds(routeBounds, {
      ...OVERVIEW_PADDING,
      bottom: bottomInsetPx + OVERVIEW_BOTTOM_GAP,
    });
  }, [routeBounds, bottomInsetPx]);

  if (points.length === 0) return null;

  return (
    <div className={cn("relative h-full w-full bg-slate-200", className)}>
      {canUseGoogleMap && !mapError ? (
        <div ref={mapElementRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#dbe6ff,#f5f7fa)] p-8 text-center">
          <p className="text-sm font-bold text-[#0B2E86]/70">
            {mapUnavailableMessage}
          </p>
        </div>
      )}
    </div>
  );
}
