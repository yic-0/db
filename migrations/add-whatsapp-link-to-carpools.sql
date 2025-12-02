-- Add WhatsApp group link field to event_carpools table

ALTER TABLE event_carpools ADD COLUMN IF NOT EXISTS whatsapp_link TEXT;

-- Add comment
COMMENT ON COLUMN event_carpools.whatsapp_link IS 'WhatsApp group chat link for carpool coordination';
