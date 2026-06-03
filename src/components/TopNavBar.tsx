import Icon from './Icon';

interface TopNavBarProps {
  mapTitle: string;
  isPrinting: boolean;
  onExport: () => void;
  isReadOnly?: boolean;
  onShare?: () => void;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopNavBar({ 
  mapTitle, 
  isPrinting, 
  onExport, 
  isReadOnly = false, 
  onShare,
  showSidebar = true,
  onToggleSidebar
}: TopNavBarProps) {
  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-outline-variant bg-surface select-none no-print">
      {/* Left side: App Logo, Title and Drawer Toggle */}
      <div className="flex items-center gap-3">
        {!isReadOnly && onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-surface-container-high rounded-md transition text-on-surface-variant hover:text-on-surface mr-1"
            title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
          >
            <Icon name={showSidebar ? "menu_open" : "menu"} className="text-xl" />
          </button>
        )}
        
        <a 
          href={isReadOnly ? (window.location.origin + window.location.pathname) : undefined}
          className={`flex items-center gap-3 ${isReadOnly ? 'hover:opacity-85 cursor-pointer transition' : ''}`}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary-container text-on-primary-container">
            <Icon name="explore" className="text-xl text-primary" />
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

      {/* Middle side: Current Map Title */}
      <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container border border-outline-variant max-w-sm truncate">
        <Icon name="map" className="text-body-main text-on-surface-variant" />
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
        
        <button 
          onClick={onExport}
          disabled={isPrinting}
          className="flex items-center gap-1.5 px-4 py-1.5 text-body-sm font-semibold bg-primary text-on-primary rounded-md hover:bg-primary/95 transition disabled:opacity-50 shadow-sm"
        >
          {isPrinting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent" />
          ) : (
            <Icon name="download" className="text-lg" />
          )}
          <span>Export PDF</span>
        </button>

        {!isReadOnly && (
          <button 
            className="flex items-center justify-center p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-md transition"
            title="Save Project"
            onClick={() => alert("Project saved successfully!")}
          >
            <Icon name="save" className="text-xl" />
          </button>
        )}
      </div>
    </header>
  );
}
