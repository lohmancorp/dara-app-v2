-- Add extraction profile configuration to connections
-- No table changes needed since connection_config is already jsonb and can store the extraction profiles

-- The connection_config will store:
-- {
--   "domain": "...",
--   "extraction_profiles": {
--     "light": {
--       "enabled": true,
--       "fields": ["priority", "requester_id", ...]
--     },
--     "extended": {
--       "enabled": true,  
--       "fields": ["priority", "requester_id", "cc_emails", ...]
--     }
--   }
-- }

-- This is a comment-only migration to document the structure
-- No actual schema changes needed