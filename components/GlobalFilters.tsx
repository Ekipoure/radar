'use client';

import { useState, useEffect, useRef } from 'react';

interface DestinationServer {
  id: number;
  name: string;
  color: string;
}

interface GlobalFiltersProps {
  selectedServers: number[];
  onSelectedServersChange: (servers: number[]) => void;
  showServerFilter?: boolean;
}

export default function GlobalFilters({ 
  selectedServers, 
  onSelectedServersChange,
  showServerFilter = true 
}: GlobalFiltersProps) {
  const [destinationServers, setDestinationServers] = useState<DestinationServer[]>([]);
  const hasInitializedRef = useRef(false);

  // Fetch destination servers from public API (no authentication required)
  useEffect(() => {
    const fetchDestinationServers = async () => {
      try {
        const response = await fetch('/api/public/servers');
        if (response.ok) {
          const data = await response.json();
          const servers: DestinationServer[] = data.servers.map((server: any) => ({
            id: server.id,
            name: server.name,
            color: server.color
          }));
          setDestinationServers(servers);
        }
      } catch (error) {
        console.error('Error fetching destination servers:', error);
      }
    };

    if (showServerFilter) {
      fetchDestinationServers();
    }
  }, [showServerFilter]);

  // Initialize selection only once when servers are first loaded
  useEffect(() => {
    if (destinationServers.length > 0 && !hasInitializedRef.current && selectedServers.length === 0) {
      hasInitializedRef.current = true;
      onSelectedServersChange(destinationServers.map(s => s.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationServers.length]);

  // Handle server selection
  const handleServerToggle = (serverId: number) => {
    const newSelection = selectedServers.includes(serverId)
      ? selectedServers.filter(id => id !== serverId)
      : [...selectedServers, serverId];
    onSelectedServersChange(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    onSelectedServersChange(destinationServers.map(s => s.id));
  };

  const handleSelectNone = () => {
    onSelectedServersChange([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4" dir="rtl">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Server Filter */}
        {showServerFilter && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">فیلتر سایت:</span>
              <div className="flex gap-1">
                <button
                  onClick={handleSelectAll}
                  className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 whitespace-nowrap"
                >
                  همه
                </button>
                <button
                  onClick={handleSelectNone}
                  className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap"
                >
                  هیچکدام
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 min-w-0">
              {destinationServers.map(server => (
                <button
                  key={server.id}
                  onClick={() => handleServerToggle(server.id)}
                  className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs rounded border transition-all whitespace-nowrap ${
                    selectedServers.includes(server.id)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div 
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: server.color }}
                  ></div>
                  <span className="truncate max-w-[80px] sm:max-w-none">{server.name}</span>
                </button>
              ))}
            </div>
            {selectedServers.length === 0 && (
              <span className="text-[10px] sm:text-xs text-orange-600 whitespace-nowrap">هیچ سروری انتخاب نشده</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
