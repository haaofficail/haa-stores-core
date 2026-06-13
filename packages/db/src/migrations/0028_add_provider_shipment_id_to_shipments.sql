ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS provider_shipment_id varchar(255);
