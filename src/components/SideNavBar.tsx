import { useState, ReactNode } from 'react';
import Icon from './Icon';

interface SideNavBarProps {
  itineraryLength: number;
  layersLength: number;
  layersPanelContent: ReactNode;
  itineraryPanelContent: ReactNode;
  printPanelContent: ReactNode;
  isReadOnly?: boolean;
  showSidebar?: boolean;
  setShowSidebar?: (show: boolean) => void;
}

export default function SideNavBar({
  itineraryLength,
  layersLength,
  layersPanelContent,
  itineraryPanelContent,
  printPanelContent,
  isReadOnly = false,
  showSidebar = true,
  setShowSidebar
}: SideNavBarProps) {
  const [isMapSetupExpanded, setIsMapSetupExpanded] = useState(true);
  const [isDayPlannerExpanded, setIsDayPlannerExpanded] = useState(true);
  const [isPrintExpanded, setIsPrintExpanded] = useState(false);

  return (
    <aside className={`sidebar-responsive flex flex-col bg-surface border-r border-outline-variant select-none no-print ${!showSidebar ? 'sidebar-hidden' : ''}`}>
      {/* Mobile Drawer Header */}
      {!isReadOnly && setShowSidebar && (
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-outline-variant/30 bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="explore" className="text-primary text-base" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface">Itinerary Planner</span>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition"
            title="Close Drawer"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>
      )}
      
      {/* 1. Map Setup Collapsible Accordion */}
      <div className="border-b border-outline-variant flex flex-col min-h-0">
        <button
          onClick={() => setIsMapSetupExpanded(!isMapSetupExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="settings_input_component" className="text-lg text-primary" />
            <span className="text-section-header text-on-surface font-semibold">Map Setup</span>
          </div>
          <Icon 
            name={isMapSetupExpanded ? "expand_less" : "expand_more"} 
            className="text-on-surface-variant transition-transform" 
          />
        </button>
        {isMapSetupExpanded && (
          <div className="max-h-[35vh] overflow-y-auto border-t border-outline-variant/30 flex flex-col">
            {layersPanelContent}
          </div>
        )}
      </div>

      {/* 2. Day Planner Collapsible Accordion */}
      <div className="border-b border-outline-variant flex flex-col min-h-0">
        <button
          onClick={() => setIsDayPlannerExpanded(!isDayPlannerExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="calendar_today" className="text-lg text-primary" />
            <span className="text-section-header text-on-surface font-semibold">Day Planner</span>
            {itineraryLength > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary text-on-primary">
                {itineraryLength}
              </span>
            )}
          </div>
          <Icon 
            name={isDayPlannerExpanded ? "expand_less" : "expand_more"} 
            className="text-on-surface-variant transition-transform" 
          />
        </button>
        {isDayPlannerExpanded && (
          <div className="max-h-[35vh] overflow-y-auto border-t border-outline-variant/30 flex flex-col">
            {itineraryPanelContent}
          </div>
        )}
      </div>

      {/* 3. Print & Export Collapsible Accordion */}
      <div className="border-b border-outline-variant flex flex-col min-h-0">
        <button
          onClick={() => setIsPrintExpanded(!isPrintExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container transition text-left"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="print" className="text-lg text-primary" />
            <span className="text-section-header text-on-surface font-semibold">Print & Export</span>
          </div>
          <Icon 
            name={isPrintExpanded ? "expand_less" : "expand_more"} 
            className="text-on-surface-variant transition-transform" 
          />
        </button>
        {isPrintExpanded && (
          <div className="max-h-[35vh] overflow-y-auto border-t border-outline-variant/30 flex flex-col">
            {printPanelContent}
          </div>
        )}
      </div>

    </aside>
  );
}
