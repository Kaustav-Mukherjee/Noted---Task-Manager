
/**
 * Service to interact with the Google Calendar API
 */

/**
 * Fetch calendar events from the primary calendar
 * @param {string} accessToken - The OAuth2 access token
 * @param {Date} timeMin - The start time to fetch events from
 * @param {Date} timeMax - The end time to fetch events to
 * @returns {Promise<Array>} - Array of calendar events
 */
export const getCalendarEvents = async (accessToken, timeMin, timeMax) => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=250`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error?.message || 'Failed to fetch calendar events');
            error.code = errorData.error?.code || response.status;
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        throw error;
    }
};

/**
 * Create a new event in the primary calendar
 * @param {string} accessToken - The OAuth2 access token
 * @param {Object} event - The event object
 * @returns {Promise<Object>} - The created event
 */
export const createCalendarEvent = async (accessToken, event) => {
    try {
        const response = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error?.message || 'Failed to create calendar event');
            error.code = errorData.error?.code || response.status;
            error.status = response.status;
            throw error;
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        throw error;
    }
};

/**
 * Update an existing event in the primary calendar
 * @param {string} accessToken - The OAuth2 access token
 * @param {string} eventId - The event ID to update
 * @param {Object} event - The updated event object
 * @returns {Promise<Object>} - The updated event
 */
export const updateCalendarEvent = async (accessToken, eventId, event) => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error?.message || 'Failed to update calendar event');
            error.code = errorData.error?.code || response.status;
            error.status = response.status;
            throw error;
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating Google Calendar event:', error);
        throw error;
    }
};

/**
 * Delete an event from the primary calendar
 * @param {string} accessToken - The OAuth2 access token
 * @param {string} eventId - The event ID to delete
 * @returns {Promise<void>}
 */
export const deleteCalendarEvent = async (accessToken, eventId) => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok && response.status !== 204) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error?.message || 'Failed to delete calendar event');
            error.code = errorData.error?.code || response.status;
            error.status = response.status;
            throw error;
        }
    } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
        throw error;
    }
};

/**
 * Build a Google Calendar event object from form data
 * @param {Object} params - The event parameters
 * @returns {Object} - Google Calendar event object
 */
export const buildCalendarEvent = ({ title, date, startTime, endTime, location, description, attendees, isMeeting }) => {
    const event = {
        summary: title,
    };

    // Set start/end times
    if (startTime) {
        const startDateTime = new Date(`${date}T${startTime}:00`);
        const endDateTime = endTime
            ? new Date(`${date}T${endTime}:00`)
            : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

        event.start = { dateTime: startDateTime.toISOString() };
        event.end = { dateTime: endDateTime.toISOString() };
    } else {
        // All-day event
        event.start = { date };
        event.end = { date };
    }

    if (location) {
        event.location = location;
    }

    if (description) {
        event.description = description;
    }

    // Add attendees for meetings
    if (isMeeting && attendees && attendees.length > 0) {
        event.attendees = attendees
            .filter(email => email.trim())
            .map(email => ({ email: email.trim() }));
        // Enable Google Meet link for meetings
        event.conferenceData = {
            createRequest: {
                requestId: `meet-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        };
    }

    // Add reminders
    event.reminders = {
        useDefault: false,
        overrides: [
            { method: 'popup', minutes: 10 },
        ]
    };

    return event;
};

/**
 * Check if a Google Calendar API error is due to the API not being enabled
 */
export const isApiNotEnabledError = (error) => {
    return error?.message?.includes('has not been used') ||
        error?.message?.includes('is disabled') ||
        error?.message?.includes('accessNotConfigured') ||
        (error?.code === 403 && error?.status === 403);
};

/**
 * Check if error is an auth/token error
 */
export const isAuthError = (error) => {
    return error?.status === 401 ||
        error?.code === 401 ||
        error?.message?.includes('401') ||
        error?.message?.includes('Invalid Credentials') ||
        error?.message?.includes('invalid_grant');
};
