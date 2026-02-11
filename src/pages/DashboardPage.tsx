/**
 * Dashboard Page — Overview with stats cards and recent events
 */
import { useState, useEffect } from "react";
import { eventsApi, Event, EventStats } from "../services/api";
import { io } from "socket.io-client";
import {
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Activity,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Connect to WebSocket for real-time updates
    // In dev, connect to localhost:3000 or the local IP
    const socket = io("http://localhost:3000");

    socket.on("connect", () => {
      console.log("Connected to real-time events gateway");
    });

    socket.on("newEvent", (event: Event) => {
      console.log("New event received via WebSocket:", event);

      // Update recent events list instantly
      setRecentEvents((prev) => [event, ...prev].slice(0, 10));

      // Increment stats locally for instant feedback
      setStats((prev) => {
        if (!prev) return null;
        const newStats = {
          ...prev,
          totalEvents: prev.totalEvents + 1,
          todayEvents: prev.todayEvents + 1,
        };
        if (event.eventType === "ACCESS_GRANTED") newStats.accessGranted++;
        if (event.eventType === "ACCESS_DENIED") newStats.accessDenied++;
        if (event.eventType === "SENSOR_ALERT") newStats.sensorAlerts++;
        return newStats;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes] = await Promise.all([
        eventsApi.getStats(),
        eventsApi.getAll({ limit: 10 }),
      ]);
      setStats(statsRes.data);
      setRecentEvents(eventsRes.data.events);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Security system overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Total Events"
          value={stats?.totalEvents ?? 0}
          color="blue"
        />
        <StatCard
          icon={<ShieldCheck className="w-6 h-6" />}
          label="Access Granted"
          value={stats?.accessGranted ?? 0}
          color="green"
        />
        <StatCard
          icon={<ShieldX className="w-6 h-6" />}
          label="Access Denied"
          value={stats?.accessDenied ?? 0}
          color="red"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Sensor Alerts"
          value={stats?.sensorAlerts ?? 0}
          color="orange"
        />
      </div>

      {/* Today highlight */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-600" />
        <span className="text-blue-800 font-medium">
          {stats?.todayEvents ?? 0} events today
        </span>
      </div>

      {/* Recent Events Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
        </div>
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
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-400"
                  >
                    No events recorded yet. Connect your ESP32 to get started.
                  </td>
                </tr>
              ) : (
                recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <EventBadge type={event.eventType} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {event.deviceId}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      {event.cardId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "green" | "red" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
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
    ACCESS_GRANTED: "Granted",
    ACCESS_DENIED: "Denied",
    SENSOR_ALERT: "Alert",
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
