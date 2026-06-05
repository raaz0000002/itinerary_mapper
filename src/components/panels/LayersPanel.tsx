import { ChangeEvent, Dispatch, SetStateAction } from 'react';
import Icon from '../Icon';

export interface MapLayer {
  id: string;
  name: string;
  type: 'geojson' | 'csv' | 'shp';
  data: unknown;
  visible: boolean;
  color: string;
  opacity: number;
}

export interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface LayersPanelProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  handleSearch: () => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  setSearchResults: (res: SearchResult[]) => void;
  addToItinerary: (lat: number, lng: number, name: string) => void;
  setMapCenterData: (data: { center: [number, number]; zoom: number } | null) => void;
  mapTitle: string;
  setMapTitle: (val: string) => void;
  titleFont?: 'Inter' | 'Georgia' | 'monospace' | 'serif' | 'sans-serif';
  setTitleFont?: (font: 'Inter' | 'Georgia' | 'monospace' | 'serif' | 'sans-serif') => void;
  titleColor?: string;
  setTitleColor?: (color: string) => void;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  setTitleSize?: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  titleStyle?: 'glass' | 'pill' | 'outline' | 'minimal';
  setTitleStyle?: (style: 'glass' | 'pill' | 'outline' | 'minimal') => void;
  isProcessingFile: boolean;
  handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  layers: MapLayer[];
  setLayers: Dispatch<SetStateAction<MapLayer[]>>;
  showLegend: boolean;
  setShowLegend: (show: boolean) => void;
  showNorthArrow: boolean;
  setShowNorthArrow: (show: boolean) => void;
  showScale: boolean;
  setShowScale: (show: boolean) => void;
  isReadOnly?: boolean;
}

export default function LayersPanel({
  searchQuery,
  setSearchQuery,
  handleSearch,
  searchResults,
  isSearching,
  setSearchResults,
  addToItinerary,
  setMapCenterData,
  mapTitle,
  setMapTitle,
  titleFont = 'Inter',
  setTitleFont,
  titleColor = '#004ac6',
  setTitleColor,
  titleSize = 'md',
  setTitleSize,
  titleStyle = 'glass',
  setTitleStyle,
  isProcessingFile,
  handleFileUpload,
  layers,
  setLayers,
  showLegend,
  setShowLegend,
  showNorthArrow,
  setShowNorthArrow,
  showScale,
  setShowScale,
  isReadOnly = false,
}: LayersPanelProps) {
  return (
    <div className="p-4 space-y-6 flex-1 flex flex-col overflow-y-auto">
      {/* 1. Search Places */}
      {!isReadOnly && (
        <div className="space-y-2">
          <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Search Places</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Icon name="search" className="text-lg text-on-surface-variant" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-3 py-2 text-body-main bg-surface-container-low border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Search your Destinations..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="flex items-center justify-center p-2 bg-primary text-on-primary rounded-md hover:bg-primary-container hover:text-on-primary-container transition disabled:opacity-50"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-on-primary border-t-transparent" />
              ) : (
                <Icon name="chevron_right" className="text-xl" />
              )}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-outline-variant rounded-md bg-surface-container-lowest shadow-lg">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const lat = parseFloat(res.lat);
                    const lon = parseFloat(res.lon);
                    setMapCenterData({ center: [lat, lon], zoom: 14 });
                    addToItinerary(lat, lon, res.display_name.split(',')[0]);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-container text-body-sm text-on-surface border-b border-outline-variant/30 last:border-0 truncate"
                >
                  {res.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Map Title */}
      <div className="space-y-2.5">
        <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Map Title</span>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <Icon name="title" className="text-lg text-on-surface-variant" />
          </div>
          <input
            type="text"
            value={mapTitle}
            onChange={(e) => setMapTitle(e.target.value)}
            disabled={isReadOnly}
            className="w-full pl-9 pr-3 py-2 text-body-main bg-surface-container-low border border-outline-variant rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition disabled:opacity-75 disabled:cursor-not-allowed"
            placeholder="Name your map project..."
          />
        </div>

        {/* Style Customizer */}
        {!isReadOnly && setTitleFont && setTitleColor && setTitleSize && setTitleStyle && (
          <div className="p-3 bg-surface-container-low border border-outline-variant rounded-lg space-y-3 shadow-inner">
            <div className="flex items-center gap-1.5 text-body-sm font-semibold text-on-surface-variant border-b border-outline-variant/30 pb-1.5">
              <Icon name="palette" className="text-base text-primary" />
              <span>Title Customizer</span>
            </div>

            {/* Font Family selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Font Family</label>
              <select
                value={titleFont}
                onChange={(e) => setTitleFont(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface outline-none focus:border-primary"
              >
                <option value="Inter">Inter (Modern Sans)</option>
                <option value="Georgia">Georgia (Classic Serif)</option>
                <option value="monospace">Monospace (Tech/Data)</option>
                <option value="serif">Times / Serif</option>
                <option value="sans-serif">System Sans-Serif</option>
              </select>
            </div>

            {/* Frame Style & Size Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Size</label>
                <div className="grid grid-cols-4 gap-0.5 bg-surface-container-lowest border border-outline-variant rounded p-0.5">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTitleSize(size)}
                      className={`py-1 text-[9px] font-bold rounded transition capitalize ${
                        titleSize === size
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Design Frame</label>
                <select
                  value={titleStyle}
                  onChange={(e) => setTitleStyle(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded text-xs text-on-surface outline-none focus:border-primary"
                >
                  <option value="glass">Glassmorphic</option>
                  <option value="pill">Pill Frame</option>
                  <option value="outline">Outlined</option>
                  <option value="minimal">Minimal (No Box)</option>
                </select>
              </div>
            </div>

            {/* Custom Color Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={titleColor}
                  onChange={(e) => setTitleColor(e.target.value)}
                  className="w-7 h-7 rounded border border-outline-variant cursor-pointer p-0 bg-transparent shrink-0"
                  title="Choose Custom Color"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    { color: '#004ac6', name: 'Stitch Blue' },
                    { color: '#191b23', name: 'Dark Slate' },
                    { color: '#1b5e20', name: 'Forest Green' },
                    { color: '#e64a19', name: 'Sunset Red' },
                    { color: '#b71c1c', name: 'Crimson' },
                    { color: '#ffb300', name: 'Amber' },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setTitleColor(preset.color)}
                      style={{ backgroundColor: preset.color }}
                      className={`w-5 h-5 rounded-full border border-white shadow-sm hover:scale-110 transition shrink-0 ${
                        titleColor.toLowerCase() === preset.color.toLowerCase() ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Import Data */}
      {!isReadOnly && (
        <div className="space-y-2">
          <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Import Geospatial Data</span>
          <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low hover:bg-surface-container-high transition-all group disabled:opacity-50">
            <div className="flex flex-col items-center justify-center p-4">
              {isProcessingFile ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mb-2" />
              ) : (
                <Icon name="upload_file" className="mb-1 text-2xl text-on-surface-variant group-hover:text-primary transition" />
              )}
              <span className="text-body-main font-semibold text-on-surface">Click to Upload Files</span>
              <span className="text-body-sm text-on-surface-variant mt-0.5">GeoJSON, KML, Shapefile (ZIP), or CSV</span>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              onChange={handleFileUpload}
              accept=".json,.geojson,.zip,.csv,.kml"
              disabled={isProcessingFile}
            />
          </label>
        </div>
      )}

      {/* 4. Active Layers List */}
      <div className="space-y-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Data Layers ({layers.length})</span>
          {layers.length > 0 && !isReadOnly && (
            <button
              onClick={() => setLayers([])}
              className="text-body-sm font-semibold text-error hover:text-error-container transition"
            >
              Clear All
            </button>
          )}
        </div>

        {layers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-surface-container-low rounded-lg border border-outline-variant/50">
            <Icon name="layers_clear" className="text-3xl text-on-surface-variant mb-2" />
            <span className="text-body-sm font-semibold text-on-surface">No layers loaded</span>
            <span className="text-body-sm text-on-surface-variant mt-0.5">Upload data above to begin</span>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto pr-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className="p-3 bg-surface-container-lowest border border-outline-variant rounded-md space-y-2 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-main font-semibold text-on-surface truncate pr-2" title={layer.name}>
                    {layer.name}
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={() => setLayers(layers.filter((l) => l.id !== layer.id))}
                      className="p-1 text-on-surface-variant hover:text-error rounded transition"
                    >
                      <Icon name="close" className="text-lg" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) =>
                      setLayers(
                        layers.map((l) => (l.id === layer.id ? { ...l, color: e.target.value } : l))
                      )
                    }
                    className="w-7 h-7 rounded border border-outline-variant cursor-pointer p-0 bg-transparent shrink-0"
                  />
                  <div className="flex-1 flex flex-col">
                    <span className="text-body-sm text-on-surface-variant font-medium">Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={layer.opacity}
                      onChange={(e) =>
                        setLayers(
                          layers.map((l) => (l.id === layer.id ? { ...l, opacity: parseFloat(e.target.value) } : l))
                        )
                      }
                      className="h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary mt-1"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setLayers(
                        layers.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                      )
                    }
                    className={`p-1.5 rounded transition ${
                      layer.visible
                        ? 'text-primary bg-primary-container'
                        : 'text-on-surface-variant bg-surface-container-high'
                    }`}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    <Icon name={layer.visible ? 'visibility' : 'visibility_off'} className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Map Components Toggle */}
      <div className="space-y-2 border-t border-outline-variant pt-4 shrink-0">
        <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Map Elements</span>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Legend', state: showLegend, setState: setShowLegend },
            { label: 'North Arrow', state: showNorthArrow, setState: setShowNorthArrow },
            { label: 'Scale', state: showScale, setState: setShowScale },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => item.setState(!item.state)}
              className={`px-3 py-1.5 rounded-full text-body-sm font-semibold transition ${
                item.state
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
