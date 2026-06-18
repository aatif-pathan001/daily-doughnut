export interface TaskItem {
  id: string;
  uid: string;
  title: string;
  type: "day" | "week";
  date: string; // "YYYY-MM-DD" style key
  completed: boolean;
  order: number;
  calendarEventId?: string | null;
  createdAt: string;
  duration?: number; // duration in minutes
  description?: string;
}

export interface OngoingWork {
  id: string;
  uid: string;
  title: string;
  reason: string; // The mindful reasoning
  status: "active" | "completed" | "paused";
  createdAt: string;
  completedAt?: string | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}
