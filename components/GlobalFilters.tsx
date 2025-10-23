'use client';

import { useState, useEffect } from 'react';

interface DestinationServer {
  id: number;
  name: string;
  color: string;
}

interface GlobalFiltersProps {
  timeRange: number;
  onTimeRangeChange: (timeRange: number) => void;
  selectedServers: number[];
  onSelectedServersChange: (servers: number[]) => void;
  showServerFilter?: boolean;
}

export default function GlobalFilters({ 
  timeRange, 
  onTimeRangeChange, 
  selectedServers, 
  onSelectedServersChange,
  showServerFilter = true 
}: GlobalFiltersProps) {
  const [destinationServers, setDestinationServers] = useState<DestinationServer[]>([]);

  // Fetch destination servers
  useEffect(() => {
    const fetchDestinationServers = async () => {
      try {
        const response = await fetch('/api/servers');
        if (response.ok) {
          const data = await response.json();
          const servers: DestinationServer[] = data.servers.map((server: any) => ({
            id: server.id,
            name: server.name,
            color: server.color
          }));
          setDestinationServers(servers);
          // Select all servers by default if none are selected
          if (selectedServers.length === 0) {
            onSelectedServersChange(servers.map(s => s.id));
          }
        }
      } catch (error) {
        console.error('Error fetching destination servers:', error);
      }
    };

    if (showServerFilter) {
      fetchDestinationServers();
    }
  }, [showServerFilter, selectedServers.length, onSelectedServersChange]);

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
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4" dir="rtl">
      <div className="flex flex-col gap-4">
        {/* Time Range Filter - First Row */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">بازه زمانی:</span>
          <div className="flex gap-1">
            {[1, 3, 6, 12, 24].map(hours => (
              <button
                key={hours}
                onClick={() => onTimeRangeChange(hours)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  timeRange === hours
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {hours}ساعت
              </button>
            ))}
          </div>
        </div>

        {/* Server Filter - Second Row */}
        {showServerFilter && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">فیلتر سرورها:</span>
            <div className="flex gap-1">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                همه
              </button>
              <button
                onClick={handleSelectNone}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                هیچکدام
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {destinationServers.map(server => (
                <button
                  key={server.id}
                  onClick={() => handleServerToggle(server.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-all ${
                    selectedServers.includes(server.id)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: server.color }}
                  ></div>
                  {server.name}
                </button>
              ))}
            </div>
            {selectedServers.length === 0 && (
              <span className="text-xs text-orange-600">هیچ سروری انتخاب نشده</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
