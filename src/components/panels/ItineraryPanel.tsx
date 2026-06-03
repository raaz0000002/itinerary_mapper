import * as React from 'react';
import Icon from '../Icon';

export interface ItineraryItem {
  id: string;
  day: number;
  name: string;
  lat: number;
  lng: number;
  type: 'hotel' | 'food' | 'view' | 'point' | 'bed' | 'playground' | 'hiking' | 'shopping';
  distance?: number;
  elevation?: number;
  duration?: number;
}

interface ItineraryPanelProps {
  itinerary: ItineraryItem[];
  setItinerary: React.Dispatch<React.SetStateAction<ItineraryItem[]>>;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  saveHistory: () => void;
  isReadOnly?: boolean;
}

// Haversine formula to compute distance in km
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ItineraryPanel({
  itinerary,
  setItinerary,
  selectedDay,
  setSelectedDay,
  saveHistory,
  isReadOnly = false,
}: ItineraryPanelProps) {
  const activeDayStops = itinerary.filter((item) => item.day === selectedDay);

  // Compute stats by summing up specified fields for the active day
  let totalDistanceKm = 0;
  let totalElevationMeters = 0;
  let totalDurationHours = 0;

  activeDayStops.forEach((item) => {
    totalDistanceKm += item.distance !== undefined ? Number(item.distance) : 0;
    totalElevationMeters += item.elevation !== undefined ? Number(item.elevation) : 0;
    totalDurationHours += item.duration !== undefined ? Number(item.duration) : 0;
  });

  const elevationGainMeters = totalElevationMeters;
  const estTimeHrs = totalDurationHours.toFixed(1);

  const stopTypes = [
    { type: 'hotel', icon: 'hotel', tooltip: 'Lodging' },
    { type: 'bed', icon: 'bed', tooltip: 'Bed/Rest' },
    { type: 'playground', icon: 'child_care', tooltip: 'Playground' },
    { type: 'food', icon: 'restaurant', tooltip: 'Dining' },
    { type: 'view', icon: 'photo_camera', tooltip: 'Sightseeing' },
    { type: 'point', icon: 'location_on', tooltip: 'Waypoint' },
    { type: 'hiking', icon: 'hiking', tooltip: 'Hiking' },
    { type: 'shopping', icon: 'shopping_bag', tooltip: 'Shopping' },
  ] as const;

  return (
    <div className="p-4 space-y-5 flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* 1. Day Selector */}
      <div className="space-y-2 shrink-0">
        <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Plan Duration (Days)</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const hasStops = itinerary.some((item) => item.day === day);
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative flex-shrink-0 w-10 h-10 rounded-full font-semibold transition flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
                }`}
              >
                <span>{day}</span>
                {hasStops && !isSelected && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Trek Duration Stats Card */}
      <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl space-y-3 shrink-0">
        <div>
          <span className="text-label-caps text-primary font-bold">Day {selectedDay} Summary</span>
          <h3 className="text-section-header text-on-surface mt-0.5">Route Statistics</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/50 pt-3">
          <div className="flex flex-col items-center text-center p-1 bg-surface-container rounded-md">
            <Icon name="route" className="text-xl text-primary" />
            <span className="text-label-caps text-on-surface-variant mt-1">Distance</span>
            <span className="text-body-sm font-bold text-on-surface mt-0.5">
              {totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(1)} km` : '0.0 km'}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-1 bg-surface-container rounded-md">
            <Icon name="filter_hdr" className="text-xl text-tertiary" />
            <span className="text-label-caps text-on-surface-variant mt-1">Elevation</span>
            <span className="text-body-sm font-bold text-on-surface mt-0.5">
              {elevationGainMeters > 0 ? `+${elevationGainMeters} m` : '0 m'}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-1 bg-surface-container rounded-md">
            <Icon name="schedule" className="text-xl text-secondary" />
            <span className="text-label-caps text-on-surface-variant mt-1">Duration</span>
            <span className="text-body-sm font-bold text-on-surface mt-0.5">
              {estTimeHrs} hrs
            </span>
          </div>
        </div>
      </div>

      {/* 3. Day List & Timeline */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-2 shrink-0">
          <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Itinerary Stops</span>
          {activeDayStops.length > 0 && !isReadOnly ? (
            <button
              onClick={() => {
                saveHistory();
                setItinerary(itinerary.filter((it) => it.day !== selectedDay));
              }}
              className="text-body-sm font-semibold text-error hover:text-error-container transition"
            >
              Clear Day
            </button>
          ) : (
            <span className="text-body-sm font-medium text-primary italic">
              {isReadOnly ? 'Interactive tour view' : 'Click map to add waypoints'}
            </span>
          )}
        </div>

        {activeDayStops.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
            <Icon name="add_location_alt" className="text-3xl text-on-surface-variant mb-2" />
            <span className="text-body-sm font-semibold text-on-surface">No stops planned yet</span>
            <span className="text-body-sm text-on-surface-variant mt-0.5">
              {isReadOnly ? 'No stops planned for this day.' : `Click directly on the map to add locations to Day ${selectedDay}`}
            </span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative pl-3">
            {/* Travel Timeline Dashed Connector Line */}
            {activeDayStops.length > 1 && (
              <div 
                className="absolute left-6 top-8 bottom-8 w-0.5 border-l-2 border-dashed border-primary/40 z-0 pointer-events-none"
                style={{ top: '32px', bottom: '32px' }}
              />
            )}

            {activeDayStops.map((item, index) => {
              const isStart = index === 0;
              const isEnd = index === activeDayStops.length - 1;
              
              // Marker styling matching Stitch design system specifications:
              // - Start/End: Primary blue solid circles
              // - Waypoint/Others: White circles with border
              let markerStyle = "bg-surface border-2 border-primary text-primary";
              if (isStart || isEnd) {
                markerStyle = "bg-primary text-on-primary";
              }

              return (
                <div key={item.id} className="relative z-10 flex gap-4">
                  {/* Timeline Node */}
                  <div className="flex flex-col items-center shrink-0 mt-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-body-sm shadow-sm ${markerStyle}`}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Stop Information Card */}
                  <div className="flex-1 p-3 bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      {isReadOnly ? (
                        <span className="flex-grow text-body-main font-semibold text-on-surface py-0.5 truncate">
                          {item.name}
                        </span>
                      ) : (
                        <input
                          value={item.name}
                          onFocus={saveHistory}
                          onChange={(e) =>
                            setItinerary(
                              itinerary.map((it) => (it.id === item.id ? { ...it, name: e.target.value } : it))
                            )
                          }
                          className="flex-grow text-body-main font-semibold bg-transparent border-none p-0 focus:ring-0 text-on-surface outline-none w-full"
                          placeholder="Location Name"
                        />
                      )}
                      {!isReadOnly && (
                        <button
                          onClick={() => {
                            saveHistory();
                            setItinerary(itinerary.filter((it) => it.id !== item.id));
                          }}
                          className="p-1 text-on-surface-variant hover:text-error rounded transition shrink-0"
                          title="Delete stop"
                        >
                          <Icon name="delete" className="text-lg" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        {item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°
                      </span>

                      {/* Compact inputs/labels for Distance, Elevation, Duration */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/30">
                        <div className="flex flex-col">
                          <label className="text-[9px] text-on-surface-variant/80 font-bold uppercase tracking-wider">Dist (km)</label>
                          {isReadOnly ? (
                            <span className="mt-0.5 text-[11px] font-semibold text-on-surface">
                              {item.distance !== undefined ? `${item.distance.toFixed(1)} km` : '-'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              value={item.distance !== undefined ? item.distance : ''}
                              onFocus={saveHistory}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                setItinerary(itinerary.map(it => it.id === item.id ? { ...it, distance: val } : it));
                              }}
                              className="mt-0.5 bg-surface-container/60 rounded px-1.5 py-0.5 border border-outline-variant/40 focus:outline-none focus:border-primary text-[11px] font-semibold text-on-surface"
                              placeholder={index === 0 ? "0.0" : (() => {
                                const prev = activeDayStops[index - 1];
                                return calculateHaversineDistance(prev.lat, prev.lng, item.lat, item.lng).toFixed(1);
                              })()}
                            />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[9px] text-on-surface-variant/80 font-bold uppercase tracking-wider">Elev (m)</label>
                          {isReadOnly ? (
                            <span className="mt-0.5 text-[11px] font-semibold text-on-surface">
                              {item.elevation !== undefined ? `+${item.elevation} m` : '-'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              value={item.elevation !== undefined ? item.elevation : ''}
                              onFocus={saveHistory}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                setItinerary(itinerary.map(it => it.id === item.id ? { ...it, elevation: val } : it));
                              }}
                              className="mt-0.5 bg-surface-container/60 rounded px-1.5 py-0.5 border border-outline-variant/40 focus:outline-none focus:border-primary text-[11px] font-semibold text-on-surface"
                              placeholder="0"
                            />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[9px] text-on-surface-variant/80 font-bold uppercase tracking-wider">Stay (hr)</label>
                          {isReadOnly ? (
                            <span className="mt-0.5 text-[11px] font-semibold text-on-surface">
                              {item.duration !== undefined ? `${item.duration.toFixed(1)} hrs` : '-'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              value={item.duration !== undefined ? item.duration : ''}
                              onFocus={saveHistory}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                setItinerary(itinerary.map(it => it.id === item.id ? { ...it, duration: val } : it));
                              }}
                              className="mt-0.5 bg-surface-container/60 rounded px-1.5 py-0.5 border border-outline-variant/40 focus:outline-none focus:border-primary text-[11px] font-semibold text-on-surface"
                              placeholder="0.0"
                            />
                          )}
                        </div>
                      </div>

                      {/* Stop Type Selection / Badge Display */}
                      {isReadOnly ? (
                        <div className="flex items-center gap-1 mt-2 text-on-surface-variant bg-surface-container/40 px-2 py-0.5 rounded-full w-max text-[10px] font-semibold border border-outline-variant/20">
                          <Icon name={stopTypes.find(btn => btn.type === item.type)?.icon || 'location_on'} className="text-[12px] text-primary" />
                          <span className="capitalize">{stopTypes.find(btn => btn.type === item.type)?.tooltip || 'Waypoint'}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 pt-1.5">
                          <span className="text-[9px] text-on-surface-variant/80 font-bold uppercase tracking-wider">Choose Symbol</span>
                          <div className="grid grid-cols-4 gap-1 bg-surface-container rounded-md p-0.5">
                            {stopTypes.map((btn) => (
                              <button
                                key={btn.type}
                                type="button"
                                onClick={() => {
                                  saveHistory();
                                  setItinerary(
                                    itinerary.map((it) => (it.id === item.id ? { ...it, type: btn.type as any } : it))
                                  );
                                }}
                                className={`p-1 rounded flex items-center justify-center transition ${
                                  item.type === btn.type
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                                }`}
                                title={btn.tooltip}
                              >
                                <Icon 
                                  name={btn.icon} 
                                  className="text-[16px]" 
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
