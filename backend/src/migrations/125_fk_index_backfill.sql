-- 125: index the foreign-key columns that have none (PostgreSQL)
--
-- PostgreSQL does not index the referencing side of a foreign key, and neither
-- does SQLite. Without one, every ON DELETE on the parent table scans the
-- child, and every "rows belonging to X" lookup is a sequential scan: invisible
-- on a pilot's data, a stall on a city's. 116 covered the thirty-eight hottest;
-- this covers the remaining 121.
--
-- IF NOT EXISTS throughout, so it is safe to re-run and safe where an earlier
-- migration or a hand-made index already exists.
--
-- NOT EXECUTED: generated from scripts/pg-schema-model.js; no PostgreSQL with
-- PostGIS was available to run it. CREATE INDEX takes a write lock on the table
-- for its duration, which is milliseconds at launch-scale row counts.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_environment_requests_reporter_id ON admin_environment_requests (reporter_id);
CREATE INDEX IF NOT EXISTS idx_admin_ip_allowlist_added_by ON admin_ip_allowlist (added_by);
CREATE INDEX IF NOT EXISTS idx_admin_mobility_vehicles_driver_id ON admin_mobility_vehicles (driver_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_region_id ON admin_roles (region_id);
CREATE INDEX IF NOT EXISTS idx_agent_payouts_agent_id ON agent_payouts (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_cctv_alerts_society_id ON ai_cctv_alerts (society_id);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_amenity_id ON amenity_bookings (amenity_id);
CREATE INDEX IF NOT EXISTS idx_attribution_policies_signed_off_by ON attribution_policies (signed_off_by);
CREATE INDEX IF NOT EXISTS idx_blood_donors_society_id ON blood_donors (society_id);
CREATE INDEX IF NOT EXISTS idx_care_providers_user_id ON care_providers (user_id);
CREATE INDEX IF NOT EXISTS idx_care_requests_user_id ON care_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_chef_meal_orders_meal_id ON chef_meal_orders (meal_id);
CREATE INDEX IF NOT EXISTS idx_child_security_society_id ON child_security (society_id);
CREATE INDEX IF NOT EXISTS idx_cpr_responders_society_id ON cpr_responders (society_id);
CREATE INDEX IF NOT EXISTS idx_daily_staff_flats_staff_id ON daily_staff_flats (staff_id);
CREATE INDEX IF NOT EXISTS idx_daily_staff_society_id ON daily_staff (society_id);
CREATE INDEX IF NOT EXISTS idx_daily_subscriptions_shop_id ON daily_subscriptions (shop_id);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_agent_id ON delivery_batches (agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_telemetry_agent_id ON delivery_telemetry (agent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_shop_id ON disputes (shop_id);
CREATE INDEX IF NOT EXISTS idx_drone_pad_deliveries_society_id ON drone_pad_deliveries (society_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_contact_user_id ON emergency_contacts (contact_user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_listings_owner_id ON equipment_listings (owner_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rentals_listing_id ON equipment_rentals (listing_id);
CREATE INDEX IF NOT EXISTS idx_ev_charging_sessions_station_id ON ev_charging_sessions (station_id);
CREATE INDEX IF NOT EXISTS idx_ev_charging_stations_society_id ON ev_charging_stations (society_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS idx_faceid_profiles_society_id ON faceid_profiles (society_id);
CREATE INDEX IF NOT EXISTS idx_franchise_outreach_log_logged_by ON franchise_outreach_log (logged_by);
CREATE INDEX IF NOT EXISTS idx_franchise_outreach_log_shop_id ON franchise_outreach_log (shop_id);
CREATE INDEX IF NOT EXISTS idx_franchise_territories_assigned_by ON franchise_territories (assigned_by);
CREATE INDEX IF NOT EXISTS idx_garage_sale_items_buyer_id ON garage_sale_items (buyer_id);
CREATE INDEX IF NOT EXISTS idx_garage_sale_items_seller_id ON garage_sale_items (seller_id);
CREATE INDEX IF NOT EXISTS idx_group_buy_campaigns_society_id ON group_buy_campaigns (society_id);
CREATE INDEX IF NOT EXISTS idx_group_buy_orders_campaign_id ON group_buy_orders (campaign_id);
CREATE INDEX IF NOT EXISTS idx_group_buying_deals_product_id ON group_buying_deals (product_id);
CREATE INDEX IF NOT EXISTS idx_group_buying_deals_shop_id ON group_buying_deals (shop_id);
CREATE INDEX IF NOT EXISTS idx_home_chef_orders_meal_id ON home_chef_orders (meal_id);
CREATE INDEX IF NOT EXISTS idx_home_service_bookings_category_id ON home_service_bookings (category_id);
CREATE INDEX IF NOT EXISTS idx_home_service_bookings_provider_id ON home_service_bookings (provider_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_society_id ON housekeeping_tasks (society_id);
CREATE INDEX IF NOT EXISTS idx_intercom_logs_society_id ON intercom_logs (society_id);
CREATE INDEX IF NOT EXISTS idx_iot_waste_bins_society_id ON iot_waste_bins (society_id);
CREATE INDEX IF NOT EXISTS idx_job_card_milestones_completed_by ON job_card_milestones (completed_by);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by ON lead_activities (created_by);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads (user_id);
CREATE INDEX IF NOT EXISTS idx_local_services_provider_id ON local_services (provider_id);
CREATE INDEX IF NOT EXISTS idx_lost_and_found_society_id ON lost_and_found (society_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_alerts_finder_id ON lost_found_alerts (finder_id);
CREATE INDEX IF NOT EXISTS idx_lost_found_alerts_user_id ON lost_found_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_bills_society_id ON maintenance_bills (society_id);
CREATE INDEX IF NOT EXISTS idx_medical_appointments_doctor_id ON medical_appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_donors_user_id ON medical_donors (user_id);
CREATE INDEX IF NOT EXISTS idx_medical_requests_requester_id ON medical_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_meter_recharges_meter_id ON meter_recharges (meter_id);
CREATE INDEX IF NOT EXISTS idx_ml_bandit_arms_region_id ON ml_bandit_arms (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_demand_buckets_region_id ON ml_demand_buckets (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_experiments_created_by ON ml_experiments (created_by);
CREATE INDEX IF NOT EXISTS idx_ml_exposure_ledger_region_id ON ml_exposure_ledger (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_graph_embeddings_region_id ON ml_graph_embeddings (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_interaction_events_region_id ON ml_interaction_events (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_item_overrides_created_by ON ml_item_overrides (created_by);
CREATE INDEX IF NOT EXISTS idx_ml_item_overrides_region_id ON ml_item_overrides (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_moderation_queue_region_id ON ml_moderation_queue (region_id);
CREATE INDEX IF NOT EXISTS idx_ml_moderation_queue_reviewed_by ON ml_moderation_queue (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_move_passes_society_id ON move_passes (society_id);
CREATE INDEX IF NOT EXISTS idx_order_dispatch_agent_id ON order_dispatch (agent_id);
CREATE INDEX IF NOT EXISTS idx_order_territory_attribution_policy_id ON order_territory_attribution (policy_id);
CREATE INDEX IF NOT EXISTS idx_order_territory_attribution_territory_id ON order_territory_attribution (territory_id);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders (batch_id);
CREATE INDEX IF NOT EXISTS idx_parcel_desk_society_id ON parcel_desk (society_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_by ON payout_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_pet_registry_society_id ON pet_registry (society_id);
CREATE INDEX IF NOT EXISTS idx_pet_services_shop_id ON pet_services (shop_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_id ON property_inquiries (property_id);
CREATE INDEX IF NOT EXISTS idx_regions_parent_id ON regions (parent_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_user_id ON rental_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_resident_directory_society_id ON resident_directory (society_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reward_coins_ledger_user_id ON reward_coins_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_scrap_pickups_user_id ON scrap_pickups (user_id);
CREATE INDEX IF NOT EXISTS idx_scrap_requests_dealer_id ON scrap_requests (dealer_id);
CREATE INDEX IF NOT EXISTS idx_scrap_requests_resident_id ON scrap_requests (resident_id);
CREATE INDEX IF NOT EXISTS idx_shop_appointments_service_id ON shop_appointments (service_id);
CREATE INDEX IF NOT EXISTS idx_shop_loyalty_transactions_shop_id ON shop_loyalty_transactions (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_loyalty_transactions_user_id ON shop_loyalty_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_skilled_bookings_assigned_worker_id ON skilled_bookings (assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_skilled_bookings_customer_id ON skilled_bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_society_carpools_society_id ON society_carpools (society_id);
CREATE INDEX IF NOT EXISTS idx_society_classifieds_society_id ON society_classifieds (society_id);
CREATE INDEX IF NOT EXISTS idx_society_expenses_society_id ON society_expenses (society_id);
CREATE INDEX IF NOT EXISTS idx_society_guard_shifts_created_by ON society_guard_shifts (created_by);
CREATE INDEX IF NOT EXISTS idx_society_helpdesk_society_id ON society_helpdesk (society_id);
CREATE INDEX IF NOT EXISTS idx_society_karma_ledger_society_id ON society_karma_ledger (society_id);
CREATE INDEX IF NOT EXISTS idx_society_vault_society_id ON society_vault (society_id);
CREATE INDEX IF NOT EXISTS idx_society_vehicles_resident_id ON society_vehicles (resident_id);
CREATE INDEX IF NOT EXISTS idx_stories_shop_id ON stories (shop_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_from_franchise_id ON territory_assignment_log (from_franchise_id);
CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_performed_by ON territory_assignment_log (performed_by);
CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_to_franchise_id ON territory_assignment_log (to_franchise_id);
CREATE INDEX IF NOT EXISTS idx_territory_coverage_gaps_territory_id ON territory_coverage_gaps (territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_transitions_from_territory_id ON territory_transitions (from_territory_id);
CREATE INDEX IF NOT EXISTS idx_token_queue_visitors_user_id ON token_queue_visitors (user_id);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_user_id ON trust_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_universal_order_items_item_id ON universal_order_items (item_id);
CREATE INDEX IF NOT EXISTS idx_universal_order_items_order_id ON universal_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_universal_orders_rider_id ON universal_orders (rider_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_users_active_zone_id ON users (active_zone_id);
CREATE INDEX IF NOT EXISTS idx_utility_meters_society_id ON utility_meters (society_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_society_id ON vehicles (society_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_society_id ON visitor_logs (society_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_tasks_poster_id ON volunteer_tasks (poster_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_tasks_volunteer_id ON volunteer_tasks (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_water_meters_society_id ON water_meters (society_id);

-- Columns that SQLite declares a foreign key on and PostgreSQL does not, because
-- the column type differs from the key it points at (see 116). The lookups are
-- the same on both engines, so they get the same indexes.
CREATE INDEX IF NOT EXISTS idx_admin_roles_granted_by ON admin_roles (granted_by);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON job_postings (company_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_escrow_listing_id ON marketplace_escrow (listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_auction_bids_auction_id ON marketplace_auction_bids (auction_id);
CREATE INDEX IF NOT EXISTS idx_job_assessment_attempts_assessment_id ON job_assessment_attempts (assessment_id);
CREATE INDEX IF NOT EXISTS idx_shop_analytics_snapshots_shop_id ON shop_analytics_snapshots (shop_id);

COMMIT;
