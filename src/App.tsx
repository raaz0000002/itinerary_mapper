/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
// @ts-ignore
import shp from 'shpjs';
// @ts-ignore
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

// Import UI/UX Redesign Components
import TopNavBar from './components/TopNavBar';
import SideNavBar from './components/SideNavBar';
import LayersPanel, { MapLayer, SearchResult } from './components/panels/LayersPanel';
import ItineraryPanel, { ItineraryItem, calculateHaversineDistance } from './components/panels/ItineraryPanel';
import PrintPanel, { PrintConfig } from './components/panels/PrintPanel';
import MapView from './components/MapView';
import Icon from './components/Icon';

// --- Utils ---
const generateUniqueId = () => {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
};

const PAPER_SIZES = {
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
};

const getPrintDimensions = (orientation: 'portrait' | 'landscape') => {
  return orientation === 'landscape'
    ? { width: '1120px', height: '792px' }
    : { width: '792px', height: '1120px' };
};

// Modern CSS oklch() color spaces are supported natively by html2canvas-pro.
// No manual stylesheet sanitization is needed anymore.

// Converts Leaflet CSS 3D transforms to top/left styling temporarily for html2canvas compatibility
const transformToOffset = () => {
  const queue: Array<{ el: HTMLElement; transform: string; left: string; top: string }> = [];
  const elements = document.querySelectorAll(
    '.leaflet-map-pane, .leaflet-tile-container, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-tile, .leaflet-zoom-animated, .leaflet-pane svg, .leaflet-overlay-pane svg, .leaflet-pane canvas, .leaflet-overlay-pane canvas'
  );
  elements.forEach((node) => {
    const el = node as HTMLElement;
    const style = window.getComputedStyle(el);
    const transform = style.transform || (style as any).webkitTransform;
    if (transform && transform !== 'none' && transform !== 'initial' && transform !== 'inherit') {
      try {
        let x = 0;
        let y = 0;
        const match = transform.match(/^matrix(3d)?\((.+)\)$/);
        if (match) {
          const parts = match[2].split(',').map(p => parseFloat(p.trim()));
          if (match[1]) {
            // 3d matrix
            x = parts[12] || 0;
            y = parts[13] || 0;
          } else {
            // 2d matrix
            x = parts[4] || 0;
            y = parts[5] || 0;
          }
          queue.push({
            el,
            transform: el.style.transform || '',
            left: el.style.left || '',
            top: el.style.top || ''
          });
          el.style.transform = 'none';
          const curLeft = parseFloat(el.style.left || '0') || 0;
          const curTop = parseFloat(el.style.top || '0') || 0;
          el.style.left = `${curLeft + x}px`;
          el.style.top = `${curTop + y}px`;
        }
      } catch (e) {
        console.warn("Failed to parse transform for element:", el, e);
      }
    }
  });
  return () => {
    queue.forEach(({ el, transform, left, top }) => {
      el.style.transform = transform;
      el.style.left = left;
      el.style.top = top;
    });
  };
};

const parseKML = (kmlText: string): { itineraryItems: any[]; layerData: any | null } => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  
  const itineraryItems: any[] = [];
  const geojsonFeatures: any[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const name = nameEl ? nameEl.textContent || '' : `Placemark ${i + 1}`;

    const props: any = { name };
    const dataNodes = pm.getElementsByTagName('Data');
    for (let j = 0; j < dataNodes.length; j++) {
      const d = dataNodes[j];
      const nameAttr = d.getAttribute('name');
      const valEl = d.getElementsByTagName('value')[0];
      if (nameAttr && valEl) {
        props[nameAttr] = valEl.textContent || '';
      }
    }
    const simpleDataNodes = pm.getElementsByTagName('SimpleData');
    for (let j = 0; j < simpleDataNodes.length; j++) {
      const sd = simpleDataNodes[j];
      const nameAttr = sd.getAttribute('name');
      if (nameAttr) {
        props[nameAttr] = sd.textContent || '';
      }
    }

    const descEl = pm.getElementsByTagName('description')[0];
    if (descEl) {
      props.description = descEl.textContent || '';
    }

    // Try Point coordinates
    const pointNodes = pm.getElementsByTagName('Point');
    if (pointNodes.length > 0) {
      const coordEl = pointNodes[0].getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const parts = coordEl.textContent.trim().split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const alt = parts[2] ? parseFloat(parts[2]) : undefined;

          if (!isNaN(lat) && !isNaN(lng)) {
            const dayStr = props.day || props.Day || props.day_num || props.dayNum;
            const dayVal = dayStr ? parseInt(dayStr, 10) : undefined;
            const elevStr = props.elevation || props.elevation_m || props.alt || props.altitude || props.elev || alt;
            const elevVal = elevStr !== undefined ? parseFloat(elevStr) : undefined;
            const durStr = props.duration || props.duration_hrs || props.dur || props.hours;
            const durVal = durStr !== undefined ? parseFloat(durStr) : undefined;

            itineraryItems.push({
              lat,
              lng,
              name,
              day: dayVal && !isNaN(dayVal) ? dayVal : undefined,
              elevation: elevVal && !isNaN(elevVal) ? elevVal : undefined,
              duration: durVal && !isNaN(durVal) ? durVal : undefined,
              type: props.type || 'point'
            });
            
            geojsonFeatures.push({
              type: 'Feature',
              properties: props,
              geometry: {
                type: 'Point',
                coordinates: [lng, lat]
              }
            });
            continue;
          }
        }
      }
    }

    // Handle LineStrings or Polygons
    const lineNodes = pm.getElementsByTagName('LineString');
    if (lineNodes.length > 0) {
      const coordEl = lineNodes[0].getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const coordsList = coordEl.textContent.trim().split(/\s+/).map(str => {
          const parts = str.split(',');
          return [parseFloat(parts[0]), parseFloat(parts[1])];
        }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

        if (coordsList.length > 0) {
          geojsonFeatures.push({
            type: 'Feature',
            properties: props,
            geometry: {
              type: 'LineString',
              coordinates: coordsList
            }
          });
        }
      }
    }

    const polyNodes = pm.getElementsByTagName('Polygon');
    if (polyNodes.length > 0) {
      const coordEl = polyNodes[0].getElementsByTagName('coordinates')[0];
      if (coordEl && coordEl.textContent) {
        const coordsList = coordEl.textContent.trim().split(/\s+/).map(str => {
          const parts = str.split(',');
          return [parseFloat(parts[0]), parseFloat(parts[1])];
        }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));

        if (coordsList.length > 0) {
          geojsonFeatures.push({
            type: 'Feature',
            properties: props,
            geometry: {
              type: 'Polygon',
              coordinates: [coordsList]
            }
          });
        }
      }
    }
  }

  let layerData = null;
  if (geojsonFeatures.length > 0) {
    layerData = {
      type: 'FeatureCollection',
      features: geojsonFeatures
    };
  }

  return { itineraryItems, layerData };
};

export default function App() {
  // --- States ---
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [mapTitle, setMapTitle] = useState('My Geospatial Project');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Map Title Styling Customizer states
  const [titleFont, setTitleFont] = useState<'Inter' | 'Georgia' | 'monospace' | 'serif' | 'sans-serif'>('Inter');
  const [titleColor, setTitleColor] = useState('#004ac6');
  const [titleSize, setTitleSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [titleStyle, setTitleStyle] = useState<'glass' | 'pill' | 'outline' | 'minimal'>('glass');

  // Sidebar toggle state
  const [showSidebar, setShowSidebar] = useState(true);

  const [printConfig, setPrintConfig] = useState<PrintConfig>({ size: 'A4', orientation: 'landscape' });
  const [fitBounds, setFitBounds] = useState<L.LatLngBounds | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [showNorthArrow, setShowNorthArrow] = useState(true);
  const [showScale, setShowScale] = useState(true);
  const [currentExtent, setCurrentExtent] = useState<L.LatLngBounds | null>(null);
  
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [mapCenterData, setMapCenterData] = useState<{ center: [number, number], zoom: number } | null>(null);

  // Search & Itinerary
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [startDate, setStartDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Undo history for itinerary
  const [itineraryHistory, setItineraryHistory] = useState<ItineraryItem[][]>([]);

  // Track the newly added stop to trigger popup open automatically on map
  const [newlyAddedStopId, setNewlyAddedStopId] = useState<string | null>(null);

  // Cache busting suffix for map tiles during print/export
  const [tileUrlSuffix, setTileUrlSuffix] = useState('');

  // Load URL-encoded project if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mapData = params.get('map') || params.get('project');
    if (mapData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(mapData))));
        if (decoded) {
          setIsReadOnly(true);
          if (decoded.title) setMapTitle(decoded.title);
          if (decoded.titleFont) setTitleFont(decoded.titleFont);
          if (decoded.titleColor) setTitleColor(decoded.titleColor);
          if (decoded.titleSize) setTitleSize(decoded.titleSize);
          if (decoded.titleStyle) setTitleStyle(decoded.titleStyle);
          if (decoded.itinerary) setItinerary(decoded.itinerary);
          if (decoded.startDate) setStartDate(decoded.startDate);
          if (decoded.layers) setLayers(decoded.layers);
          if (decoded.center && typeof decoded.zoom === 'number') {
            setMapCenterData({
              center: decoded.center,
              zoom: decoded.zoom
            });
          } else if (decoded.itinerary && decoded.itinerary.length > 0) {
            // Automatically fit bounds if no explicit center is saved
            const coords = decoded.itinerary.map((item: any) => L.latLng(item.lat, item.lng));
            const bounds = L.latLngBounds(coords).pad(0.15);
            setFitBounds(bounds);
            setFitBoundsTrigger(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error("Failed to decode share link project data:", err);
      }
    }
  }, []);

  const generateShareLink = () => {
    const copyToClipboard = (text: string) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          return Promise.resolve();
        } catch (err) {
          document.body.removeChild(textArea);
          return Promise.reject(err);
        }
      }
    };

    try {
      // Serialize current state (to keep URL small, we keep layers minimal or serializable)
      const stateToEncode = {
        title: mapTitle,
        titleFont,
        titleColor,
        titleStyle,
        titleSize,
        startDate: startDate || undefined,
        itinerary: itinerary.map(item => ({
          day: item.day,
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          type: item.type,
          elevation: item.elevation,
          duration: item.duration
        })),
        layers: layers.map(l => ({
          name: l.name,
          type: l.type,
          color: l.color,
          opacity: l.opacity,
          visible: l.visible,
          data: l.data
        })),
        center: currentExtent ? [currentExtent.getCenter().lat, currentExtent.getCenter().lng] : undefined,
        zoom: currentExtent ? 13 : undefined
      };

      const serialized = JSON.stringify(stateToEncode);
      const encoded = btoa(unescape(encodeURIComponent(serialized)));
      const shareUrl = `${window.location.origin}${window.location.pathname}?map=${encoded}`;

      if (shareUrl.length > 8192) {
        const stateWithoutLayers = {
          ...stateToEncode,
          layers: layers.map(l => ({
            name: l.name,
            type: l.type,
            color: l.color,
            opacity: l.opacity,
            visible: l.visible
          }))
        };
        const serializedSmall = JSON.stringify(stateWithoutLayers);
        const encodedSmall = btoa(unescape(encodeURIComponent(serializedSmall)));
        const shareUrlSmall = `${window.location.origin}${window.location.pathname}?map=${encodedSmall}`;
        
        copyToClipboard(shareUrlSmall)
          .then(() => {
            alert("The project custom layers are too large to package in a URL link. A link has been copied containing your itinerary and layer settings (without the custom file data).");
          })
          .catch(() => {
            window.prompt("The link is ready! Copy it from below (custom layers excluded due to size):", shareUrlSmall);
          });
        return;
      }

      copyToClipboard(shareUrl)
        .then(() => {
          alert("Shareable link copied to clipboard! Anyone with this link can view your interactive map in read-only mode.");
        })
        .catch(() => {
          window.prompt("The link is ready! Copy it from below to share your interactive map:", shareUrl);
        });
    } catch (err) {
      console.error("Failed to generate share link:", err);
      alert("Failed to generate share link. The project might be too large to encode.");
    }
  };



  const printAreaRef = useRef<HTMLDivElement>(null);

  // Save history snapshot helper
  const saveItineraryState = (currentState: ItineraryItem[]) => {
    setItineraryHistory(prev => {
      const next = [...prev, JSON.parse(JSON.stringify(currentState))];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  // Revert itinerary to previous snapshot
  const undoItinerary = () => {
    if (itineraryHistory.length === 0) return;
    setItineraryHistory(prevHistory => {
      const nextHistory = [...prevHistory];
      const previousState = nextHistory.pop();
      if (previousState) {
        setItinerary(previousState);
      }
      return nextHistory;
    });
  };

  // Keyboard shortcut listener for Ctrl+Z / Cmd+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        undoItinerary();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itineraryHistory]);

  // --- Handlers ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const addToItinerary = (
    lat: number, 
    lng: number, 
    name: string = '', 
    type: ItineraryItem['type'] = 'point',
    elevation?: number,
    duration?: number,
    distance?: number
  ) => {
    const dayStops = itinerary.filter(item => item.day === selectedDay);
    let defaultDistance = distance;
    if (defaultDistance === undefined && dayStops.length > 0) {
      const prev = dayStops[dayStops.length - 1];
      defaultDistance = parseFloat(calculateHaversineDistance(prev.lat, prev.lng, lat, lng).toFixed(1));
    }

    const id = generateUniqueId();
    const newItem: ItineraryItem = {
      id,
      day: selectedDay,
      name: name || `Stop ${dayStops.length + 1}`,
      lat,
      lng,
      type,
      distance: defaultDistance,
      elevation,
      duration
    };
    
    saveItineraryState(itinerary);
    setItinerary(prev => [...prev, newItem]);
    setNewlyAddedStopId(id);
  };

  const handleUpdateItineraryItem = (
    id: string,
    name: string,
    elevation: number | undefined,
    duration: number | undefined,
    type: ItineraryItem['type']
  ) => {
    saveItineraryState(itinerary);
    setItinerary(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name,
          elevation,
          duration,
          type
        };
      }
      return item;
    }));
    setNewlyAddedStopId(null);
  };

  const handleDeleteItineraryItem = (id: string) => {
    saveItineraryState(itinerary);
    setItinerary(prev => prev.filter(item => item.id !== id));
    setNewlyAddedStopId(null);
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    addToItinerary(e.latlng.lat, e.latlng.lng);
  };



  const addItemsToItinerary = (
    newItemsData: Array<{ 
      lat: number; 
      lng: number; 
      name?: string; 
      day?: number;
      elevation?: number; 
      duration?: number; 
      type?: ItineraryItem['type'] 
    }>
  ) => {
    saveItineraryState(itinerary);
    setItinerary(prev => {
      let currentItinerary = [...prev];
      newItemsData.forEach(itemData => {
        const targetDay = itemData.day !== undefined ? Math.min(15, Math.max(1, itemData.day)) : selectedDay;
        const dayStops = currentItinerary.filter(item => item.day === targetDay);
        let defaultDistance = undefined;
        if (dayStops.length > 0) {
          const prevStop = dayStops[dayStops.length - 1];
          defaultDistance = parseFloat(calculateHaversineDistance(prevStop.lat, prevStop.lng, itemData.lat, itemData.lng).toFixed(1));
        }
        
        const id = generateUniqueId();
        const newItem: ItineraryItem = {
          id,
          day: targetDay,
          name: itemData.name || `Stop ${dayStops.length + 1}`,
          lat: itemData.lat,
          lng: itemData.lng,
          type: itemData.type || 'point',
          distance: defaultDistance,
          elevation: itemData.elevation,
          duration: itemData.duration
        };
        currentItinerary.push(newItem);
      });
      return currentItinerary;
    });
    
    // Zoom map to fit the imported points
    if (newItemsData.length > 0) {
      const coords = newItemsData.map(item => L.latLng(item.lat, item.lng));
      const bounds = L.latLngBounds(coords).pad(0.15);
      setFitBounds(bounds);
      setFitBoundsTrigger(prev => prev + 1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsProcessingFile(true);
    try {
      const newItineraryItems: Array<{ 
        lat: number; 
        lng: number; 
        name?: string; 
        day?: number;
        elevation?: number; 
        duration?: number; 
        type?: ItineraryItem['type'] 
      }> = [];
      const newLayersList: MapLayer[] = [];

      for (const file of Array.from(files) as File[]) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (extension === 'geojson' || extension === 'json') {
          const text = await file.text();
          const data = JSON.parse(text);
          
          const features = data.type === 'FeatureCollection' ? data.features : (data.type === 'Feature' ? [data] : []);
          
          const points = features.filter((f: any) => f.geometry && f.geometry.type === 'Point');
          if (points.length > 0) {
            points.forEach((f: any) => {
              const coords = f.geometry.coordinates;
              const props = f.properties || {};
              
              const nameVal = props.name || props.place_name || props.title || props.label || props.Place_Name || props.PlaceName;
              const dayVal = props.day !== undefined ? parseInt(props.day, 10) : (props.Day !== undefined ? parseInt(props.Day, 10) : undefined);
              const elevProp = props.elevation !== undefined ? props.elevation : (props.elevation_m !== undefined ? props.elevation_m : (props.alt !== undefined ? props.alt : (props.altitude !== undefined ? props.altitude : props.elev)));
              const durProp = props.duration !== undefined ? props.duration : (props.duration_hrs !== undefined ? props.duration_hrs : (props.dur !== undefined ? props.dur : props.hours));

              newItineraryItems.push({
                lat: coords[1],
                lng: coords[0],
                name: nameVal,
                day: dayVal && !isNaN(dayVal) ? dayVal : undefined,
                elevation: elevProp !== undefined ? parseFloat(elevProp) : undefined,
                duration: durProp !== undefined ? parseFloat(durProp) : undefined,
                type: props.type || 'point'
              });
            });
          } else {
            const newLayer: MapLayer = {
              id: generateUniqueId(),
              name: file.name,
              type: 'geojson',
              data,
              visible: true,
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              opacity: 0.7
            };
            newLayersList.push(newLayer);
          }
        } else if (extension === 'kml') {
          const text = await file.text();
          const { itineraryItems, layerData } = parseKML(text);
          if (itineraryItems.length > 0) {
            newItineraryItems.push(...itineraryItems);
          }
          if (layerData) {
            const newLayer: MapLayer = {
              id: generateUniqueId(),
              name: file.name,
              type: 'geojson',
              data: layerData,
              visible: true,
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              opacity: 0.7
            };
            newLayersList.push(newLayer);
          }
        } else if (extension === 'csv') {
          await new Promise<void>((resolve, reject) => {
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                if (results.data && results.data.length > 0) {
                  const headers = Object.keys(results.data[0] || {});
                  const latCol = headers.find(h => /lat|latitude|y/i.test(h));
                  const lngCol = headers.find(h => /lon|lng|longitude|x/i.test(h));

                  if (latCol && lngCol) {
                    results.data.forEach((row: any) => {
                      const latVal = parseFloat(row[latCol]);
                      const lngVal = parseFloat(row[lngCol]);
                      if (!isNaN(latVal) && !isNaN(lngVal)) {
                        const findValue = (keys: string[]) => {
                          const matchedKey = Object.keys(row).find(k => keys.some(key => new RegExp(`^${key}$`, 'i').test(k.trim())));
                          return matchedKey ? row[matchedKey] : undefined;
                        };
                        
                        const nameVal = findValue(['name', 'place_name', 'place_names', 'title', 'label']);
                        const dayStr = findValue(['day', 'day_num', 'daynum', 'day_number']);
                        const dayVal = dayStr ? parseInt(dayStr, 10) : undefined;
                        const elevVal = findValue(['elevation', 'elevation_m', 'alt', 'altitude', 'elev']);
                        const durVal = findValue(['duration', 'duration_hrs', 'dur', 'hours']);

                        newItineraryItems.push({
                          lat: latVal,
                          lng: lngVal,
                          name: nameVal,
                          day: dayVal && !isNaN(dayVal) ? dayVal : undefined,
                          elevation: elevVal !== undefined ? parseFloat(elevVal) : undefined,
                          duration: durVal !== undefined ? parseFloat(durVal) : undefined,
                          type: row.type || row.Type || 'point'
                        });
                      }
                    });
                  }
                }
                resolve();
              },
              error: (err) => reject(err)
            });
          });
        } else if (extension === 'zip') {
          const buffer = await file.arrayBuffer();
          const data = await shp(buffer);
          const newLayer: MapLayer = {
            id: generateUniqueId(),
            name: file.name,
            type: 'geojson',
            data,
            visible: true,
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
            opacity: 0.7
          };
          newLayersList.push(newLayer);
        }
      }

      if (newItineraryItems.length > 0) {
        addItemsToItinerary(newItineraryItems);
      }
      
      if (newLayersList.length > 0) {
        setLayers(prev => [...prev, ...newLayersList]);
        const group = new L.FeatureGroup();
        newLayersList.forEach(layer => {
          try {
            const geojson = L.geoJSON(layer.data as any);
            group.addLayer(geojson);
          } catch (e) {}
        });
        setFitBounds(group.getBounds());
        setFitBoundsTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error("File processing error:", err);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const addLayer = (name: string, type: 'geojson', data: any) => {
    const newLayer: MapLayer = {
      id: generateUniqueId(),
      name,
      type,
      data,
      visible: true,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      opacity: 0.7
    };
    setLayers(prev => [...prev, newLayer]);
    
    // Zoom to fit newly added layer
    try {
      const l = L.geoJSON(data);
      setFitBounds(l.getBounds());
      setFitBoundsTrigger(prev => prev + 1);
    } catch(e) {}
  };

  const handlePrint = async () => {
    if (!printAreaRef.current) return;
    
    // Fit all itinerary points on export to ensure they are captured
    if (itinerary.length > 0) {
      const coords = itinerary.map(item => L.latLng(item.lat, item.lng));
      const bounds = L.latLngBounds(coords).pad(0.15); // 15% padding to prevent cutoffs
      setFitBounds(bounds);
      setFitBoundsTrigger(prev => prev + 1);
    }

    setIsPrinting(true);
    
    const scaleFactor = (printConfig.size === 'A1' || printConfig.size === 'A2') ? 4 : 2;

    setTimeout(async () => {
      let restoreTransforms: (() => void) | null = null;
      try {
        // Wait for web fonts (Inter, Material Symbols) to finish loading before capture
        await document.fonts.ready;

        restoreTransforms = transformToOffset();

        const canvas = await html2canvas(printAreaRef.current!, {
          useCORS: true,
          scale: scaleFactor,
          logging: false,
          backgroundColor: '#ffffff',
          ignoreElements: (el) => el.classList.contains('no-print') || el.classList.contains('leaflet-control-layers')
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const { w, h } = PAPER_SIZES[printConfig.size];
        const orientation = printConfig.orientation === 'portrait' ? 'p' : 'l';

        const pdfW = orientation === 'p' ? w : h;
        const pdfH = orientation === 'p' ? h : w;

        const pdf = new jsPDF(orientation, 'mm', [pdfW, pdfH]);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
        pdf.save(`${mapTitle.replace(/\s+/g, '_')}_${printConfig.size}.pdf`);
      } catch (err) {
        console.error("Print Error:", err);
        alert(`Export failed: ${err instanceof Error ? err.message : String(err)}. Please try again.`);
      } finally {
        if (restoreTransforms) restoreTransforms();
        setIsPrinting(false);
      }
    }, 1800);
  };

  const handlePreview = async () => {
    if (!printAreaRef.current) return;

    // Fit all itinerary points on preview
    if (itinerary.length > 0) {
      const coords = itinerary.map(item => L.latLng(item.lat, item.lng));
      const bounds = L.latLngBounds(coords).pad(0.15); // 15% padding
      setFitBounds(bounds);
      setFitBoundsTrigger(prev => prev + 1);
    }

    setIsPrinting(true);
    
    setTimeout(async () => {
      let restoreTransforms: (() => void) | null = null;
      try {
        await document.fonts.ready;

        restoreTransforms = transformToOffset();

        const canvas = await html2canvas(printAreaRef.current!, {
          useCORS: true,
          scale: 1,
          logging: false,
          backgroundColor: '#ffffff',
          ignoreElements: (el) => el.classList.contains('no-print') || el.classList.contains('leaflet-control-layers')
        });

        setPreviewUrl(canvas.toDataURL('image/png'));
        setIsPreviewing(true);
      } catch (err) {
        console.error("Preview Error:", err);
        alert(`Preview failed: ${err instanceof Error ? err.message : String(err)}. Please try again.`);
      } finally {
        if (restoreTransforms) restoreTransforms();
        setIsPrinting(false);
      }
    }, 1800);
  };

  const fitAllLayers = () => {
    if (layers.length === 0) return;
    const group = new L.FeatureGroup();
    layers.forEach(layer => {
      try {
        const geojson = L.geoJSON(layer.data as any);
        group.addLayer(geojson);
      } catch (e) {}
    });
    setFitBounds(group.getBounds());
    setFitBoundsTrigger(prev => prev + 1);
  };



  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background font-sans text-on-background">
      {/* Top Navigation Bar */}
      <TopNavBar
        mapTitle={mapTitle}
        isPrinting={isPrinting}
        onExport={handlePrint}
        isReadOnly={isReadOnly}
        onShare={generateShareLink}
        printConfig={printConfig}
        setPrintConfig={setPrintConfig}
      />

      <div className="flex flex-1 h-full min-h-0 relative">
        {/* Sidebar and active view panels */}
        {!isReadOnly && (
          <SideNavBar
            itineraryLength={itinerary.length}
            layersLength={layers.length}
            isReadOnly={isReadOnly}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
            layersPanelContent={
              <LayersPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                searchResults={searchResults}
                isSearching={isSearching}
                setSearchResults={setSearchResults}
                addToItinerary={addToItinerary}
                setMapCenterData={setMapCenterData}
                mapTitle={mapTitle}
                setMapTitle={setMapTitle}
                titleFont={titleFont}
                setTitleFont={setTitleFont}
                titleColor={titleColor}
                setTitleColor={setTitleColor}
                titleSize={titleSize}
                setTitleSize={setTitleSize}
                titleStyle={titleStyle}
                setTitleStyle={setTitleStyle}
                isProcessingFile={isProcessingFile}
                handleFileUpload={handleFileUpload}
                layers={layers}
                setLayers={setLayers}
                showLegend={showLegend}
                setShowLegend={setShowLegend}
                showNorthArrow={showNorthArrow}
                setShowNorthArrow={setShowNorthArrow}
                showScale={showScale}
                setShowScale={setShowScale}
                isReadOnly={isReadOnly}
              />
            }
            itineraryPanelContent={
              <ItineraryPanel
                itinerary={itinerary}
                setItinerary={setItinerary}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                saveHistory={() => saveItineraryState(itinerary)}
                isReadOnly={isReadOnly}
                startDate={startDate}
                setStartDate={setStartDate}
              />
            }
            printPanelContent={
              <PrintPanel
                currentExtent={currentExtent}
                printConfig={printConfig}
                setPrintConfig={setPrintConfig}
                handlePreview={handlePreview}
                handlePrint={handlePrint}
                isPrinting={isPrinting}
                fitAllLayers={fitAllLayers}
                layersCount={layers.length}
              />
            }
          />
        )}

        {/* Sidebar toggle tab — floats at the sidebar's right edge, slides with it */}
        {!isReadOnly && (
          <button
            onClick={() => setShowSidebar(prev => !prev)}
            className="hidden md:flex no-print absolute top-1/2 -translate-y-1/2 z-[1100] items-center justify-center w-5 h-14 bg-surface border border-outline-variant shadow-md rounded-r-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            style={{
              left: showSidebar ? '360px' : '0px',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              borderLeft: 'none'
            }}
            title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <Icon name={showSidebar ? 'chevron_left' : 'chevron_right'} className="text-base" />
          </button>
        )}

        {/* Map Rendering Pane */}
        <main
          className="flex-1 h-full relative" 
          ref={printAreaRef}
          style={isPrinting ? {
            ...getPrintDimensions(printConfig.orientation),
            position: 'absolute',
            left: '0',
            top: '0',
            zIndex: 100
          } : undefined}
        >
          <MapView
            mapTitle={mapTitle}
            layers={layers}
            itinerary={itinerary}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            showLegend={showLegend}
            showNorthArrow={showNorthArrow}
            showScale={showScale}
            fitBounds={fitBounds}
            fitBoundsTrigger={fitBoundsTrigger}
            isPrinting={isPrinting}
            isReadOnly={isReadOnly}
            mapCenterData={mapCenterData}
            handleMapClick={handleMapClick}
            setCurrentExtent={setCurrentExtent}
            newlyAddedStopId={newlyAddedStopId}
            onUpdateItineraryItem={handleUpdateItineraryItem}
            onDeleteItineraryItem={handleDeleteItineraryItem}
            tileUrlSuffix={tileUrlSuffix}
            titleFont={titleFont}
            titleColor={titleColor}
            titleSize={titleSize}
            titleStyle={titleStyle}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
            startDate={startDate}
          />
        </main>

        {/* Global Loading Overlay for Print Rendering */}
        <AnimatePresence>
          {isPrinting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent shadow-xl mb-4" />
              <p className="text-primary font-bold text-lg animate-pulse">Capturing High-Resolution Map...</p>
              <p className="text-on-surface-variant text-sm mt-2">Exporting as {printConfig.size} PDF</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Print Preview Modal Pop-up overlay */}
        <AnimatePresence>
          {isPreviewing && previewUrl && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[3000] bg-inverse-surface/40 backdrop-blur-md flex items-center justify-center p-8 no-print"
              onClick={() => setIsPreviewing(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface rounded-xl shadow-2xl max-h-[92vh] max-w-5xl w-full flex flex-col border border-outline-variant"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-full p-6 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
                  <div>
                    <h3 className="text-section-header text-on-surface">Print Preview</h3>
                    <p className="text-body-sm text-on-surface-variant">{printConfig.size} ({printConfig.orientation})</p>
                  </div>
                  <button
                    onClick={() => setIsPreviewing(false)}
                    className="p-2 hover:bg-surface-container-high rounded-full transition"
                  >
                    <Icon name="close" className="text-xl text-on-surface-variant" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-surface-container w-full flex justify-center items-start">
                  <div
                    className="bg-surface shadow-2xl relative border border-outline-variant"
                    style={{
                      aspectRatio: printConfig.orientation === 'portrait'
                        ? `${PAPER_SIZES[printConfig.size].w} / ${PAPER_SIZES[printConfig.size].h}`
                        : `${PAPER_SIZES[printConfig.size].h} / ${PAPER_SIZES[printConfig.size].w}`,
                      width: '100%',
                      maxWidth: '900px'
                    }}
                  >
                    <img src={previewUrl} alt="Map Preview" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="w-full p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
                  <button 
                    onClick={() => setIsPreviewing(false)}
                    className="px-6 py-2.5 text-body-main font-bold text-on-surface hover:bg-surface-container transition rounded-md"
                  >
                    CLOSE
                  </button>
                  <button 
                    onClick={() => {
                      setIsPreviewing(false);
                      handlePrint();
                    }}
                    className="px-8 py-2.5 bg-primary text-on-primary rounded-md text-body-main font-bold hover:bg-primary/95 shadow-md transition flex items-center gap-2"
                  >
                    <Icon name="download" className="text-lg" /> 
                    <span>DOWNLOAD PDF</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
