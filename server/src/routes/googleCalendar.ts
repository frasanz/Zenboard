import express from 'express';
import ical from 'node-ical';
import db from '../db/index.js';

const router = express.Router();

// Get Google Calendar configuration
router.get('/config', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM google_calendar_config WHERE id = 1').get() as {
      id: number;
      ical_url: string | null;
      show_events: number;
      updated_at: string;
    } | undefined;

    res.json({
      icalUrl: config?.ical_url || '',
      showEvents: config?.show_events === 1
    });
  } catch (error) {
    console.error('Error fetching Google Calendar config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update Google Calendar configuration
router.put('/config', (req, res) => {
  try {
    const { icalUrl, showEvents } = req.body;

    db.prepare(`
      INSERT INTO google_calendar_config (id, ical_url, show_events, updated_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        ical_url = excluded.ical_url,
        show_events = excluded.show_events,
        updated_at = CURRENT_TIMESTAMP
    `).run(icalUrl || null, showEvents ? 1 : 0);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Google Calendar config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Get Google Calendar events
router.get('/events', async (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM google_calendar_config WHERE id = 1').get() as {
      id: number;
      ical_url: string | null;
      show_events: number;
      updated_at: string;
    } | undefined;

    if (!config?.ical_url || config.show_events !== 1) {
      return res.json([]);
    }

    const events = await ical.async.fromURL(config.ical_url);
    const formattedEvents = [];

    for (const k in events) {
      const event = events[k];
      if (event.type === 'VEVENT') {
        // Determine event status
        let status = 'accepted'; // default
        
        // Check event status (CONFIRMED, TENTATIVE, CANCELLED)
        if (event.status === 'CANCELLED') {
          status = 'declined';
        } else if (event.status === 'TENTATIVE') {
          status = 'tentative';
        }
        
        // Check attendee participation status if available
        if (event.attendee) {
          const attendees = Array.isArray(event.attendee) ? event.attendee : [event.attendee];
          // Look for the organizer's email in the iCal URL to find their participation
          const userEmail = config.ical_url.match(/\/([^\/]+)\/private/)?.[1]?.replace('%40', '@');
          
          for (const attendee of attendees) {
            const attendeeEmail = typeof attendee === 'string' 
              ? attendee.match(/mailto:([^?]+)/)?.[1]
              : attendee.val?.match(/mailto:([^?]+)/)?.[1];
            
            if (userEmail && attendeeEmail === userEmail) {
              const partstat = typeof attendee === 'object' ? attendee.params?.PARTSTAT : undefined;
              if (partstat === 'DECLINED') status = 'declined';
              else if (partstat === 'TENTATIVE' || partstat === 'NEEDS-ACTION') status = 'tentative';
              else if (partstat === 'ACCEPTED') status = 'accepted';
              break;
            }
          }
        }
        
        // Handle recurring events
        if (event.rrule) {
          const dates = event.rrule.between(
            new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year ahead
            true
          );
          
          dates.forEach((date) => {
            const duration = event.end ? new Date(event.end).getTime() - new Date(event.start).getTime() : 3600000;
            const endDate = new Date(date.getTime() + duration);
            
            formattedEvents.push({
              id: `${event.uid}-${date.getTime()}`,
              title: event.summary || 'Sin título',
              start: date.toISOString(),
              end: endDate.toISOString(),
              description: event.description || '',
              location: event.location || '',
              status,
              isGoogleEvent: true
            });
          });
        } else {
          // Single event
          formattedEvents.push({
            id: event.uid || k,
            title: event.summary || 'Sin título',
            start: event.start ? new Date(event.start).toISOString() : new Date().toISOString(),
            end: event.end ? new Date(event.end).toISOString() : new Date().toISOString(),
            description: event.description || '',
            location: event.location || '',
            status,
            isGoogleEvent: true
          });
        }
      }
    }

    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
