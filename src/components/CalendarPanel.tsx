import React, { useEffect, useState } from "react";
import { listGoogleCalendarEvents } from "../googleCalendar";
import { CalendarEvent } from "../types";
import { Calendar, RefreshCw, Clock, Tag, ExternalLink } from "lucide-react";

interface CalendarPanelProps {
  googleToken: string | null;
  onQuickaddTask?: (title: string, duration?: number) => void;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  googleToken,
  onQuickaddTask,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayEvents = async () => {
    if (!googleToken) return;
    setLoading(true);
    setError(null);

    try {
      // Calculate start and end of TODAY
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const items = await listGoogleCalendarEvents(
        googleToken,
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      setEvents(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sync calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      fetchTodayEvents();
    } else {
      setEvents([]);
    }
  }, [googleToken]);

  const formatEventTime = (event: CalendarEvent) => {
    const startVal = event.start.dateTime || event.start.date;
    const endVal = event.end.dateTime || event.end.date;
    if (!startVal) return "All Day";

    const startDate = new Date(startVal);
    const endDate = endVal ? new Date(endVal) : null;

    if (event.start.date) {
      return "All Day";
    }

    const startStr = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endStr = endDate
      ? endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    return `${startStr} ${endStr ? ` - ${endStr}` : ""}`;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col h-[340px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight">
            Google Calendar Agenda
          </h3>
        </div>
        {googleToken && (
          <button
            onClick={fetchTodayEvents}
            disabled={loading}
            className="p-1 hover:bg-neutral-50 rounded-lg text-neutral-400 hover:text-neutral-700 transition disabled:opacity-50"
            title="Refresh schedule"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {!googleToken ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
          <Calendar className="w-8 h-8 text-neutral-300 mb-2.5 stroke-[1.5]" />
          <p className="text-xs font-medium text-neutral-500 max-w-[200px]">
            Sign in with Google to synchronize and view scheduled meetings
          </p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-2.5">
          <div className="h-4 w-2/3 bg-neutral-100 rounded-md animate-pulse" />
          <div className="h-4 w-1/2 bg-neutral-100 rounded-md animate-pulse" />
          <div className="h-4 w-4/5 bg-neutral-100 rounded-md animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
          <p className="text-xs text-red-500 font-medium mb-2">{error}</p>
          <button
            onClick={fetchTodayEvents}
            className="text-xs underline text-neutral-600 hover:text-neutral-900"
          >
            Try Again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-neutral-50/20 rounded-2xl border border-gray-100">
          <CheckCircle className="w-8 h-8 text-neutral-200 mb-2 stroke-[1.5]" />
          <p className="text-xs text-neutral-400 max-w-[200px]">
            No scheduled events today. Perfect for quiet depth and coding.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="group p-3 bg-[#FDFDFD] hover:bg-neutral-950 hover:text-white rounded-2xl border border-gray-100 transition duration-150 relative overflow-hidden"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold group-hover:text-white text-neutral-800 line-clamp-1 leading-tight">
                    {event.summary}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] group-hover:text-neutral-300 text-neutral-500 font-medium">
                    <Clock className="w-3 h-3 text-neutral-400 shrink-0 group-hover:text-neutral-300" />
                    <span>{formatEventTime(event)}</span>
                  </div>
                </div>

                {onQuickaddTask && (
                  <button
                    onClick={() => onQuickaddTask(event.summary, 30)}
                    className="opacity-0 group-hover:opacity-100 absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-[10px] font-bold tracking-tight shadow-sm transition duration-150 flex items-center gap-1"
                    title="Add to daily planner tasks"
                  >
                    <Tag className="w-3 h-3" />
                    Focus List
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {googleToken && events.length > 0 && (
        <div className="mt-3 text-center">
          <p className="text-[10px] text-neutral-400">
            Showed {events.length} schedule slots for your day.
          </p>
        </div>
      )}
    </div>
  );
};

// Simple standalone CheckCircle icon for placeholder use
const CheckCircle = ({ className, ...props }: any) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
