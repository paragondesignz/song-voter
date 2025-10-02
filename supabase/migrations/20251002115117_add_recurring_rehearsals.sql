-- Add recurring rehearsal functionality
-- This adds comprehensive recurrence options for rehearsals

-- Add recurring columns to rehearsals table
ALTER TABLE rehearsals
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_type text CHECK (recurrence_type IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'custom')),
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_days text[], -- For weekly: ['monday', 'wednesday'], for monthly: ['1', '15'] (day of month)
ADD COLUMN recurrence_end_type text CHECK (recurrence_end_type IN ('never', 'after_count', 'end_date')),
ADD COLUMN recurrence_count integer, -- Number of occurrences
ADD COLUMN recurrence_end_date date,
ADD COLUMN parent_rehearsal_id uuid REFERENCES rehearsals(id), -- Links to the original recurring rehearsal
ADD COLUMN recurrence_exceptions date[]; -- Dates to skip

-- Create rehearsal_series table for tracking recurring rehearsal groups
CREATE TABLE rehearsal_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  series_name text NOT NULL,
  template_name text NOT NULL,
  template_start_time time,
  template_location text,
  template_songs_to_learn integer NOT NULL CHECK (template_songs_to_learn >= 1 AND template_songs_to_learn <= 10),
  template_selection_deadline_hours integer, -- Hours before rehearsal for deadline
  template_description text,
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'custom')),
  recurrence_interval integer DEFAULT 1,
  recurrence_days text[], -- Days of week for weekly/bi-weekly, or days of month for monthly
  start_date date NOT NULL,
  end_type text CHECK (end_type IN ('never', 'after_count', 'end_date')),
  occurrence_count integer,
  end_date date,
  exceptions date[], -- Dates to skip in the series
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Link rehearsals to their series
ALTER TABLE rehearsals
ADD COLUMN series_id uuid REFERENCES rehearsal_series(id);

-- Add indexes for performance
CREATE INDEX idx_rehearsals_series_id ON rehearsals(series_id);
CREATE INDEX idx_rehearsals_recurring ON rehearsals(is_recurring);
CREATE INDEX idx_rehearsals_parent ON rehearsals(parent_rehearsal_id);
CREATE INDEX idx_rehearsal_series_band_id ON rehearsal_series(band_id);
CREATE INDEX idx_rehearsal_series_active ON rehearsal_series(is_active);

-- RLS policies for rehearsal_series
ALTER TABLE rehearsal_series ENABLE ROW LEVEL SECURITY;

-- Allow band members to view series
CREATE POLICY "Band members can view rehearsal series" ON rehearsal_series
  FOR SELECT
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow band admins to create series
CREATE POLICY "Band admins can create rehearsal series" ON rehearsal_series
  FOR INSERT
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow band admins to update series
CREATE POLICY "Band admins can update rehearsal series" ON rehearsal_series
  FOR UPDATE
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow band admins to delete series
CREATE POLICY "Band admins can delete rehearsal series" ON rehearsal_series
  FOR DELETE
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to generate future rehearsals from a series
CREATE OR REPLACE FUNCTION generate_rehearsals_from_series(
  series_id_param uuid,
  months_ahead integer DEFAULT 3
) RETURNS integer AS $$
DECLARE
  series_record rehearsal_series%ROWTYPE;
  start_generation_date date;
  end_generation_date date;
  rehearsal_date date;
  occurrence_count integer := 0;
  generated_count integer := 0;
  day_name text;
  day_num integer;
BEGIN
  -- Get the series record
  SELECT * INTO series_record FROM rehearsal_series WHERE id = series_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Set generation window
  start_generation_date := GREATEST(series_record.start_date, CURRENT_DATE);
  end_generation_date := start_generation_date + INTERVAL '1 month' * months_ahead;

  -- Apply end date limits
  IF series_record.end_type = 'end_date' AND series_record.end_date IS NOT NULL THEN
    end_generation_date := LEAST(end_generation_date, series_record.end_date);
  END IF;

  -- Count existing rehearsals in this series
  SELECT COUNT(*) INTO occurrence_count
  FROM rehearsals
  WHERE series_id = series_id_param;

  -- Generate rehearsals based on recurrence type
  rehearsal_date := start_generation_date;

  WHILE rehearsal_date <= end_generation_date LOOP
    -- Check if we've hit the occurrence limit
    IF series_record.end_type = 'after_count' AND
       series_record.occurrence_count IS NOT NULL AND
       occurrence_count >= series_record.occurrence_count THEN
      EXIT;
    END IF;

    -- Check if this date is in exceptions
    IF NOT (rehearsal_date = ANY(COALESCE(series_record.exceptions, ARRAY[]::date[]))) THEN
      -- Check if rehearsal already exists for this date
      IF NOT EXISTS (
        SELECT 1 FROM rehearsals
        WHERE series_id = series_id_param
        AND rehearsal_date = rehearsal_date
      ) THEN
        -- Create the rehearsal
        INSERT INTO rehearsals (
          band_id,
          created_by,
          name,
          rehearsal_date,
          start_time,
          location,
          songs_to_learn,
          selection_deadline,
          description,
          series_id,
          is_recurring
        ) VALUES (
          series_record.band_id,
          series_record.created_by,
          series_record.template_name,
          rehearsal_date,
          series_record.template_start_time,
          series_record.template_location,
          series_record.template_songs_to_learn,
          CASE
            WHEN series_record.template_selection_deadline_hours IS NOT NULL
            THEN (rehearsal_date + series_record.template_start_time) - INTERVAL '1 hour' * series_record.template_selection_deadline_hours
            ELSE NULL
          END,
          series_record.template_description,
          series_id_param,
          true
        );

        generated_count := generated_count + 1;
        occurrence_count := occurrence_count + 1;
      END IF;
    END IF;

    -- Calculate next rehearsal date based on recurrence type
    IF series_record.recurrence_type = 'daily' THEN
      rehearsal_date := rehearsal_date + INTERVAL '1 day' * series_record.recurrence_interval;

    ELSIF series_record.recurrence_type = 'weekly' THEN
      rehearsal_date := rehearsal_date + INTERVAL '1 week' * series_record.recurrence_interval;

    ELSIF series_record.recurrence_type = 'bi_weekly' THEN
      rehearsal_date := rehearsal_date + INTERVAL '2 weeks';

    ELSIF series_record.recurrence_type = 'monthly' THEN
      rehearsal_date := rehearsal_date + INTERVAL '1 month' * series_record.recurrence_interval;

    ELSE
      -- For custom recurrence, just add the interval in days
      rehearsal_date := rehearsal_date + INTERVAL '1 day' * series_record.recurrence_interval;
    END IF;
  END LOOP;

  RETURN generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;