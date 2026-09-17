-- SQLite variant of 106_appointment_double_booking.sql. The syntax is identical
-- here: SQLite supports partial indexes, and both engines treat NULL as not
-- equal to itself, which is why the unassigned-staff case needs its own index.
-- ─────────────────────────────────────────────────────────────────────────────
-- 106: Make double-booking impossible
--
-- shop_appointments had no uniqueness of any kind. Two customers could book the
-- same stylist, dentist or mechanic for the same slot and both be told the
-- booking was confirmed; the shop found out when both people arrived.
--
-- The booking routes did not check either, so this was not a race that needed
-- concurrency to trigger — two sequential requests a minute apart also
-- succeeded. The check now lives in the database because a check in the route
-- loses under concurrency, which is exactly when double-booking happens: two
-- customers tapping "confirm" on the last evening slot at the same moment.
--
-- ─── What counts as the same slot ───────────────────────────────────────────
--
-- (shop_id, staff_id, appointment_date, time_slot). Staff is part of the key
-- because a salon with four chairs genuinely takes four bookings at 6pm — they
-- are only a clash if they name the same person.
--
-- Appointments with no staff assigned are covered by a second index on
-- (shop_id, appointment_date, time_slot): NULL is not equal to itself in SQL,
-- so a partial index keyed on staff_id would let unlimited unassigned bookings
-- stack up on one slot, which is the same defect wearing a NULL.
--
-- Cancelled and no-show appointments are excluded: a cancelled 6pm slot must be
-- bookable again, and the whole point of cancelling is to free it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_slot_staff_unique
    ON shop_appointments (shop_id, staff_id, appointment_date, time_slot)
    WHERE status NOT IN ('cancelled', 'no_show') AND staff_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_slot_unassigned_unique
    ON shop_appointments (shop_id, appointment_date, time_slot)
    WHERE status NOT IN ('cancelled', 'no_show') AND staff_id IS NULL;

-- Supports the availability lookup the booking route now performs before
-- inserting, so the friendly "already taken" path does not table-scan.
CREATE INDEX IF NOT EXISTS idx_appointment_lookup
    ON shop_appointments (shop_id, appointment_date, time_slot);
