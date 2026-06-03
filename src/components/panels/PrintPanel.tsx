import React from 'react';
import Icon from '../Icon';
import L from 'leaflet';

export interface PrintConfig {
  size: 'A1' | 'A2' | 'A3' | 'A4' | 'A5';
  orientation: 'portrait' | 'landscape';
}

interface PrintPanelProps {
  currentExtent: L.LatLngBounds | null;
  printConfig: PrintConfig;
  setPrintConfig: React.Dispatch<React.SetStateAction<PrintConfig>>;
  handlePreview: () => void;
  handlePrint: () => void;
  isPrinting: boolean;
  fitAllLayers: () => void;
  layersCount: number;
}

export default function PrintPanel({
  currentExtent,
  printConfig,
  setPrintConfig,
  handlePreview,
  handlePrint,
  isPrinting,
  fitAllLayers,
  layersCount,
}: PrintPanelProps) {
  const paperSizes = ['A1', 'A2', 'A3', 'A4', 'A5'] as const;

  return (
    <div className="p-4 space-y-6 flex-1 flex flex-col overflow-y-auto">
      {/* 1. Map Extent Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Map Extent (Coordinates)</span>
          <button
            onClick={fitAllLayers}
            disabled={layersCount === 0}
            className="text-body-sm font-semibold text-primary hover:text-primary-container disabled:opacity-50 flex items-center gap-1"
          >
            <Icon name="zoom_in_map" className="text-base" />
            <span>Fit Data</span>
          </button>
        </div>

        {currentExtent ? (
          <div className="bg-surface-container-low p-3.5 rounded-lg border border-outline-variant font-mono text-body-sm text-on-surface-variant space-y-1.5 shadow-inner">
            <div className="flex justify-between">
              <span className="font-semibold">North:</span>
              <span className="text-on-surface">{currentExtent.getNorth().toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">South:</span>
              <span className="text-on-surface">{currentExtent.getSouth().toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">East:</span>
              <span className="text-on-surface">{currentExtent.getEast().toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">West:</span>
              <span className="text-on-surface">{currentExtent.getWest().toFixed(4)}°</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-surface-container-low border border-outline-variant text-center rounded-lg text-body-sm text-on-surface-variant italic">
            Zoom or move map to update coordinates
          </div>
        )}
      </div>

      {/* 2. Paper Size Config Card */}
      <div className="space-y-3">
        <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Paper Size</span>
        <div className="grid grid-cols-3 gap-2">
          {paperSizes.map((size) => {
            const isActive = printConfig.size === size;
            return (
              <button
                key={size}
                onClick={() => setPrintConfig({ ...printConfig, size })}
                className={`py-3 rounded-md font-bold text-body-main border transition ${
                  isActive
                    ? 'border-primary bg-primary-container/20 text-primary shadow-sm'
                    : 'border-outline-variant bg-surface hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Orientation Selection */}
      <div className="space-y-3">
        <span className="text-label-caps text-on-surface-variant font-semibold tracking-wider">Orientation</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPrintConfig({ ...printConfig, orientation: 'portrait' })}
            className={`flex-1 py-3 rounded-md font-semibold text-body-main border transition flex items-center justify-center gap-1.5 ${
              printConfig.orientation === 'portrait'
                ? 'border-primary bg-primary-container/20 text-primary shadow-sm'
                : 'border-outline-variant bg-surface hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="portrait" className="text-lg" />
            <span>Portrait</span>
          </button>
          <button
            onClick={() => setPrintConfig({ ...printConfig, orientation: 'landscape' })}
            className={`flex-1 py-3 rounded-md font-semibold text-body-main border transition flex items-center justify-center gap-1.5 ${
              printConfig.orientation === 'landscape'
                ? 'border-primary bg-primary-container/20 text-primary shadow-sm'
                : 'border-outline-variant bg-surface hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name="landscape" className="text-lg" />
            <span>Landscape</span>
          </button>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-3 pt-4 border-t border-outline-variant">
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={isPrinting}
            className="flex-1 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition disabled:opacity-50 text-body-main"
          >
            <Icon name="photo_camera" className="text-lg" />
            <span>Preview</span>
          </button>
          
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-[2] bg-primary text-on-primary hover:bg-primary/95 font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md text-body-main"
          >
            {isPrinting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
            ) : (
              <Icon name="picture_as_pdf" className="text-lg" />
            )}
            <span>Export PDF</span>
          </button>
        </div>

        {/* Warning Notification Alert banner */}
        <div className="p-3 bg-surface-container-low border border-outline-variant rounded-md flex gap-2.5">
          <Icon name="info" className="text-primary text-xl shrink-0 mt-0.5" />
          <span className="text-body-sm text-on-surface-variant leading-relaxed">
            Exports capture high-resolution 300 DPI vector map frames. Do not pan or zoom the viewport during the render sequence.
          </span>
        </div>
      </div>
    </div>
  );
}
