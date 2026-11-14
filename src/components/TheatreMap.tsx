import React, { useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  LocateFixed,
  MapPin,
  Navigation,
  Sparkles,
  Ticket,
  Car,
  AlertCircle,
} from 'lucide-react';
import { IndianCity, Theatre } from '../types/cinema.ts';
import { INDIAN_CITIES } from '../data/liveCinemaProvider.ts';

interface TheatreMapProps {
  selectedCity: IndianCity;
  onSelectCity: (city: IndianCity) => void;
  theatres: Theatre[];
  onSelectTheatreForBooking: (theatre: Theatre) => void;
}

// Haversine formula in km
function computeDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Individual AdvancedMarker with anchored InfoWindow per example_markers.md
const TheatreMarkerItem: React.FC<{
  theatre: Theatre;
  isSelected: boolean;
  distanceKm: number;
  onSelect: (theatre: Theatre) => void;
  onBookTheatre: (theatre: Theatre) => void;
  onRequestRoute: (theatre: Theatre) => void;
}> = ({ theatre, isSelected, distanceKm, onSelect, onBookTheatre, onRequestRoute }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: theatre.lat, lng: theatre.lng }}
        title={theatre.name}
        onClick={() => onSelect(theatre)}
      >
        <Pin
          background={isSelected ? '#e11d48' : '#1e293b'}
          borderColor={isSelected ? '#fbbf24' : '#f43f5e'}
          glyphColor={'#ffffff'}
          scale={isSelected ? 1.3 : 1.05}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={290} onCloseClick={() => onSelect(theatre)}>
          <div className="p-1 text-slate-900 space-y-2">
            <div className="font-bold text-sm text-slate-900">{theatre.name}</div>
            <p className="text-xs text-slate-600 leading-snug">{theatre.address}</p>
            <div className="flex items-center justify-between text-xs font-mono text-slate-700 pt-1 border-t border-slate-200">
              <span>{distanceKm} km away</span>
              <span className="font-bold text-rose-600">From ₹{theatre.basePriceInr}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onRequestRoute(theatre)}
                className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md cursor-pointer"
              >
                Directions
              </button>
              <button
                type="button"
                onClick={() => onBookTheatre(theatre)}
                className="flex-1 py-1.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-md cursor-pointer"
              >
                Showtimes
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface MapPolylineInstance {
  setMap: (map: unknown) => void;
  setOptions: (options: { strokeColor?: string; strokeWeight?: number }) => void;
}

// Modern Routes API Component using Route.computeRoutes via useMapsLibrary('routes')
const ActiveRouteLayer: React.FC<{
  origin: { lat: number; lng: number } | null;
  destinationTheatre: Theatre | null;
  onRouteComputed: (info: { distanceKm: string; durationMins: number } | null, err: string | null) => void;
}> = ({ origin, destinationTheatre, onRouteComputed }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<MapPolylineInstance[]>([]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!routesLib || !map || !origin || !destinationTheatre) {
      return;
    }

    const request = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destinationTheatre.lat, lng: destinationTheatre.lng },
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    const RouteClass = (routesLib as any).Route;
    if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
      return;
    }

    RouteClass.computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (!routes || routes.length === 0) {
          onRouteComputed(null, 'No driving route found between your location and this theatre.');
          return;
        }
        const primaryRoute = routes[0];
        const newPolylines: MapPolylineInstance[] = primaryRoute.createPolylines();
        newPolylines.forEach((polyline: MapPolylineInstance) => {
          polyline.setOptions({
            strokeColor: '#e11d48',
            strokeWeight: 5,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const distKm = ((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1);
        const durMins = Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000));
        onRouteComputed({ distanceKm: distKm, durationMins: durMins }, null);
      })
      .catch((err: any) => {
        console.error('Error computing route:', err);
        const msg = String(err?.message || err || '');
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteComputed(null, 'Unable to compute live route. Using straight-line GPS distance.');
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin, destinationTheatre]);

  return null;
};

// Camera recenter helper when city changes
const MapCameraSync: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
      map.setZoom(12);
    }
  }, [map, center.lat, center.lng]);
  return null;
};

export const TheatreMap: React.FC<TheatreMapProps> = ({
  selectedCity,
  onSelectCity,
  theatres,
  onSelectTheatreForBooking,
}) => {
  const cityMeta =
    INDIAN_CITIES.find((c) => c.name === selectedCity) || INDIAN_CITIES[0];

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: cityMeta.lat,
    lng: cityMeta.lng,
  });
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'active' | 'denied'>('idle');
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(theatres[0] || null);
  const [routeTarget, setRouteTarget] = useState<Theatre | null>(null);
  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: string;
    durationMins: number;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [maxDistanceFilterKm, setMaxDistanceFilterKm] = useState<number>(25);

  useEffect(() => {
    const c = INDIAN_CITIES.find((item) => item.name === selectedCity) || INDIAN_CITIES[0];
    setUserCoords({ lat: c.lat, lng: c.lng });
    setSelectedTheatre(theatres[0] || null);
    setRouteTarget(null);
    setRouteSummary(null);
  }, [selectedCity, theatres]);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsStatus('active');
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  const enrichedTheatres = theatres
    .map((t) => ({
      ...t,
      computedDistanceKm: computeDistanceKm(userCoords.lat, userCoords.lng, t.lat, t.lng),
    }))
    .filter((t) => t.computedDistanceKm <= maxDistanceFilterKm)
    .sort((a, b) => a.computedDistanceKm - b.computedDistanceKm);

  return (
    <div className="space-y-6">
      {/* Top GPS & City Control Bar */}
      <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-400 tracking-wider">
            GPS & LIVE THEATRE DISCOVERY
          </span>
          <h2 className="font-display text-2xl font-bold text-white mt-0.5">
            Cinemas Near {selectedCity}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Indexed in AVL Tree O(log n) · Click any marker for directions via Google Maps Routes API
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Manual City Selector (Fallback when GPS is denied or exploring other cities) */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl p-1">
            {INDIAN_CITIES.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => onSelectCity(city.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCity === city.name
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDetectGps}
            className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LocateFixed className="w-4 h-4" />
            <span>
              {gpsStatus === 'detecting'
                ? 'Detecting GPS...'
                : gpsStatus === 'active'
                ? 'GPS Coordinates Active'
                : 'Use My Live GPS'}
            </span>
          </button>
        </div>
      </div>

      {gpsStatus === 'denied' && (
        <div className="px-4 py-3 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Browser GPS permission was declined or unavailable in this preview frame. Using manual
            city center coordinates for <strong>{selectedCity}</strong> ({cityMeta.lat.toFixed(4)},{' '}
            {cityMeta.lng.toFixed(4)}). You can switch cities anytime above.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5-Column Theatre Cards & Distance Filter */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-[#0b0f19] border border-white/10 flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-300">
              Radius Filter: Within{' '}
              <strong className="font-mono text-amber-400">{maxDistanceFilterKm} km</strong>
            </span>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={maxDistanceFilterKm}
              onChange={(e) => setMaxDistanceFilterKm(Number(e.target.value))}
              className="w-36 accent-rose-600 cursor-pointer"
            />
          </div>

          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {enrichedTheatres.map((theatre) => {
              const isSelected = selectedTheatre?.id === theatre.id;
              return (
                <div
                  key={theatre.id}
                  onClick={() => setSelectedTheatre(theatre)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-rose-500/60 shadow-lg shadow-rose-950/30'
                      : 'bg-[#0b0f19] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-amber-400">
                        AVL ID: {theatre.id} · ★ {theatre.rating}
                      </span>
                      <h3 className="font-display text-base font-bold text-white mt-0.5">
                        {theatre.name}
                      </h3>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-400 shrink-0 tabular-nums">
                      {theatre.computedDistanceKm} km
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{theatre.address}</p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2.5">
                    <span>{theatre.formatsSupported.join(' · ')}</span>
                    <span>·</span>
                    <span className="font-mono text-white">From ₹{theatre.basePriceInr}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTheatre(theatre);
                        setRouteTarget(theatre);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 text-amber-400" />
                      <span>Route & Directions</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTheatreForBooking(theatre);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Select Theatre</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 7-Column Interactive Google Map Viewport */}
        <div className="lg:col-span-7 bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          {/* Active Route Banner */}
          {routeTarget && (
            <div className="px-4 py-2.5 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <Car className="w-4 h-4 text-rose-400" />
                <span>
                  Driving route to <strong>{routeTarget.name}</strong>:
                </span>
                {routeSummary ? (
                  <span className="font-mono text-amber-400 font-semibold">
                    {routeSummary.distanceKm} km · ~{routeSummary.durationMins} mins
                  </span>
                ) : routeError ? (
                  <span className="text-slate-400">{routeError}</span>
                ) : (
                  <span className="text-slate-400">Calculating route via Routes API...</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setRouteTarget(null);
                  setRouteSummary(null);
                  setRouteError(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Clear Route
              </button>
            </div>
          )}

          {/* Sized Map Container (Mandatory CF2: explicit height so map never collapses) */}
          <div className="w-full h-[540px] relative">
            {apiKey ? (
              <APIProvider apiKey={apiKey} libraries={['marker', 'routes']} region="IN" language="en">
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{ lat: cityMeta.lat, lng: cityMeta.lng }}
                  defaultZoom={12}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  <MapCameraSync center={userCoords} />

                  {/* User Current Location Marker */}
                  <AdvancedMarker
                    position={userCoords}
                    title={`Your Location (${selectedCity})`}
                  >
                    <Pin
                      background="#10b981"
                      borderColor="#059669"
                      glyphColor="#ffffff"
                      scale={1.1}
                    />
                  </AdvancedMarker>

                  {/* Theatre Markers */}
                  {enrichedTheatres.map((theatre) => (
                    <TheatreMarkerItem
                      key={theatre.id}
                      theatre={theatre}
                      isSelected={selectedTheatre?.id === theatre.id}
                      distanceKm={theatre.computedDistanceKm}
                      onSelect={(t) => setSelectedTheatre(t)}
                      onBookTheatre={(t) => onSelectTheatreForBooking(t)}
                      onRequestRoute={(t) => setRouteTarget(t)}
                    />
                  ))}

                  {/* Modern Routes API Polyline Layer */}
                  <ActiveRouteLayer
                    origin={userCoords}
                    destinationTheatre={routeTarget}
                    onRouteComputed={(info, err) => {
                      setRouteSummary(info);
                      setRouteError(err);
                    }}
                  />
                </GoogleMap>
              </APIProvider>
            ) : (
              /* Resilient Interactive Spatial Coordinate Map Fallback if VITE_GOOGLE_MAPS_API_KEY is not injected yet */
              <div className="w-full h-full bg-[#080d1a] flex flex-col justify-between p-6 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Compass className="w-4 h-4 text-rose-400" />
                    <span>
                      Interactive Geospatial Theatre Radar · {selectedCity} ({cityMeta.lat.toFixed(4)}°N,{' '}
                      {cityMeta.lng.toFixed(4)}°E)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-amber-400">
                    {enrichedTheatres.length} Verified Multiplexes
                  </span>
                </div>

                <div className="relative z-10 my-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enrichedTheatres.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTheatre(t)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedTheatre?.id === t.id
                          ? 'bg-rose-950/40 border-rose-500 text-white'
                          : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          {t.name}
                        </span>
                        <span className="font-mono text-amber-400">{t.computedDistanceKm} km</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{t.address}</p>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/10 pt-3">
                  <span>GPS Coordinates Calibrated for {selectedCity}</span>
                  <span>Click any theatre card to book showtimes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
