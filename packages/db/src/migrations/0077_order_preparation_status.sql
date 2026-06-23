-- HAA-PREP-001: Add preparation_status to orders table.
--
-- preparationStatus tracks the merchant's packing workflow for a delivery
-- order. Separate from fulfillmentStatus, which reflects post-delivery
-- completion (set only when order reaches 'completed' or 'picked_up').
--
-- Lifecycle (forward-only without admin override):
--   not_started → preparing → prepared → packed
--
-- Gating: ShipmentsService.createShipment blocks shipment creation
-- unless preparationStatus = 'packed'.
--
-- This migration is idempotent (IF NOT EXISTS / safe default).
-- Per owner directive: run via ops-staging-migrate workflow only.
-- NOT auto-applied.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "preparation_status" varchar(20) NOT NULL DEFAULT 'not_started';
