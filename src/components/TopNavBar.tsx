import { useState } from 'react';
// @ts-ignore
import compassImg from '../public/illustration-compass_53876-18111-removebg-preview.png';
import Icon from './Icon';

interface TopNavBarProps {
  mapTitle: string;
  isPrinting: boolean;
  onExport: () => void;
  isReadOnly?: boolean;
  onShare?: () => void;
  printConfig: { size: 'A1' | 'A2' | 'A3' | 'A4' | 'A5'; orientation: 'portrait' | 'landscape' };
  setPrintConfig: React.Dispatch<React.SetStateAction<{ size: 'A1' | 'A2' | 'A3' | 'A4' | 'A5'; orientation: 'portrait' | 'landscape' }>>;
}

export default function TopNavBar({
  mapTitle,
  isPrinting,
  onExport,
  isReadOnly = false,
  onShare,
  printConfig,
  setPrintConfig
}: TopNavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-[1050] h-16 shrink-0 flex items-center justify-between px-6 border-b border-outline-variant bg-surface select-none no-print">
      {/* Left side: App Logo and Title */}
      <div className="flex items-center gap-3">
        <a
          href={isReadOnly ? (window.location.origin + window.location.pathname) : undefined}
          className={`flex items-center gap-3 ${isReadOnly ? 'hover:opacity-85 cursor-pointer transition' : ''}`}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary-container text-on-primary-container overflow-hidden">
            <img src={compassImg} alt="Itinerary Planner" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-display-title text-primary leading-none">Itinerary Planner</span>
              {isReadOnly && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-secondary-container text-on-secondary-container border border-outline-variant shadow-sm uppercase tracking-wider select-none">
                  View Only
                </span>
              )}
            </div>
            <span className="text-body-sm text-on-surface-variant font-medium">Precision Map Builder</span>
          </div>
        </a>
      </div>

      {/* Middle: Current Map Title */}
      <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant max-w-sm truncate">
        <Icon name="map" className="text-body-sm text-on-surface-variant" />
        <span className="text-body-sm font-semibold text-on-surface truncate">{mapTitle}</span>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        {isReadOnly && (
          <a
            href={window.location.origin + window.location.pathname}
            className="flex items-center gap-1.5 px-4 py-1.5 text-body-sm font-semibold bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-md transition shadow-sm mr-2"
          >
            <Icon name="add" className="text-lg" />
            <span>Create Itinerary</span>
          </a>
        )}

        {!isReadOnly && onShare && (
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-semibold text-primary rounded-md hover:bg-secondary-container/50 transition"
            onClick={onShare}
          >
            <Icon name="share" className="text-lg" />
            <span>Share</span>
          </button>
        )}
        
        <div className="relative">
          <button 
            type="button"
            onClick={() => setMenuOpen(prev => !prev)}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-body-sm font-semibold bg-primary text-on-primary rounded-md hover:bg-primary/95 transition disabled:opacity-50 shadow-sm"
          >
            {isPrinting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
            ) : (
              <Icon name="download" className="text-lg" />
            )}
            <span>Export PDF</span>
            <Icon name="keyboard_arrow_down" className="text-sm ml-0.5" />
          </button>

          {menuOpen && (
            <div 
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4 flex flex-col gap-4 z-50 text-left text-xs text-gray-700"
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Paper Size</span>
                <div className="grid grid-cols-5 gap-1">
                  {(['A1', 'A2', 'A3', 'A4', 'A5'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPrintConfig(prev => ({ ...prev, size }))}
                      className={`py-1 rounded font-bold text-center border transition ${printConfig.size === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Orientation</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['portrait', 'landscape'] as const).map(orient => (
                    <button
                      key={orient}
                      type="button"
                      onClick={() => setPrintConfig(prev => ({ ...prev, orientation: orient }))}
                      className={`py-1.5 rounded font-bold text-center border capitalize flex items-center justify-center gap-1 transition ${printConfig.orientation === orient ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                    >
                      <Icon name={orient === 'portrait' ? 'portrait' : 'landscape'} className="text-sm" />
                      <span className="ml-1">{orient}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onExport();
                  setTimeout(() => setMenuOpen(false), 100);
                }}
                disabled={isPrinting}
                className="w-full py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
              >
                <Icon name="download" className="text-base" />
                <span>Generate PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
