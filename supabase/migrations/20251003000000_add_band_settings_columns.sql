-- Add band settings columns to support comprehensive band configuration

-- Add columns for band settings
ALTER TABLE bands
ADD COLUMN IF NOT EXISTS voting_deadline_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS max_songs_per_rehearsal integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS allow_member_song_suggestions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_select_songs boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "new_song_suggestions": true,
  "rehearsal_reminders": true,
  "voting_deadlines": true,
  "member_updates": true
}'::jsonb;

-- Add constraints for validation (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bands_voting_deadline_hours_check') THEN
        ALTER TABLE bands ADD CONSTRAINT bands_voting_deadline_hours_check CHECK (voting_deadline_hours > 0 AND voting_deadline_hours <= 168);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bands_max_songs_per_rehearsal_check') THEN
        ALTER TABLE bands ADD CONSTRAINT bands_max_songs_per_rehearsal_check CHECK (max_songs_per_rehearsal > 0 AND max_songs_per_rehearsal <= 20);
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bands_settings ON bands(voting_deadline_hours, max_songs_per_rehearsal, allow_member_song_suggestions);

-- Update existing bands with default values
UPDATE bands
SET 
  voting_deadline_hours = 24,
  max_songs_per_rehearsal = 5,
  allow_member_song_suggestions = true,
  auto_select_songs = false,
  notification_preferences = '{
    "new_song_suggestions": true,
    "rehearsal_reminders": true,
    "voting_deadlines": true,
    "member_updates": true
  }'::jsonb
WHERE voting_deadline_hours IS NULL;
