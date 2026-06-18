import { CalendarEvent } from "./types";

interface GoogleEventResponse {
  items?: any[];
}

/**
 * Fetch calendar events from primary Google Calendar for a given date range.
 */
export async function listGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  if (!accessToken) {
    throw new Error("No Google access token. Please connect to Google Calendar.");
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(
    timeMax
  )}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Google session expired. Please reconnect to sync calendar.");
    }
    const errText = await response.text();
    throw new Error(`Google Calendar Error: ${errText || response.statusText}`);
  }

  const data: GoogleEventResponse = await response.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || "(No Title)",
    description: item.description,
    start: item.start,
    end: item.end,
  }));
}

/**
 * Create an event in primary Google Calendar. Returns the created event ID.
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  title: string,
  startDateTime: string,
  endDateTime: string,
  description?: string
): Promise<string> {
  if (!accessToken) {
    throw new Error("No Google access token. Please connect to Google Calendar.");
  }

  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const body = {
    summary: title,
    description: description || "Created via Daily & Weekly Planner",
    start: {
      dateTime: startDateTime,
    },
    end: {
      dateTime: endDateTime,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Google session expired. Please reconnect to sync calendar.");
    }
    const errText = await response.text();
    throw new Error(`Failed to create calendar event: ${errText || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Delete an event from primary Google Calendar.
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  if (!accessToken) {
    throw new Error("No Google access token. Please connect to Google Calendar.");
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    if (response.status === 401) {
      throw new Error("Google session expired. Please reconnect to delete calendar event.");
    }
    const errText = await response.text();
    throw new Error(`Failed to delete calendar event: ${errText || response.statusText}`);
  }
}
