import { useEffect, useState, useRef, FormEvent, MouseEvent as ReactMouseEvent, CSSProperties, ReactNode } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  LayersControl,
  Marker,
  Popup,
  Tooltip,
  Polyline,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import Icon from './Icon';
import { MapLayer } from './panels/LayersPanel';
import { ItineraryItem, calculateHaversineDistance } from './panels/ItineraryPanel';

// @ts-ignore
import compassImg from '../public/illustration-compass_53876-18111-removebg-preview.png';
// @ts-ignore
import downloadImg from '../public/download.png';

const BASE_LAYERS = [
  { id: 'osm', name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'satellite', name: 'ESRI Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'clean', name: 'Carto Clean Map', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
  { id: 'dark', name: 'Dark Mode Map', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { id: 'topo', name: 'Topography Map', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' }
];

// ─── Day colour palette (15 days) ───────────────────────────────────────────
const DAY_COLORS = [
  { bg: '#1d4ed8', label: 'Blue' },
  { bg: '#16a34a', label: 'Green' },
  { bg: '#ca8a04', label: 'Yellow' },
  { bg: '#dc2626', label: 'Red' },
  { bg: '#9333ea', label: 'Purple' },
  { bg: '#0891b2', label: 'Cyan' },
  { bg: '#ea580c', label: 'Orange' },
  { bg: '#db2777', label: 'Pink' },
  { bg: '#65a30d', label: 'Lime' },
  { bg: '#0d9488', label: 'Teal' },
  { bg: '#b45309', label: 'Amber' },
  { bg: '#7c3aed', label: 'Violet' },
  { bg: '#be123c', label: 'Rose' },
  { bg: '#0369a1', label: 'Sky' },
  { bg: '#166534', label: 'Forest' },
];
const getDayColor = (day: number) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

const getDayDateStr = (startDate: string | undefined, day: number): string | null => {
  if (!startDate) return null;
  try {
    const d = new Date(startDate);
    d.setDate(d.getDate() + day - 1);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return null; }
};

// ─── Icon SVG strings ────────────────────────────────────────────────────────
const getIconSvgString = (type: string, color: string = 'currentColor') => {
  const svgs: { [key: string]: string } = {
    hotel:    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
    plane:    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
    playground:`<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>`,
    food:     `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v4M17 20V2a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h1v8M12 11v9M7 11v9"/></svg>`,
    view:     `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    point:    `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    hiking:   `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
    shopping: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`,
  };
  return svgs[type] || svgs.point;
};

// ─── Props ───────────────────────────────────────────────────────────────────
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
  onUpdateItineraryItem: (id: string, name: string, elevation: number | undefined, duration: number | undefined, type: ItineraryItem['type']) => void;
  onDeleteItineraryItem: (id: string) => void;
  tileUrlSuffix?: string;
  isReadOnly?: boolean;
  titleFont?: 'Inter' | 'Georgia' | 'monospace' | 'serif' | 'sans-serif';
  titleColor?: string;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  titleStyle?: 'glass' | 'pill' | 'outline' | 'minimal';
  showSidebar?: boolean;
  setShowSidebar?: (show: boolean) => void;
  startDate?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const ViewSetter = ({ bounds, trigger }: { bounds: L.LatLngBounds | null; trigger: number }) => {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { animate: false }); }, [bounds, trigger, map]);
  return null;
};

const MapResizer = ({ isPrinting, showSidebar }: { isPrinting: boolean; showSidebar?: boolean }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 150);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isPrinting, showSidebar, map]);
  return null;
};

const MapController = ({ centerData }: { centerData: { center: [number, number]; zoom: number } | null }) => {
  const map = useMap();
  useEffect(() => { if (centerData) map.setView(centerData.center, centerData.zoom); }, [centerData, map]);
  return null;
};

const MapEvents = ({ onClick, onMoveEnd }: { onClick: (e: L.LeafletMouseEvent) => void; onMoveEnd: (map: L.Map) => void }) => {
  const map = useMapEvents({ click: onClick, moveend: () => onMoveEnd(map) });
  return null;
};

const NorthArrow = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="bg-surface/90 backdrop-blur-md p-2 rounded-full border border-outline-variant shadow-lg select-none flex flex-col items-center justify-center w-16 h-16">
      <img src={compassImg} alt="North Arrow" className="w-12 h-12 object-contain" />
    </div>
  );
};

// ─── Custom scale bar (replaces Leaflet ScaleControl for precise positioning) ─
const ScaleBar = ({ show }: { show: boolean }) => {
  const map = useMap();
  const [scale, setScale] = useState({ text: '100 km', width: 80 });

  useEffect(() => {
    const update = () => {
      const zoom = map.getZoom();
      const lat = map.getCenter().lat;
      const mpp = (40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180))) / Math.pow(2, zoom + 8);
      const maxPx = 100;
      const maxM = mpp * maxPx;
      const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
      const dist = nice.find(v => v >= maxM * 0.6) ?? Math.round(maxM);
      const px = Math.min(Math.round(dist / mpp), maxPx);
      const text = dist >= 1000
        ? `${dist >= 100000 ? Math.round(dist / 1000) : (dist / 1000).toFixed(1)} km`
        : `${dist} m`;
      setScale({ text, width: px });
    };
    map.on('zoomend moveend', update);
    update();
    return () => { map.off('zoomend moveend', update); };
  }, [map]);

  if (!show) return null;

  return (
    <div className="absolute no-print select-none" style={{ bottom: '22px', right: '360px', zIndex: 999 }}>
      <div
        style={{ width: `${scale.width}px` }}
        className="bg-white/90 backdrop-blur-sm text-center text-[10px] font-bold font-mono text-gray-700 px-1 py-0.5 border border-gray-500/60 border-t-0 rounded-b shadow"
      >
        {scale.text}
      </div>
    </div>
  );
};

// ─── Custom Map Control Bar (Zoom, Locate, Base Layers, Measure) ─────────────
const MapControlBar = ({
  measureActive,
  setMeasureActive,
  measurePoints,
  setMeasurePoints,
  activeBaseLayer,
  setActiveBaseLayer,
  layersMenuOpen,
  setLayersMenuOpen
}: {
  measureActive: boolean;
  setMeasureActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  measurePoints: L.LatLng[];
  setMeasurePoints: (pts: L.LatLng[] | ((prev: L.LatLng[]) => L.LatLng[])) => void;
  activeBaseLayer: string;
  setActiveBaseLayer: (layerId: string) => void;
  layersMenuOpen: boolean;
  setLayersMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) => {
  const map = useMap();
  return (
    <div 
      className="absolute bottom-6 right-6 z-[1000] flex items-center gap-3 no-print"
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
    >
      {/* Base Layer Selection Popover */}
      {layersMenuOpen && (
        <div className="absolute bottom-14 right-0 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-xl p-3 w-48 flex flex-col gap-1.5 select-none text-left">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 border-b border-gray-100 pb-1">Base Maps</h4>
          {BASE_LAYERS.map(layer => (
            <button
              key={layer.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBaseLayer(layer.id);
                setLayersMenuOpen(false);
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeBaseLayer === layer.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <span>{layer.name}</span>
              {activeBaseLayer === layer.id && <Icon name="check" className="text-sm" />}
            </button>
          ))}
        </div>
      )}

      {/* Main Control Pill */}
      <div className="flex items-center rounded-full border border-gray-200/80 bg-white/90 backdrop-blur-md shadow-xl p-1.5 select-none">
        {/* Zoom In */}
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); map.zoomIn(); }} 
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition active:scale-95" 
          title="Zoom In"
        >
          <Icon name="add" className="text-xl" />
        </button>
        
        {/* Zoom Out */}
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); map.zoomOut(); }} 
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition active:scale-95 border-r border-gray-100 pr-1 mr-1" 
          title="Zoom Out"
        >
          <Icon name="remove" className="text-xl" />
        </button>

        {/* Locate */}
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); map.locate({ setView: true, maxZoom: 15 }); }} 
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition active:scale-95" 
          title="My Location"
        >
          <Icon name="my_location" className="text-xl" />
        </button>

        {/* Layers Toggle */}
        <button 
          type="button"
          onClick={(e) => { e.stopPropagation(); setLayersMenuOpen(prev => !prev); }} 
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${layersMenuOpen ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`} 
          title="Base Maps"
        >
          <Icon name="layers" className="text-xl" />
        </button>

        {/* Distance Measure Tool */}
        <button 
          type="button"
          onClick={(e) => { 
            e.stopPropagation(); 
            setMeasureActive(prev => {
              const next = !prev;
              if (!next) setMeasurePoints([]);
              return next;
            });
          }} 
          className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${measureActive ? 'bg-rose-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`} 
          title={measureActive ? "Deactivate Measure Tool" : "Measure Distance"}
        >
          <Icon name="square_foot" className="text-xl" />
        </button>
      </div>

      {/* Clear Measure button (shows only when measure tool is active & has points) */}
      {measureActive && measurePoints.length > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMeasurePoints([]); }}
          className="absolute bottom-16 right-[14px] px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-lg transition active:scale-95 flex items-center gap-1 no-print animate-in fade-in duration-100"
          title="Clear Measurement Points"
        >
          <Icon name="delete_sweep" className="text-xs" />
          <span>Clear ({measurePoints.length})</span>
        </button>
      )}
    </div>
  );
};

// ─── Marker icon creators (day-colour aware) ──────────────────────────────────
const createStitchMarkerIcon = (
  type: ItineraryItem['type'],
  index: number,
  isStart: boolean,
  isEnd: boolean,
  dayNum: number,
  isCurrentDay: boolean
) => {
  const { bg } = getDayColor(dayNum);
  const alpha = isCurrentDay ? 1 : 0.45;
  const hexAlpha = Math.round(alpha * 255).toString(16).padStart(2, '0');
  const mainColor = bg;
  const fadedColor = `${bg}${hexAlpha}`;
  const fill = (isStart || isEnd) ? fadedColor : 'white';
  const border = `2px solid ${fadedColor}`;
  const strokeColor = (isStart || isEnd) ? '#fff' : fadedColor;
  const iconSvg = getIconSvgString(type, strokeColor);

  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;
                  width:32px;height:32px;border-radius:50%;background:${fill};border:${border};
                  box-shadow:0 2px 6px rgba(0,0,0,0.22);">
        ${iconSvg}
        <span style="position:absolute;top:-5px;right:-5px;display:flex;align-items:center;
                     justify-content:center;width:15px;height:15px;border-radius:50%;
                     background:${fadedColor};color:#fff;font-size:8px;font-weight:bold;
                     border:1.5px solid white;">${index + 1}</span>
      </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const getClusterColor = (items: ItineraryItem[]) => {
  const days = Array.from(new Set(items.map(i => i.day)));
  if (days.length === 1) {
    return getDayColor(days[0]).bg;
  }
  return '#1e293b'; // Slate-800 for multi-day clusters
};

const getOffsetCoordinate = (centerLat: number, centerLng: number, index: number, total: number) => {
  const angle = (index * 360 / total - 90) * (Math.PI / 180);
  const distanceDegrees = 0.00035; // ~40 meters
  const offsetLat = centerLat + distanceDegrees * Math.sin(angle);
  const offsetLng = centerLng + distanceDegrees * Math.cos(angle);
  return [offsetLat, offsetLng] as [number, number];
};

// Cluster marker — pure SVG with radiating spoke lines for reliable cross-browser rendering
const createClusteredMarkerIcon = (items: ItineraryItem[], color: string, isCurrentDay: boolean) => {
  const opacity = isCurrentDay ? 1 : 0.5;
  const count = items.length;
  const S = 64; // total SVG canvas (px)
  const cx = 32, cy = 32;
  const circleR = 14, spokeIn = 17, spokeOut = 29;
  const numSpokes = Math.min(count, 8);

  const parts = Array.from({ length: numSpokes }, (_, i) => {
    const a = ((i * 360 / numSpokes) - 90) * (Math.PI / 180);
    const x1 = (cx + spokeIn  * Math.cos(a)).toFixed(1);
    const y1 = (cy + spokeIn  * Math.sin(a)).toFixed(1);
    const x2 = (cx + spokeOut * Math.cos(a)).toFixed(1);
    const y2 = (cy + spokeOut * Math.sin(a)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="${opacity}"/>
            <circle cx="${x2}" cy="${y2}" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" opacity="${opacity}"/>`;
  }).join('');

  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block;overflow:visible;">
             ${parts}
             <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${color}" stroke="white" stroke-width="2.5" opacity="${opacity}"/>
             <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="white"
                   font-size="${count > 9 ? 10 : 13}" font-weight="bold"
                   font-family="Inter,system-ui,sans-serif">${count}</text>
           </svg>`,
    className: '',
    iconSize: [S, S],
    iconAnchor: [cx, cy]
  });
};

// ─── Draggable wrapper ────────────────────────────────────────────────────────
interface DraggableProps { children: ReactNode; className?: string; style?: CSSProperties; }
const Draggable = ({ children, className, style }: DraggableProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const elementPosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('.no-drag')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    elementPosition.current = { ...position };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: elementPosition.current.x + e.clientX - dragStart.current.x, y: elementPosition.current.y + e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging]);

  return (
    <div
      style={{ ...style, transform: `translate(${position.x}px, ${position.y}px)`, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      className={className}
    >
      {children}
    </div>
  );
};

// ─── Elevation profile graph ──────────────────────────────────────────────────
const ElevationGraph = ({ itinerary }: { itinerary: ItineraryItem[] }) => {
  const sorted = [...itinerary].sort((a, b) => a.day !== b.day ? a.day - b.day : itinerary.indexOf(a) - itinerary.indexOf(b));
  const points = sorted.filter(item => item.elevation !== undefined);
  if (points.length < 2) return (
    <div className="mt-1 text-[9px] text-on-surface-variant/75 italic text-center">Add elevation on 2+ stops to view.</div>
  );

  const elevations = points.map(p => Number(p.elevation ?? 0));
  const maxElev = Math.max(...elevations, 10);
  const minElev = Math.min(...elevations);   // Start from actual minimum — not forced to 0
  const range = maxElev - minElev || 1;
  const W = 200, H = 50, px = 8, py = 6;

  const svgPts = points.map((p, i) => ({
    x: px + (i / (points.length - 1)) * (W - 2 * px),
    y: H - py - ((Number(p.elevation ?? 0) - minElev) / range) * (H - 2 * py),
    name: p.name, elev: p.elevation ?? 0, day: p.day
  }));

  // Render line segments and area slices between consecutive points
  const segments = [];
  for (let i = 0; i < svgPts.length - 1; i++) {
    const p1 = svgPts[i];
    const p2 = svgPts[i + 1];
    const dayColor = getDayColor(p1.day).bg; // use the starting point's day color
    
    segments.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      color: dayColor,
      areaD: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p2.x} ${H - py} L ${p1.x} ${H - py} Z`
    });
  }

  return (
    <>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-mono text-on-surface-variant" style={{ color: '#434655', fontWeight: 600 }}>{minElev}m – {maxElev}m</span>
      </div>
      <div className="rounded-lg p-1.5 border" style={{ backgroundColor: 'transparent', borderColor: 'rgba(195, 198, 215, 0.4)' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
          {segments.map((seg, idx) => (
            <g key={idx}>
              {/* Area under segment */}
              <path d={seg.areaD} fill={seg.color} fillOpacity="0.08" />
              {/* Line segment */}
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke={seg.color} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ))}
          {svgPts.map((p, i) => {
            const dayColor = getDayColor(p.day).bg;
            return (
              <circle key={i} cx={p.x} cy={p.y} r="2.8" fill={dayColor} stroke="#fff" strokeWidth="0.75">
                <title>{`${p.name}: ${p.elev}m`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </>
  );
};

// ─── Popup editor (editable) ──────────────────────────────────────────────────
const PopupEditor = ({
  item, dayIndex, onSave, onDelete, hideHeader = false, startDate
}: {
  item: ItineraryItem; dayIndex: number;
  onSave: (id: string, name: string, elevation: number | undefined, duration: number | undefined, type: ItineraryItem['type']) => void;
  onDelete: (id: string) => void;
  hideHeader?: boolean;
  startDate?: string;
}) => {
  const [name, setName] = useState(item.name);
  const [elevation, setElevation] = useState(item.elevation !== undefined ? item.elevation.toString() : '');
  const [duration, setDuration] = useState(item.duration !== undefined ? item.duration.toString() : '');
  const [type, setType] = useState(item.type);

  useEffect(() => {
    setName(item.name);
    setElevation(item.elevation !== undefined ? item.elevation.toString() : '');
    setDuration(item.duration !== undefined ? item.duration.toString() : '');
    setType(item.type);
  }, [item]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(item.id, name, elevation === '' ? undefined : parseFloat(elevation), duration === '' ? undefined : parseFloat(duration), type);
  };

  const dateStr = getDayDateStr(startDate, item.day);
  const dayColor = getDayColor(item.day);

  return (
    <form onSubmit={handleSubmit} className="p-2 w-64 space-y-3 font-sans text-xs no-drag">
      {!hideHeader && (
        <div className="flex items-center gap-2 pb-1 border-b border-outline-variant/30">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: dayColor.bg, flexShrink: 0 }} />
          <div>
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Stop {dayIndex + 1} · Day {item.day}</span>
            {dateStr && <div className="text-[9px] text-on-surface-variant font-medium">{dateStr}</div>}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-on-surface-variant">Place Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-2 py-1 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-xs text-on-surface" placeholder="e.g. Kathmandu" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-on-surface-variant">Elevation (m)</label>
            <input type="number" value={elevation} onChange={e => setElevation(e.target.value)} className="w-full px-2 py-1 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-xs text-on-surface" placeholder="e.g. 1400" />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-semibold text-on-surface-variant">Duration (hrs)</label>
            <input type="number" step="0.1" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-2 py-1 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-xs text-on-surface" placeholder="e.g. 2.5" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-on-surface-variant">Symbol</label>
          <div className="grid grid-cols-4 gap-1 bg-surface-container rounded p-1">
            {[
              { type: 'hotel', icon: 'hotel', label: 'Hotel' },
              { type: 'plane', icon: 'flight', label: 'Flight' },
              { type: 'playground', icon: 'child_care', label: 'Play' },
              { type: 'food', icon: 'restaurant', label: 'Dining' },
              { type: 'view', icon: 'photo_camera', label: 'Sight' },
              { type: 'point', icon: 'location_on', label: 'Waypt' },
              { type: 'hiking', icon: 'hiking', label: 'Hike' },
              { type: 'shopping', icon: 'shopping_bag', label: 'Shop' },
            ].map(btn => (
              <button key={btn.type} type="button" onClick={() => setType(btn.type as any)}
                className={`p-1 rounded flex flex-col items-center gap-0.5 transition ${type === btn.type ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                title={btn.label}>
                <Icon name={btn.icon} className="text-sm" />
                <span className="text-[8px] font-medium leading-none">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center pt-1 border-t border-outline-variant/30">
        <button type="button" onClick={() => onDelete(item.id)} className="px-2 py-1 text-[10px] font-bold text-error hover:bg-error-container/10 rounded transition">DELETE</button>
        <button type="submit" className="px-3 py-1 bg-primary text-on-primary rounded text-[10px] font-bold hover:bg-primary/95 shadow transition">SAVE</button>
      </div>
    </form>
  );
};

const ClusteredPopupEditor = ({
  items, dayIndices, onSave, onDelete, onClose, startDate
}: {
  items: ItineraryItem[]; dayIndices: number[];
  onSave: (id: string, name: string, elevation: number | undefined, duration: number | undefined, type: ItineraryItem['type']) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  startDate?: string;
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => { if (activeIdx >= items.length) setActiveIdx(Math.max(0, items.length - 1)); }, [items, activeIdx]);
  if (items.length === 0) return null;

  return (
    <div className="w-68 space-y-3 font-sans text-xs no-drag max-h-[380px] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1 shrink-0">
        <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Cluster ({items.length} Stops)</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {items.map((item, idx) => (
          <button key={item.id} onClick={() => setActiveIdx(idx)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition shrink-0 ${activeIdx === idx ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
            Stop {dayIndices[idx] + 1}
          </button>
        ))}
      </div>
      <div className="border border-outline-variant/20 rounded p-1 bg-surface-container-lowest">
        <PopupEditor item={items[activeIdx]} dayIndex={dayIndices[activeIdx]} onSave={onSave}
          onDelete={id => { onDelete(id); if (items.length <= 1) onClose(); }} hideHeader startDate={startDate} />
      </div>
    </div>
  );
};

// ─── Read-only popups ─────────────────────────────────────────────────────────
const ReadOnlyPopup = ({ item, dayIndex, startDate }: { item: ItineraryItem; dayIndex: number; startDate?: string }) => {
  const stopTypes = [
    { type: 'hotel', icon: 'hotel', tooltip: 'Lodging' },
    { type: 'plane', icon: 'flight', tooltip: 'Flight' },
    { type: 'playground', icon: 'child_care', tooltip: 'Playground' },
    { type: 'food', icon: 'restaurant', tooltip: 'Dining' },
    { type: 'view', icon: 'photo_camera', tooltip: 'Sightseeing' },
    { type: 'point', icon: 'location_on', tooltip: 'Waypoint' },
    { type: 'hiking', icon: 'hiking', tooltip: 'Hiking' },
    { type: 'shopping', icon: 'shopping_bag', tooltip: 'Shopping' },
  ] as const;

  const currentType = stopTypes.find(b => b.type === item.type) || { icon: 'location_on', tooltip: 'Waypoint' };
  const dayColor = getDayColor(item.day);
  const dateStr = getDayDateStr(startDate, item.day);

  return (
    <div className="p-2 w-60 space-y-2.5 font-sans text-xs select-none">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1.5">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Stop {dayIndex + 1}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dayColor.bg, flexShrink: 0 }} />
            <span className="text-[9px] font-semibold text-on-surface-variant">Day {item.day}{dateStr ? ` · ${dateStr}` : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-primary-container/20 text-primary px-2 py-0.5 rounded-full text-[9px] font-semibold border border-primary/10">
          <Icon name={currentType.icon} className="text-[10px]" />
          <span>{currentType.tooltip}</span>
        </div>
      </div>
      <div>
        <h4 className="text-body-main font-bold text-on-surface leading-tight">{item.name}</h4>
        <span className="text-[9px] font-mono text-on-surface-variant block mt-0.5">{item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°</span>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/30 pt-2 text-[10px] font-medium text-on-surface-variant">
        {item.elevation !== undefined && (
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-wider">Elevation</span>
            <span className="font-bold text-on-surface mt-0.5">+{item.elevation} m</span>
          </div>
        )}
        {item.duration !== undefined && (
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase tracking-wider">Duration</span>
            <span className="font-bold text-on-surface mt-0.5">{item.duration.toFixed(1)} hrs</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ReadOnlyClusteredPopup = ({ items, dayIndices, startDate }: { items: ItineraryItem[]; dayIndices: number[]; startDate?: string }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  if (items.length === 0) return null;
  return (
    <div className="w-64 space-y-3 font-sans text-xs select-none max-h-[300px] overflow-y-auto">
      <div className="border-b border-outline-variant/30 pb-1">
        <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Cluster ({items.length} Stops)</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide shrink-0">
        {items.map((item, idx) => (
          <button key={item.id} onClick={() => setActiveIdx(idx)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition shrink-0 ${activeIdx === idx ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
            Stop {dayIndices[idx] + 1}
          </button>
        ))}
      </div>
      <div className="border border-outline-variant/20 rounded p-1 bg-surface-container-lowest">
        <ReadOnlyPopup item={items[activeIdx]} dayIndex={dayIndices[activeIdx]} startDate={startDate} />
      </div>
    </div>
  );
};

// ─── Itinerary marker ─────────────────────────────────────────────────────────
const ItineraryMarker = ({
  items, dayIndices, isStart, isEnd, isCurrentDay, dayNum,
  autoOpen, onSave, onDelete, isReadOnly = false, startDate,
  customPosition
}: {
  items: ItineraryItem[]; dayIndices: number[];
  isStart: boolean; isEnd: boolean; isCurrentDay: boolean; dayNum: number;
  autoOpen: boolean;
  onSave: (id: string, name: string, elevation: number | undefined, duration: number | undefined, type: ItineraryItem['type']) => void;
  onDelete: (id: string) => void;
  isReadOnly?: boolean;
  startDate?: string;
  customPosition?: [number, number];
}) => {
  const markerRef = useRef<L.Marker>(null);
  useEffect(() => {
    if (autoOpen && markerRef.current) setTimeout(() => markerRef.current?.openPopup(), 50);
  }, [autoOpen]);

  const firstItem = items[0];
  if (!firstItem) return null;
  const isClustered = items.length > 1;
  const tooltipText = items.map((item, idx) => `${dayIndices[idx] + 1}. ${item.name}`).join(' & ');
  const position = customPosition || [firstItem.lat, firstItem.lng];

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={isClustered
        ? createClusteredMarkerIcon(items, getClusterColor(items), isCurrentDay)
        : createStitchMarkerIcon(firstItem.type, dayIndices[0], isStart, isEnd, dayNum, isCurrentDay)}
    >
      <Tooltip permanent direction="top" offset={[0, isClustered ? -28 : -15]} opacity={0.95}>
        <div className="font-bold text-[10px] text-on-surface leading-tight truncate max-w-[150px]">{tooltipText}</div>
      </Tooltip>
      <Popup>
        {isReadOnly
          ? isClustered
            ? <ReadOnlyClusteredPopup items={items} dayIndices={dayIndices} startDate={startDate} />
            : <ReadOnlyPopup item={firstItem} dayIndex={dayIndices[0]} startDate={startDate} />
          : isClustered
            ? <ClusteredPopupEditor items={items} dayIndices={dayIndices} onSave={onSave} onDelete={onDelete}
                onClose={() => markerRef.current?.closePopup()} startDate={startDate} />
            : <PopupEditor item={firstItem} dayIndex={dayIndices[0]}
                onSave={(id, name, elev, dur, type) => { onSave(id, name, elev, dur, type); markerRef.current?.closePopup(); }}
                onDelete={onDelete} startDate={startDate} />
        }
      </Popup>
    </Marker>
  );
};

const ClusterGroupRenderer = ({
  sortedItinerary,
  selectedDay,
  newlyAddedStopId,
  onUpdateItineraryItem,
  onDeleteItineraryItem,
  isReadOnly,
  startDate
}: {
  sortedItinerary: ItineraryItem[];
  selectedDay: number;
  newlyAddedStopId: string | null;
  onUpdateItineraryItem: MapViewProps['onUpdateItineraryItem'];
  onDeleteItineraryItem: MapViewProps['onDeleteItineraryItem'];
  isReadOnly: boolean;
  startDate: string;
}) => {
  const map = useMap();
  const [mapTrigger, setMapTrigger] = useState(0);

  useEffect(() => {
    const handleEvent = () => setMapTrigger(prev => prev + 1);
    map.on('zoomend moveend viewreset', handleEvent);
    return () => {
      map.off('zoomend moveend viewreset', handleEvent);
    };
  }, [map]);

  const clusters: Array<{
    centerLat: number;
    centerLng: number;
    items: ItineraryItem[];
    indices: number[];
    isStart: boolean;
    isEnd: boolean;
    isCurrentDay: boolean;
  }> = [];

  sortedItinerary.forEach((item) => {
    const latLng = L.latLng(item.lat, item.lng);
    const px = map.latLngToLayerPoint(latLng);
    
    const threshold = 35; // pixel threshold for clustering
    let clusterIndex = -1;
    for (let i = 0; i < clusters.length; i++) {
      const cLatLng = L.latLng(clusters[i].centerLat, clusters[i].centerLng);
      const cPx = map.latLngToLayerPoint(cLatLng);
      if (cPx.distanceTo(px) < threshold) {
        clusterIndex = i;
        break;
      }
    }

    const dayStops = sortedItinerary.filter(x => x.day === item.day);
    const dayIndex = dayStops.findIndex(x => x.id === item.id);
    const isItemStart = dayIndex === 0;
    const isItemEnd = dayIndex === dayStops.length - 1;
    const isCurrent = item.day === selectedDay;

    if (clusterIndex !== -1) {
      clusters[clusterIndex].items.push(item);
      clusters[clusterIndex].indices.push(dayIndex);
      if (isItemStart) clusters[clusterIndex].isStart = true;
      if (isItemEnd) clusters[clusterIndex].isEnd = true;
      if (isCurrent) clusters[clusterIndex].isCurrentDay = true;
    } else {
      clusters.push({
        centerLat: item.lat,
        centerLng: item.lng,
        items: [item],
        indices: [dayIndex],
        isStart: isItemStart,
        isEnd: isItemEnd,
        isCurrentDay: isCurrent
      });
    }
  });

  const getOffsetLatLng = (centerLat: number, centerLng: number, index: number, total: number) => {
    const centerPx = map.latLngToLayerPoint(L.latLng(centerLat, centerLng));
    const angle = (index * 360 / total - 90) * (Math.PI / 180);
    const distancePixels = 38; // spoke length in pixels
    const offsetPx = L.point(
      centerPx.x + distancePixels * Math.cos(angle),
      centerPx.y + distancePixels * Math.sin(angle)
    );
    const offsetLatLng = map.layerPointToLatLng(offsetPx);
    return [offsetLatLng.lat, offsetLatLng.lng] as [number, number];
  };

  const elements: ReactNode[] = [];

  clusters.forEach((c, cIdx) => {
    const isClustered = c.items.length > 1;

    if (!isClustered) {
      const item = c.items[0];
      elements.push(
        <ItineraryMarker key={item.id}
          items={[item]} dayIndices={[c.indices[0]]}
          isStart={c.isStart} isEnd={c.isEnd} isCurrentDay={c.isCurrentDay} dayNum={item.day}
          autoOpen={item.id === newlyAddedStopId}
          onSave={onUpdateItineraryItem} onDelete={onDeleteItineraryItem}
          isReadOnly={isReadOnly} startDate={startDate}
        />
      );
    } else {
      const clusterColor = getClusterColor(c.items);
      elements.push(
        <Marker
          key={`cluster-${cIdx}`}
          position={[c.centerLat, c.centerLng]}
          icon={createClusteredMarkerIcon(c.items, clusterColor, c.isCurrentDay)}
        >
          <Tooltip direction="top" offset={[0, -20]}>
            <div className="font-bold text-[10px] text-on-surface">Cluster of {c.items.length} Stops</div>
          </Tooltip>
        </Marker>
      );

      c.items.forEach((item, idx) => {
        const dayIndex = c.indices[idx];
        const [offsetLat, offsetLng] = getOffsetLatLng(c.centerLat, c.centerLng, idx, c.items.length);
        const dayColor = getDayColor(item.day).bg;

        elements.push(
          <Polyline
            key={`spoke-${item.id}`}
            positions={[[c.centerLat, c.centerLng], [offsetLat, offsetLng]]}
            pathOptions={{ color: dayColor, weight: 1.5, dashArray: '2, 4', opacity: 0.8 }}
          />
        );

        const dayStops = sortedItinerary.filter(x => x.day === item.day);
        const isItemStart = dayIndex === 0;
        const isItemEnd = dayIndex === dayStops.length - 1;

        elements.push(
          <ItineraryMarker key={item.id}
            items={[item]} dayIndices={[dayIndex]}
            isStart={isItemStart} isEnd={isItemEnd} isCurrentDay={item.day === selectedDay} dayNum={item.day}
            autoOpen={item.id === newlyAddedStopId}
            onSave={onUpdateItineraryItem} onDelete={onDeleteItineraryItem}
            isReadOnly={isReadOnly} startDate={startDate}
            customPosition={[offsetLat, offsetLng]}
          />
        );
      });
    }
  });

  return <>{elements}</>;
};

// ─── Main MapView export ──────────────────────────────────────────────────────
export default function MapView({
  mapTitle, layers, itinerary, selectedDay, showLegend, showNorthArrow, showScale,
  fitBounds, fitBoundsTrigger, isPrinting, isReadOnly = false, mapCenterData,
  handleMapClick, setCurrentExtent, newlyAddedStopId,
  onUpdateItineraryItem, onDeleteItineraryItem, tileUrlSuffix,
  titleFont = 'Inter', titleColor = '#004ac6', titleSize = 'md', titleStyle = 'glass',
  showSidebar = true, setShowSidebar, startDate = ''
}: MapViewProps) {
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 9));
  const sessionTileSuffix = `?session=${sessionId}${tileUrlSuffix ? '&' + tileUrlSuffix.replace(/^\?/, '') : ''}`;

  const [activeBaseLayer, setActiveBaseLayer] = useState('osm');
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<L.LatLng[]>([]);

  const handleMapClickWrapper = (e: L.LeafletMouseEvent) => {
    if (measureActive) {
      setMeasurePoints(prev => [...prev, e.latlng]);
    } else {
      if (!isReadOnly) {
        handleMapClick(e);
      }
    }
  };

  const sortedItinerary = [...itinerary].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return itinerary.indexOf(a) - itinerary.indexOf(b);
  });

  // Unique days that have at least one stop
  const activeDays = Array.from(new Set(sortedItinerary.map(i => i.day))).sort((a, b) => a - b);

  // Title styling
  const sizeStyles = {
    sm: { fontSize: '12px', padding: '6px 12px', gap: '8px' },
    md: { fontSize: '15px', padding: '8px 16px', gap: '10px' },
    lg: { fontSize: '20px', padding: '10px 20px', gap: '12px' },
    xl: { fontSize: '26px', padding: '12px 24px', gap: '14px' }
  };
  const frameClasses = {
    glass:   'bg-surface/90 backdrop-blur-md border border-outline-variant rounded-xl shadow-lg select-none',
    pill:    'bg-surface border-2 rounded-full shadow-md select-none',
    outline: 'bg-surface/30 backdrop-blur-sm border-2 rounded-xl select-none',
    minimal: 'bg-transparent border-none p-0 shadow-none select-none'
  };
  const selectedSize = sizeStyles[titleSize] || sizeStyles.md;
  const containerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: selectedSize.gap,
    padding: titleStyle === 'minimal' ? '0' : selectedSize.padding,
    fontFamily: titleFont,
    borderColor: (titleStyle === 'pill' || titleStyle === 'outline') ? titleColor : undefined,
    borderWidth: (titleStyle === 'pill' || titleStyle === 'outline') ? '2px' : undefined
  };
  const textStyle: CSSProperties = {
    fontSize: selectedSize.fontSize, fontWeight: 700, letterSpacing: '0.02em',
    color: titleColor, fontFamily: titleFont,
    textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '360px'
  };

  const hasElevationData = itinerary.some(item => item.elevation !== undefined);

  return (
    <div className="relative flex-grow h-full bg-surface-dim">

      {/* ── Map container ──────────────────────────────────────────────── */}
      <MapContainer id="map-canvas-main" center={[20, 0]} zoom={3}
        scrollWheelZoom={true} className="w-full h-full" zoomControl={false} preferCanvas={true}>

        {/* Dynamic Tile Layer */}
        {(() => {
          const activeLayer = BASE_LAYERS.find(l => l.id === activeBaseLayer) || BASE_LAYERS[0];
          let attrib = '';
          if (activeLayer.id === 'osm') attrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
          else if (activeLayer.id === 'satellite') attrib = 'Tiles &copy; Esri';
          else if (activeLayer.id === 'clean' || activeLayer.id === 'dark') attrib = '&copy; OpenStreetMap &copy; CARTO';
          else if (activeLayer.id === 'topo') attrib = '&copy; OpenTopoMap';

          return (
            <TileLayer
              key={activeLayer.id}
              crossOrigin="anonymous"
              attribution={attrib}
              url={`${activeLayer.url}${sessionTileSuffix}`}
            />
          );
        })()}

        {/* GeoJSON layers */}
        {layers.filter(l => l.visible).map(layer => (
          <GeoJSON key={layer.id} data={layer.data as any}
            style={{ color: layer.color, weight: 2.5, opacity: layer.opacity, fillOpacity: layer.opacity / 2, fillColor: layer.color }}
            onEachFeature={(feature, l) => {
              if (feature.properties) l.bindPopup(`<div class="p-2 space-y-1 text-xs font-sans"><strong class="text-body-sm text-primary border-b border-outline-variant/30 pb-1 block">Layer Info</strong>${Object.entries(feature.properties).map(([k, v]) => `<div><span class="text-on-surface-variant font-semibold">${k}:</span> <span class="text-on-surface font-medium">${v}</span></div>`).join('')}</div>`);
            }}
          />
        ))}

        {/* Per-day colour-coded polylines */}
        {activeDays.map((day, idx) => {
          const dayStops = sortedItinerary.filter(i => i.day === day);
          if (dayStops.length === 0) return null;

          const positions = dayStops.map(i => [i.lat, i.lng] as [number, number]);
          if (idx < activeDays.length - 1) {
            const nextDay = activeDays[idx + 1];
            const nextDayStops = sortedItinerary.filter(i => i.day === nextDay);
            if (nextDayStops.length > 0) {
              positions.push([nextDayStops[0].lat, nextDayStops[0].lng]);
            }
          }

          if (positions.length < 2) return null;

          return (
            <Polyline key={`poly-day-${day}`}
              {...({ positions, pathOptions: { color: getDayColor(day).bg, weight: 3, dashArray: '5, 8', opacity: 0.85 } } as any)}
            />
          );
        })}

        {/* Distance measurement path & markers */}
        {measurePoints.length > 1 && (
          <Polyline
            positions={measurePoints}
            pathOptions={{ color: '#be123c', weight: 3, dashArray: '6, 6', opacity: 0.9 }}
            interactive={false}
          />
        )}
        {measurePoints.map((pt, idx) => {
          let label = 'Start';
          if (idx > 0) {
            let cumulative = 0;
            for (let i = 1; i <= idx; i++) {
              cumulative += calculateHaversineDistance(
                measurePoints[i-1].lat,
                measurePoints[i-1].lng,
                measurePoints[i].lat,
                measurePoints[i].lng
              );
            }
            const segment = calculateHaversineDistance(
              measurePoints[idx-1].lat,
              measurePoints[idx-1].lng,
              pt.lat,
              pt.lng
            );
            label = `+${segment.toFixed(1)} km (Total: ${cumulative.toFixed(1)} km)`;
          }
          
          const measureIcon = L.divIcon({
            html: `<div style="width: 10px; height: 10px; border-radius: 50%; background: #be123c; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3)"></div>`,
            className: '',
            iconSize: [10, 10],
            iconAnchor: [5, 5]
          });

          return (
            <Marker key={`measure-${idx}`} position={pt} icon={measureIcon} interactive={false}>
              <Tooltip permanent direction="top" offset={[0, -6]} opacity={0.9} interactive={false}>
                <span className="text-[9px] font-bold text-rose-700 bg-white/95 backdrop-blur-sm px-1 py-0.5 rounded shadow-sm border border-rose-200/60 select-none pointer-events-none">
                  {label}
                </span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Itinerary markers (cluster-aware) */}
        <ClusterGroupRenderer
          sortedItinerary={sortedItinerary}
          selectedDay={selectedDay}
          newlyAddedStopId={newlyAddedStopId}
          onUpdateItineraryItem={onUpdateItineraryItem}
          onDeleteItineraryItem={onDeleteItineraryItem}
          isReadOnly={isReadOnly}
          startDate={startDate}
        />

        {/* Map utility hooks */}
        <ViewSetter bounds={fitBounds} trigger={fitBoundsTrigger} />
        <MapResizer isPrinting={isPrinting} showSidebar={showSidebar} />
        <MapController centerData={mapCenterData} />
        <MapEvents onClick={handleMapClickWrapper} onMoveEnd={map => setCurrentExtent(map.getBounds())} />

        {/* Custom scale bar positioned beside sponsor logo */}
        <ScaleBar show={showScale} />

        {/* Zoom / locate / layers / measure control bar */}
        <MapControlBar
          measureActive={measureActive}
          setMeasureActive={setMeasureActive}
          measurePoints={measurePoints}
          setMeasurePoints={setMeasurePoints}
          activeBaseLayer={activeBaseLayer}
          setActiveBaseLayer={setActiveBaseLayer}
          layersMenuOpen={layersMenuOpen}
          setLayersMenuOpen={setLayersMenuOpen}
        />
      </MapContainer>

      {/* ── Map title — centered at top ────────────────────────────────── */}
      <div className="absolute top-4 z-[1000] w-full flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <Draggable>
            <div className={frameClasses[titleStyle] || frameClasses.glass} style={containerStyle}>
              <span style={textStyle} title={mapTitle}>{mapTitle}</span>
            </div>
          </Draggable>
        </div>
      </div>

      {/* ── Elevation profile — top-left draggable ─────────────────────── */}
      {hasElevationData && (
        <Draggable className="absolute top-4 left-4 z-[1000]">
          <div 
            style={{
              minWidth: '220px', 
              maxWidth: '270px',
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(8px)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(195, 198, 215, 0.5)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}
            className="select-none"
          >
            <h3 style={{ fontSize: '10px', fontWeight: 700, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Elevation Profile</h3>
            <ElevationGraph itinerary={itinerary} />
          </div>
        </Draggable>
      )}

      {/* ── Mobile FAB ─────────────────────────────────────────────────── */}
      {!isReadOnly && !showSidebar && setShowSidebar && (
        <button onClick={() => setShowSidebar(true)}
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-full shadow-2xl border border-primary-container font-semibold transition hover:bg-primary/95 active:scale-95 no-print">
          <Icon name="menu" className="text-xl" />
          <span className="text-xs font-bold uppercase tracking-wider">Show Planner</span>
        </button>
      )}

      {/* ── North arrow — top-right ────────────────────────────────────── */}
      {showNorthArrow && (
        <Draggable className="absolute top-4 right-16 z-[1000]">
          <NorthArrow visible={true} />
        </Draggable>
      )}

      {/* ── Sponsor logo ───────────────────────────────────────────────── */}
      <div className="absolute bottom-6 right-[254px] z-[1000] no-print">
        <a href="https://www.bidmytrip.ai" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center p-1 bg-surface/90 backdrop-blur-md rounded-md border border-outline-variant shadow-lg hover:bg-surface-container-high transition select-none"
          title="Sponsored by BidMyTrip">
          <img src={downloadImg} alt="BidMyTrip Sponsor" className="h-8 object-contain" />
        </a>
      </div>

      {/* ── Legend — bottom-left ───────────────────────────────────────── */}
      {(layers.length > 0 || itinerary.length > 0) && showLegend && (
        <Draggable className="absolute bottom-6 left-6 z-[1000]">
          <div 
            style={{ 
              minWidth: '200px', 
              maxWidth: '260px',
              backgroundColor: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(8px)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(195, 198, 215, 0.5)',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}
            className="select-none"
          >
            <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(195, 198, 215, 0.5)', paddingBottom: '6px', marginBottom: '10px' }}>Legend</h3>

            {/* GeoJSON layer symbols */}
            {layers.length > 0 && (
              <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                {layers.filter(l => l.visible).map(l => (
                  <div key={l.id} className="flex items-center gap-2.5 truncate">
                    <div 
                      style={{ 
                        width: '14px', 
                        height: '14px', 
                        borderRadius: '50%', 
                        backgroundColor: l.color, 
                        border: '1px solid #ffffff',
                        flexShrink: 0,
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                      }} 
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#191b23' }} className="truncate" title={l.name}>{l.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Day route colours */}
            {activeDays.length > 0 && (
              <div style={{ marginTop: layers.length > 0 ? '12px' : '0px', paddingTop: layers.length > 0 ? '10px' : '0px', borderTop: layers.length > 0 ? '1px solid rgba(195, 198, 215, 0.5)' : 'none' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Day Routes</h4>
                <div className="space-y-1.5">
                  {activeDays.map(day => {
                    const { bg } = getDayColor(day);
                    const dateStr = getDayDateStr(startDate, day);
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <div style={{ width: '20px', height: '3px', backgroundColor: bg, borderRadius: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '10px', color: '#191b23', fontWeight: 500 }}>
                          Day {day}{dateStr ? ` · ${dateStr}` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stop-type symbology */}
            {itinerary.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(195, 198, 215, 0.5)' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 700, color: '#434655', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Stop Types</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from(new Set(itinerary.map(i => i.type))).map(type => {
                    const label = ({ hotel: 'Hotel', plane: 'Flight', playground: 'Playground', food: 'Dining', view: 'Sightseeing', point: 'Waypoint', hiking: 'Hiking', shopping: 'Shopping' } as any)[type] || type;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            width: '20px', 
                            height: '20px', 
                            borderRadius: '50%', 
                            border: '1px solid #004ac6', 
                            backgroundColor: '#ffffff', 
                            color: '#004ac6', 
                            flexShrink: 0,
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                          }}
                          dangerouslySetInnerHTML={{ __html: getIconSvgString(type, '#004ac6') }} 
                        />
                        <span style={{ fontSize: '10px', color: '#191b23', fontWeight: 500 }} className="truncate capitalize">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Draggable>
      )}
    </div>
  );
}
