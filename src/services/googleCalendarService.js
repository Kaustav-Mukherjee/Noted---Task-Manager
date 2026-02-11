
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
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch calendar events');
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        throw error;
    }
};
