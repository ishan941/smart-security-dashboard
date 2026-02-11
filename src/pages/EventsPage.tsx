/**
 * Events Page — Full event log with filtering
 */
import { useState, useEffect, useCallback } from "react";
import { eventsApi, Event } from "../services/api";
import { io } from "socket.io-client";
import { Search, RefreshCw, Filter } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset: page * limit };
      if (deviceFilter) params.deviceId = deviceFilter;
      if (typeFilter) params.eventType = typeFilter;

      const res = await eventsApi.getAll(params);
      setEvents(res.data.events);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceFilter, typeFilter, page]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("newEvent", (event: Event) => {
      // Only append if it matches current filters and we're on page 0
      const matchesDevice =
        !deviceFilter ||
        event.deviceId.toLowerCase().includes(deviceFilter.toLowerCase());
      const matchesType = !typeFilter || event.eventType === typeFilter;

      if (matchesDevice && matchesType && page === 0) {
        setEvents((prev) => [event, ...prev].slice(0, limit));
        setTotal((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceFilter, typeFilter, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Log</h1>
          <p className="text-gray-500 mt-1">
            {total} total events • Updated in real-time
          </p>
        </div>
        <button
          onClick={loadEvents}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by device ID..."
            value={deviceFilter}
            onChange={(e) => {
              setDeviceFilter(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">All Types</option>
            <option value="ACCESS_GRANTED">Access Granted</option>
            <option value="ACCESS_DENIED">Access Denied</option>
            <option value="SENSOR_ALERT">Sensor Alert</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Card ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No events found
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <EventBadge type={event.eventType} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {event.deviceId}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      {event.cardId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    ACCESS_GRANTED: "bg-green-100 text-green-700",
    ACCESS_DENIED: "bg-red-100 text-red-700",
    SENSOR_ALERT: "bg-orange-100 text-orange-700",
  };

  const labels: Record<string, string> = {
    ACCESS_GRANTED: "✓ Granted",
    ACCESS_DENIED: "✗ Denied",
    SENSOR_ALERT: "⚠ Alert",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[type] || "bg-gray-100 text-gray-700"
      }`}
    >
      {labels[type] || type}
    </span>
  );
}
