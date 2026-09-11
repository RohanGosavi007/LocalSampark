-- Migration 084 (SQLite): ticket inventory for events
--
-- events.controller.js creates events with total_tickets, available_tickets and
-- allow_coin_discount, and sells tickets by decrementing available_tickets.
-- None of those columns existed, so event creation and every ticket purchase
-- failed. The place an event happens is already stored in `venue`; the
-- controller referenced a `location` column that was never there either, and
-- that is fixed in the controller rather than by adding a duplicate column.
--
-- available_tickets is kept as a stored counter rather than derived from
-- max_attendees and current_attendees, because the purchase path decrements it
-- in a single statement -- `available_tickets = available_tickets - $1` -- which
-- holds up under concurrent purchases in a way that read-then-write does not.
--
-- Existing rows are backfilled from max_attendees so events created before this
-- migration have a sane inventory instead of NULL.

ALTER TABLE events ADD COLUMN total_tickets INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN available_tickets INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN allow_coin_discount INTEGER DEFAULT 0;

UPDATE events
   SET total_tickets = COALESCE(max_attendees, 0),
       available_tickets = MAX(COALESCE(max_attendees, 0) - COALESCE(current_attendees, 0), 0)
 WHERE total_tickets = 0 AND available_tickets = 0;

CREATE INDEX IF NOT EXISTS idx_events_availability
    ON events(status, event_date, available_tickets);
