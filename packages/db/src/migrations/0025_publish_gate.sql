ALTER TABLE stores ADD COLUMN IF NOT EXISTS publish_status varchar(20) NOT NULL DEFAULT 'draft';
