import { useEffect, useState, useRef, FormEvent, MouseEvent as ReactMouseEvent, CSSProperties, ReactNode } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  LayersControl,
  ScaleControl,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import Icon from './Icon';
import { MapLayer } from './panels/LayersPanel';
import { ItineraryItem } from './panels/ItineraryPanel';

// @ts-ignore
import compassImg from '../public/illustration-compass_53876-18111-removebg-preview.png';
// @ts-ignore
import downloadImg from '../public/download.png';

const getIconSvgString = (type: string, color: string = 'currentColor') => {
  const svgs: { [key: string]: string } = {
    hotel: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
    bed: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
    playground: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>`,
    food: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v4M17 20V2a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h1v8M12 11v9M7 11v9"/></svg>`,
    view: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    point: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    hiking: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
    shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`
  };
  return svgs[type] || svgs.point;
};

interface MapViewProps {
  mapTitle: string;
  layers: MapLayer[];
  itinerary: ItineraryItem[];
  selectedDay: number;
  showLegend: boolean;
  showNorthArrow: boolean;
  showScale: boolean;
  fitBounds: L.LatLngBounds | null;
  fitBoundsTrigger: number;
  isPrinting: boolean;
  mapCenterData: { center: [number, number]; zoom: number } | null;
  handleMapClick: (e: L.LeafletMouseEvent) => void;
  setCurrentExtent: (bounds: L.LatLngBounds) => void;
  newlyAddedStopId: string | null;
  onUpdateItineraryItem: (
    id: string,
    name: string,
    elevation: number | undefined,
    duration: number | undefined,
    type: ItineraryItem['type']
  ) => void;
  onDeleteItineraryItem: (id: string) => void;
  tileUrlSuffix?: string;
  isReadOnly?: boolean;
  titleFont?: 'Inter' | 'Georgia' | 'monospace' | 'serif' | 'sans-serif';
  titleColor?: string;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  titleStyle?: 'glass' | 'pill' | 'outline' | 'minimal';
  showSidebar?: boolean;
  setShowSidebar?: (show: boolean) => void;
}

// Sub-components to orchestrate Map commands/controls dynamically
const ViewSetter = ({ bounds, trigger }: { bounds: L.LatLngBounds | null; trigger: number }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { animate: false });
    }
  }, [bounds, trigger, map]);
  return null;
};

const MapResizer = ({ isPrinting, showSidebar }: { isPrinting: boolean; showSidebar?: boolean }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 150);
    const transitionTimer = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 350);
    return () => {
      clearTimeout(timer);
      clearTimeout(transitionTimer);
    };
  }, [isPrinting, showSidebar, map]);
  return null;
};

const MapController = ({ centerData }: { centerData: { center: [number, number]; zoom: number } | null }) => {
  const map = useMap();
  useEffect(() => {
    if (centerData) {
      map.setView(centerData.center, centerData.zoom);
    }
  }, [centerData, map]);
  return null;
};

const MapEvents = ({
  onClick,
  onMoveEnd
}: {
  onClick: (e: L.LeafletMouseEvent) => void;
  onMoveEnd: (map: L.Map) => void;
}) => {
  const map = useMapEvents({
    click: onClick,
    moveend: () => onMoveEnd(map)
  });
  return null;
};

const NorthArrow = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="bg-surface/90 backdrop-blur-md p-2 rounded-full border border-outline-variant shadow-lg select-none flex flex-col items-center justify-center w-16 h-16">
      <img 
        src={compassImg} 
        alt="North Arrow Compass" 
        className="w-12 h-12 object-contain animate-none"
      />
    </div>
  );
};

// Stitch Custom Floating Map Controls
const FloatingMapControls = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2.5 no-print">
      {/* Zoom stack */}
      <div className="flex flex-col rounded-md border border-outline-variant bg-surface/90 backdrop-blur-md shadow-lg overflow-hidden select-none">
        <button
          onClick={() => map.zoomIn()}
          className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-high transition border-b border-outline-variant/50"
          title="Zoom In"
        >
          <Icon name="add" className="text-xl" />
        </button>
        <button
          onClick={() => map.zoomOut()}
          className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-high transition"
          title="Zoom Out"
        >
          <Icon name="remove" className="text-xl" />
        </button>
      </div>

      {/* Locate button */}
      <button
        onClick={() => map.locate({ setView: true, maxZoom: 15 })}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-outline-variant bg-surface/90 backdrop-blur-md shadow-lg text-on-surface hover:bg-surface-container-high transition select-none"
        title="My Location"
      >
        <Icon name="my_location" className="text-xl" />
      </button>
    </div>
  );
};

// Stitch Map Marker Icon Creator
const createStitchMarkerIcon = (type: ItineraryItem['type'], index: number, isStart: boolean, isEnd: boolean, isCurrentDay: boolean) => {
  // If not the current active day, style it as muted/grayish
  const markerBg = isCurrentDay 
    ? (isStart || isEnd ? 'bg-[rgb(0,74,198)]' : 'bg-white')
    : 'bg-[rgb(225,226,237)]';
    
  const markerText = isCurrentDay
    ? (isStart || isEnd ? 'text-white' : 'text-[rgb(0,74,198)]')
    : 'text-[rgb(87,95,106)]';

  const markerBorder = isCurrentDay
    ? (isStart || isEnd ? 'border border-white' : 'border-2 border-[rgb(0,74,198)]')
    : 'border border-[rgb(160,165,180)]';

  const badgeBg = isCurrentDay
    ? (isStart || isEnd ? 'bg-[rgb(87,95,106)]' : 'bg-[rgb(225,226,237)]')
    : 'bg-[rgb(160,165,180)]';
    
  const badgeText = isCurrentDay
    ? (isStart || isEnd ? 'text-white' : 'text-[rgb(0,74,198)]')
    : 'text-white';

  const badgeBorder = isCurrentDay
    ? (isStart || isEnd ? 'border border-white' : 'border border-[rgb(0,74,198)]')
    : 'border border-[rgb(160,165,180)]';

  const strokeColor = isCurrentDay
    ? (isStart || isEnd ? '#ffffff' : 'rgb(0,74,198)')
    : 'rgb(87,95,106)';

  const iconSvg = getIconSvgString(type, strokeColor);

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${markerBorder} ${markerText} ${markerBg} shadow-md">
        ${iconSvg}
        <span class="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full ${badgeBg} text-[9px] font-bold ${badgeBorder} ${badgeText}">
          ${index + 1}
        </span>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Draggable Wrapper Component
interface DraggableProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const Draggable = ({ children, className, style }: DraggableProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const elementPosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: ReactMouseEvent) => {
    // Only drag with left click
    if (e.button !== 0) return;

    // Prevent dragging if clicking buttons, inputs, dropdowns, etc.
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('.no-drag')) {
      return;
    }

    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    elementPosition.current = { ...position };
    
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: elementPosition.current.x + dx,
        y: elementPosition.current.y + dy
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        ...style,
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      className={className}
    >
      {children}
    </div>
  );
};

// Elevation Profile Sparkline/Graph Component for Legend
const ElevationGraph = ({ itinerary }: { itinerary: ItineraryItem[] }) => {
  const sortedItinerary = [...itinerary].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return itinerary.indexOf(a) - itinerary.indexOf(b);
  });

  const points = sortedItinerary.filter(item => item.elevation !== undefined);
  if (points.length < 2) {
    return (
      <div className="mt-2.5 border-t border-outline-variant/50 pt-2 text-[9px] text-on-surface-variant/75 italic text-center">
        Specify elevation on 2+ stops to view profile.
      </div>
    );
  }

  const elevations = points.map(p => Number(p.elevation || 0));
  const maxElev = Math.max(...elevations, 10);
  const minElev = Math.min(...elevations, 0);
  const range = maxElev - minElev;

  const width = 200;
  const height = 50;
  const paddingX = 8;
  const paddingY = 6;

  const svgPoints = points.map((p, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((Number(p.elevation || 0) - minElev) / (range || 1)) * (height - 2 * paddingY);
    return { x, y, name: p.name, elev: p.elevation || 0 };
  });

  const linePath = svgPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${height - paddingY} L ${svgPoints[0].x} ${height - paddingY} Z`;

  return (
    <div className="mt-3 border-t border-outline-variant/50 pt-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Elevation Profile</span>
        <span className="text-[9px] font-mono text-on-surface-variant">{minElev}m - {maxElev}m</span>
      </div>
      <div className="bg-surface-container rounded-lg p-1.5 border border-outline-variant/40">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#004ac6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#004ac6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#elevationGrad)" />
          <path d={linePath} fill="none" stroke="#004ac6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {svgPoints.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="#004ac6"
              stroke="#ffffff"
              strokeWidth="0.5"
              className="cursor-pointer hover:r-3.5 transition-all"
            >
              <title>{`${p.name}: ${p.elev}m`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};

// Stitch Map Clustered Marker Icon Creator
const createClusteredMarkerIcon = (items: ItineraryItem[], isCurrentDay: boolean) => {
  const strokeColor = isCurrentDay ? '#ffffff' : 'rgb(87,95,106)';
  
  // Arrange the selected icons side-by-side
  const iconsHtml = items.map(item => {
    return getIconSvgString(item.type, strokeColor);
  }).join('');

  // Styles matching Stitch design system specifications:
  const markerBg = isCurrentDay 
    ? 'bg-[rgb(0,74,198)] text-white' 
    : 'bg-[rgb(225,226,237)] text-[rgb(87,95,106)]';
    
  const markerBorder = isCurrentDay 
    ? 'border border-white' 
    : 'border border-[rgb(160,165,180)]';

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center h-8 px-2 rounded-full ${markerBorder} ${markerBg} shadow-md gap-0.5 min-w-[32px] max-w-[80px]">
        <div class="flex items-center justify-center gap-0.5">
          ${iconsHtml}
        </div>
        <span class="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[rgb(87,95,106)] text-[9px] font-bold border border-white text-white">
          ${items.length}
        </span>
      </div>
    `,
    className: '',
    iconSize: undefined,
    iconAnchor: [16, 16]
  });
};

const PopupEditor = ({
  item,
  dayIndex,
  onSave,
  onDelete,
  hideHeader = false
}: {
  item: ItineraryItem;
  dayIndex: number;
  onSave: (
    id: string,
    name: string,
    elevation: number | undefined,
    duration: number | undefined,
    type: ItineraryItem['type']
  ) => void;
  onDelete: (id: string) => void;
  hideHeader?: boolean;
}) => {
  const [name, setName] = useState(item.name);
  const [elevation, setElevation] = useState(item.elevation !== undefined ? item.elevation.toString() : '');
  const [duration, setDuration] = useState(item.duration !== undefined ? item.duration.toString() : '');
  const [type, setType] = useState(item.type);

  // Sync state when item changes (e.g. if undo is triggered)
  useEffect(() => {
    setName(item.name);
    setElevation(item.elevation !== undefined ? item.elevation.toString() : '');
    setDuration(item.duration !== undefined ? item.duration.toString() : '');
    setType(item.type);
  }, [item]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const elev = elevation === '' ? undefined : parseFloat(elevation);
    const dur = duration === '' ? undefined : parseFloat(duration);
    onSave(item.id, name, elev, dur, type);
  };

  return (
    <form onSubmit={handleSubmit} className="p-2 w-64 space-y-3 font-sans text-xs no-drag">
      {!hideHeader && (
        <div>
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
            Stop {dayIndex + 1} Details
          </span>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-on-surface-variant">Place Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:border-primary text-xs text-on-surface bg-surface"
            placeholder="e.g. Kathmandu"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-on-surface-variant">Elevation (m)</label>
            <input
              type="number"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
              className="w-full px-2 py-1 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:border-primary text-xs text-on-surface bg-surface"
              placeholder="e.g. 1400"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-on-surface-variant">Duration (hrs)</label>
            <input
              type="number"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-2 py-1 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:border-primary text-xs text-on-surface bg-surface"
              placeholder="e.g. 2.5"
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-on-surface-variant">Symbol</label>
          <div className="grid grid-cols-4 gap-1 bg-surface-container rounded p-1">
            {[
              { type: 'hotel', icon: 'hotel', label: 'Hotel' },
              { type: 'bed', icon: 'bed', label: 'Bed' },
              { type: 'playground', icon: 'child_care', label: 'Play' },
              { type: 'food', icon: 'restaurant', label: 'Dining' },
              { type: 'view', icon: 'photo_camera', label: 'Sight' },
              { type: 'point', icon: 'location_on', label: 'Waypt' },
              { type: 'hiking', icon: 'hiking', label: 'Hike' },
              { type: 'shopping', icon: 'shopping_bag', label: 'Shop' },
            ].map((btn) => (
              <button
                key={btn.type}
                type="button"
                onClick={() => setType(btn.type as any)}
                className={`p-1 rounded flex flex-col items-center gap-0.5 transition ${
                  type === btn.type
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
                title={btn.label}
              >
                <Icon name={btn.icon} className="text-sm" />
                <span className="text-[8px] font-medium leading-none">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center pt-1 border-t border-outline-variant/30">
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="px-2 py-1 text-[10px] font-bold text-error hover:bg-error-container/10 rounded transition"
        >
          DELETE
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-primary text-on-primary rounded text-[10px] font-bold hover:bg-primary/95 shadow transition"
        >
          SAVE
        </button>
      </div>
    </form>
  );
};

const ClusteredPopupEditor = ({
  items,
  dayIndices,
  onSave,
  onDelete,
  onClose
}: {
  items: ItineraryItem[];
  dayIndices: number[];
  onSave: (
    id: string,
    name: string,
    elevation: number | undefined,
    duration: number | undefined,
    type: ItineraryItem['type']
  ) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  // If items list changes (e.g. items are deleted), make sure active index remains valid
  useEffect(() => {
    if (activeIdx >= items.length) {
      setActiveIdx(Math.max(0, items.length - 1));
    }
  }, [items, activeIdx]);

  if (items.length === 0) return null;

  return (
    <div className="w-68 space-y-3 font-sans text-xs no-drag max-h-[380px] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1 shrink-0">
        <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
          Cluster ({items.length} Stops)
        </span>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {items.map((item, idx) => {
          const originalIndex = dayIndices[idx];
          return (
            <button
              key={item.id}
              onClick={() => setActiveIdx(idx)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition shrink-0 ${
                activeIdx === idx
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Stop {originalIndex + 1}
            </button>
          );
        })}
      </div>

      <div className="border border-outline-variant/20 rounded p-1 bg-surface-container-lowest">
        <PopupEditor
          item={items[activeIdx]}
          dayIndex={dayIndices[activeIdx]}
          onSave={onSave}
          onDelete={(id) => {
            onDelete(id);
            // If deleting the last item in cluster, close popup
            if (items.length <= 1) {
              onClose();
            }
          }}
          hideHeader
        />
      </div>
    </div>
  );
};

const ReadOnlyPopup = ({
  item,
  dayIndex
}: {
  item: ItineraryItem;
  dayIndex: number;
}) => {
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

  const currentType = stopTypes.find(btn => btn.type === item.type) || { icon: 'location_on', tooltip: 'Waypoint' };

  return (
    <div className="p-2 w-60 space-y-2.5 font-sans text-xs select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1.5">
        <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
          Stop {dayIndex + 1}
        </span>
        <div className="flex items-center gap-1 bg-primary-container/20 text-primary px-2 py-0.5 rounded-full text-[9px] font-semibold border border-primary/10">
          <Icon name={currentType.icon} className="text-[10px]" />
          <span>{currentType.tooltip}</span>
        </div>
      </div>
      <div>
        <h4 className="text-body-main font-bold text-on-surface leading-tight">{item.name}</h4>
        <span className="text-[9px] font-mono text-on-surface-variant block mt-0.5">
          {item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/30 pt-2 text-[10px] font-medium text-on-surface-variant">
        {item.elevation !== undefined && (
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant/80">Elevation</span>
            <span className="font-bold text-on-surface mt-0.5">+{item.elevation} m</span>
          </div>
        )}
        {item.duration !== undefined && (
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant/80">Duration</span>
            <span className="font-bold text-on-surface mt-0.5">{item.duration.toFixed(1)} hrs</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ReadOnlyClusteredPopup = ({
  items,
  dayIndices
}: {
  items: ItineraryItem[];
  dayIndices: number[];
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (items.length === 0) return null;

  return (
    <div className="w-64 space-y-3 font-sans text-xs select-none max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1">
        <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
          Cluster ({items.length} Stops)
        </span>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {items.map((item, idx) => {
          const originalIndex = dayIndices[idx];
          return (
            <button
              key={item.id}
              onClick={() => setActiveIdx(idx)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition shrink-0 ${
                activeIdx === idx
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Stop {originalIndex + 1}
            </button>
          );
        })}
      </div>

      <div className="border border-outline-variant/20 rounded p-1 bg-surface-container-lowest">
        <ReadOnlyPopup
          item={items[activeIdx]}
          dayIndex={dayIndices[activeIdx]}
        />
      </div>
    </div>
  );
};

const ItineraryMarker = ({
  items,
  dayIndices,
  isStart,
  isEnd,
  isCurrentDay,
  autoOpen,
  onSave,
  onDelete,
  isReadOnly = false
}: {
  items: ItineraryItem[];
  dayIndices: number[];
  isStart: boolean;
  isEnd: boolean;
  isCurrentDay: boolean;
  autoOpen: boolean;
  onSave: (
    id: string,
    name: string,
    elevation: number | undefined,
    duration: number | undefined,
    type: ItineraryItem['type']
  ) => void;
  onDelete: (id: string) => void;
  isReadOnly?: boolean;
}) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (autoOpen && markerRef.current) {
      // Delay slightly to ensure Leaflet has positioned the marker fully before popup opens
      setTimeout(() => {
        markerRef.current?.openPopup();
      }, 50);
    }
  }, [autoOpen]);

  const firstItem = items[0];
  if (!firstItem) return null;

  const isClustered = items.length > 1;

  // Tooltip lists all stops in the cluster
  const tooltipText = items.map((item, idx) => `${dayIndices[idx] + 1}. ${item.name}`).join(' & ');

  return (
    <Marker
      ref={markerRef}
      position={[firstItem.lat, firstItem.lng]}
      icon={
        isClustered 
          ? createClusteredMarkerIcon(items, isCurrentDay) 
          : createStitchMarkerIcon(firstItem.type, dayIndices[0], isStart, isEnd, isCurrentDay)
      }
    >
      <Tooltip permanent direction="top" offset={[0, -15]} opacity={0.95}>
        <div className="font-bold text-[10px] text-on-surface leading-tight truncate max-w-[150px]">{tooltipText}</div>
      </Tooltip>
      <Popup>
        {isReadOnly ? (
          isClustered ? (
            <ReadOnlyClusteredPopup items={items} dayIndices={dayIndices} />
          ) : (
            <ReadOnlyPopup item={firstItem} dayIndex={dayIndices[0]} />
          )
        ) : (
          isClustered ? (
            <ClusteredPopupEditor
              items={items}
              dayIndices={dayIndices}
              onSave={onSave}
              onDelete={onDelete}
              onClose={() => markerRef.current?.closePopup()}
            />
          ) : (
            <PopupEditor
              item={firstItem}
              dayIndex={dayIndices[0]}
              onSave={(id, name, elevation, duration, type) => {
                onSave(id, name, elevation, duration, type);
                markerRef.current?.closePopup();
              }}
              onDelete={(id) => {
                onDelete(id);
              }}
            />
          )
        )}
      </Popup>
    </Marker>
  );
};

export default function MapView({
  mapTitle,
  layers,
  itinerary,
  selectedDay,
  showLegend,
  showNorthArrow,
  showScale,
  fitBounds,
  fitBoundsTrigger,
  isPrinting,
  isReadOnly = false,
  mapCenterData,
  handleMapClick,
  setCurrentExtent,
  newlyAddedStopId,
  onUpdateItineraryItem,
  onDeleteItineraryItem,
  tileUrlSuffix,
  titleFont = 'Inter',
  titleColor = '#004ac6',
  titleSize = 'md',
  titleStyle = 'glass',
  showSidebar = true,
  setShowSidebar
}: MapViewProps) {
  // Generate a session ID once per mount for CORS cache busting
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const sessionTileSuffix = `?session=${sessionId}${tileUrlSuffix ? '&' + tileUrlSuffix.replace(/^\?/, '') : ''}`;

  // Sort the entire itinerary chronologically for rendering connection polylines and ordered badges
  const sortedItinerary = [...itinerary].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return itinerary.indexOf(a) - itinerary.indexOf(b);
  });

  return (
    <div className="relative flex-grow h-full bg-surface-dim">
      {/* 1. Map Container (rendered first in DOM so overlay absolute panels rest on top correctly) */}
      <MapContainer
        id="map-canvas-main"
        center={[20, 0]}
        zoom={3}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={false}
        preferCanvas={true}
      >
        {/* Base Map Tile Control layers */}
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              crossOrigin="anonymous"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png${sessionTileSuffix}`}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="ESRI Satellite">
            <TileLayer
              crossOrigin="anonymous"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
              url={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}${sessionTileSuffix}`}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Carto Clean Map">
            <TileLayer
              crossOrigin="anonymous"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${sessionTileSuffix}`}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Dark Mode Map">
            <TileLayer
              crossOrigin="anonymous"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${sessionTileSuffix}`}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Topography Map">
            <TileLayer
              crossOrigin="anonymous"
              attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
              url={`https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png${sessionTileSuffix}`}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* GeoJSON layer renderings */}
        {layers
          .filter((l) => l.visible)
          .map((layer) => (
            <GeoJSON
              key={layer.id}
              data={layer.data as any}
              style={{
                color: layer.color,
                weight: 2.5,
                opacity: layer.opacity,
                fillOpacity: layer.opacity / 2,
                fillColor: layer.color
              }}
              onEachFeature={(feature, l) => {
                if (feature.properties) {
                  l.bindPopup(`
                    <div class="p-2 space-y-1 text-xs font-sans">
                      <strong class="text-body-sm text-primary border-b border-outline-variant/30 pb-1 block">Layer Property Info</strong>
                      ${Object.entries(feature.properties)
                        .map(([k, v]) => `<div><span class="text-on-surface-variant font-semibold">${k}:</span> <span class="text-on-surface font-medium">${v}</span></div>`)
                        .join('')}
                    </div>
                  `);
                }
              }}
            />
          ))}

        {/* Dotted Polyline joining all itinerary points chronologically */}
        {sortedItinerary.length > 1 && (
          <Polyline
            {...({
              positions: sortedItinerary.map(item => [item.lat, item.lng] as [number, number]),
              pathOptions: {
                color: 'rgb(0, 74, 198)',
                weight: 3,
                dashArray: '5, 8',
                opacity: 0.85
              }
            } as any)}
          />
        )}

        {/* Itinerary Map Markers */}
        {(() => {
          // Group stops by coordinate key "lat,lng"
          const coordinateGroups: { [key: string]: { items: ItineraryItem[]; indices: number[]; isStart: boolean; isEnd: boolean; isCurrentDay: boolean } } = {};
          
          sortedItinerary.forEach((item) => {
            const dayStops = sortedItinerary.filter(x => x.day === item.day);
            const dayIndex = dayStops.findIndex(x => x.id === item.id);
            const isStart = dayIndex === 0;
            const isEnd = dayIndex === dayStops.length - 1;
            const isCurrentDay = item.day === selectedDay;
            
            const coordKey = `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
            if (!coordinateGroups[coordKey]) {
              coordinateGroups[coordKey] = {
                items: [],
                indices: [],
                isStart: false,
                isEnd: false,
                isCurrentDay: false
              };
            }
            coordinateGroups[coordKey].items.push(item);
            coordinateGroups[coordKey].indices.push(dayIndex);
            if (isStart) coordinateGroups[coordKey].isStart = true;
            if (isEnd) coordinateGroups[coordKey].isEnd = true;
            if (isCurrentDay) coordinateGroups[coordKey].isCurrentDay = true;
          });

          return Object.entries(coordinateGroups).map(([coordKey, group]) => {
            // Check if newly added stop is in this group
            const hasNewlyAdded = group.items.some(item => item.id === newlyAddedStopId);
            
            return (
              <ItineraryMarker
                key={coordKey}
                items={group.items}
                dayIndices={group.indices}
                isStart={group.isStart}
                isEnd={group.isEnd}
                isCurrentDay={group.isCurrentDay}
                autoOpen={hasNewlyAdded}
                onSave={onUpdateItineraryItem}
                onDelete={onDeleteItineraryItem}
                isReadOnly={isReadOnly}
              />
            );
          });
        })()}

        {/* Map state synchronizers */}
        <ViewSetter bounds={fitBounds} trigger={fitBoundsTrigger} />
        <MapResizer isPrinting={isPrinting} showSidebar={showSidebar} />
        <MapController centerData={mapCenterData} />
        <MapEvents
          onClick={isReadOnly ? () => {} : handleMapClick}
          onMoveEnd={(map) => setCurrentExtent(map.getBounds())}
        />

        {showScale && <ScaleControl position="bottomright" />}
        <FloatingMapControls />
      </MapContainer>

      {/* 2. Map Title Custom Styled Overlay */}
      {(() => {
        // Title Size styling configuration
        const sizeStyles = {
          sm: { fontSize: '12px', padding: '6px 12px', gap: '8px' },
          md: { fontSize: '15px', padding: '8px 16px', gap: '10px' },
          lg: { fontSize: '20px', padding: '10px 20px', gap: '12px' },
          xl: { fontSize: '26px', padding: '12px 24px', gap: '14px' }
        };

        // Title Frame class mapping
        const frameClasses = {
          glass: 'bg-surface/90 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg select-none',
          pill: 'bg-surface border-2 rounded-full shadow-md select-none',
          outline: 'bg-surface/30 backdrop-blur-sm border-2 rounded-xl select-none',
          minimal: 'bg-transparent border-none p-0 shadow-none select-none'
        };

        const selectedSize = sizeStyles[titleSize] || sizeStyles.md;
        const frameClass = frameClasses[titleStyle] || frameClasses.glass;

        const containerStyle: CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: selectedSize.gap,
          padding: titleStyle === 'minimal' ? '0' : selectedSize.padding,
          fontFamily: titleFont,
          borderColor: (titleStyle === 'pill' || titleStyle === 'outline') ? titleColor : undefined,
          borderWidth: (titleStyle === 'pill' || titleStyle === 'outline') ? '2px' : undefined
        };

        const textStyle: CSSProperties = {
          fontSize: selectedSize.fontSize,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: titleColor,
          fontFamily: titleFont,
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: '300px'
        };

        return (
          <Draggable className="absolute top-6 left-6 z-[1000]">
            <div className={frameClass} style={containerStyle}>
              {titleStyle !== 'minimal' && (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span 
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                    style={{ backgroundColor: titleColor }}
                  />
                  <span 
                    className="relative inline-flex rounded-full h-2.5 w-2.5" 
                    style={{ backgroundColor: titleColor }}
                  />
                </span>
              )}
              <span style={textStyle} title={mapTitle}>
                {mapTitle}
              </span>
            </div>
          </Draggable>
        );
      })()}

      {/* Mobile Floating Action Button to toggle planner bottom sheet */}
      {!isReadOnly && !showSidebar && setShowSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full shadow-2xl border border-primary-container font-semibold transition hover:bg-primary/95 active:scale-95 no-print"
        >
          <Icon name="menu" className="text-xl" />
          <span className="text-xs font-bold uppercase tracking-wider">Show Planner</span>
        </button>
      )}

      {/* 3. North Arrow */}
      {showNorthArrow && (
        <Draggable className="absolute top-6 right-16 z-[1000]">
          <NorthArrow visible={true} />
        </Draggable>
      )}

      {/* 3.5 Sponsor Logo Link */}
      <div className="absolute bottom-6 right-20 z-[1000] no-print">
        <a 
          href="https://www.bidmytrip.ai" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center p-1 bg-surface/90 backdrop-blur-md rounded-md border border-outline-variant shadow-lg hover:bg-surface-container-high transition select-none"
          title="Sponsored by BidMyTrip"
        >
          <img 
            src={downloadImg} 
            alt="BidMyTrip Sponsor" 
            className="h-8 object-contain"
          />
        </a>
      </div>

      {/* 4. Map Legend Overlay */}
      {(layers.length > 0 || itinerary.length > 0) && showLegend && (
        <Draggable className="absolute bottom-6 left-6 z-[1000]">
          <div className="bg-surface/90 backdrop-blur-md p-4 rounded-xl border border-outline-variant shadow-lg min-w-[200px] max-w-[280px] select-none">
            <h3 className="text-label-caps font-bold text-on-surface-variant mb-2.5 border-b border-outline-variant/50 pb-1.5">
              Legend
            </h3>
            
            {/* Layers symbology (if layers exist) */}
            {layers.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {layers
                  .filter((l) => l.visible)
                  .map((l) => (
                    <div key={l.id} className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-inner border border-white shrink-0"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="text-body-sm font-semibold text-on-surface truncate" title={l.name}>
                        {l.name}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Itinerary Symbology */}
            {itinerary.length > 0 && (
              <div className="mt-3 border-t border-outline-variant/50 pt-2.5">
                <h4 className="text-[9px] font-bold text-on-surface-variant tracking-wider uppercase mb-1.5">Itinerary Symbology</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from(new Set(itinerary.map(item => item.type))).map(type => {
                    const label = {
                      hotel: 'Hotel/Lodging',
                      bed: 'Bed/Rest',
                      playground: 'Playground',
                      food: 'Dining',
                      view: 'Sightseeing',
                      point: 'Waypoint',
                      hiking: 'Hiking',
                      shopping: 'Shopping'
                    }[type] || type;

                    return (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <div 
                          className="flex items-center justify-center w-5 h-5 rounded-full border border-primary bg-white text-primary shrink-0 shadow-sm animate-none"
                          dangerouslySetInnerHTML={{ __html: getIconSvgString(type, 'var(--color-primary)') }}
                        />
                        <span className="text-[10px] text-on-surface truncate capitalize font-medium">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Elevation Graph */}
            <ElevationGraph itinerary={itinerary} />
          </div>
        </Draggable>
      )}
    </div>
  );
}
