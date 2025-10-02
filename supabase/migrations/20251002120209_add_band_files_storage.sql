-- Create band files storage system
-- This includes database tables, storage bucket setup, and RLS policies

-- Create band_folders table for organizing files
CREATE TABLE band_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  name text NOT NULL,
  parent_folder_id uuid REFERENCES band_folders(id) ON DELETE CASCADE,
  folder_path text NOT NULL, -- Full path like '/sheet-music/songs'
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, folder_path)
);

-- Create band_files table for file metadata
CREATE TABLE band_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES band_folders(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id),
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL, -- Path in Supabase Storage
  folder_path text DEFAULT '/', -- Logical folder path for UI
  description text,
  is_public boolean DEFAULT false,
  download_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create storage bucket for band files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'band-files',
  'band-files',
  false,
  52428800, -- 50MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/quicktime',
    'text/plain',
    'application/zip'
  ]
);

-- Add indexes for performance
CREATE INDEX idx_band_folders_band_id ON band_folders(band_id);
CREATE INDEX idx_band_folders_parent ON band_folders(parent_folder_id);
CREATE INDEX idx_band_folders_path ON band_folders(folder_path);
CREATE INDEX idx_band_files_band_id ON band_files(band_id);
CREATE INDEX idx_band_files_folder_id ON band_files(folder_id);
CREATE INDEX idx_band_files_uploaded_by ON band_files(uploaded_by);
CREATE INDEX idx_band_files_folder_path ON band_files(folder_path);

-- Enable RLS on band_folders
ALTER TABLE band_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for band_folders
CREATE POLICY "Band members can view folders" ON band_folders
  FOR SELECT
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can create folders" ON band_folders
  FOR INSERT
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can update folders" ON band_folders
  FOR UPDATE
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band admins can delete folders" ON band_folders
  FOR DELETE
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on band_files
ALTER TABLE band_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for band_files
CREATE POLICY "Band members can view files" ON band_files
  FOR SELECT
  USING (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can upload files" ON band_files
  FOR INSERT
  WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "File uploaders can update their files" ON band_files
  FOR UPDATE
  USING (
    uploaded_by = auth.uid() AND
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "File uploaders and admins can delete files" ON band_files
  FOR DELETE
  USING (
    (uploaded_by = auth.uid() OR
     band_id IN (
       SELECT band_id FROM band_members
       WHERE user_id = auth.uid() AND role = 'admin'
     )) AND
    band_id IN (
      SELECT band_id FROM band_members
      WHERE user_id = auth.uid()
    )
  );

-- Storage policies for band-files bucket
CREATE POLICY "Band members can view files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'band-files' AND
    (SELECT band_id FROM band_files WHERE storage_path = name LIMIT 1) IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can upload files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'band-files' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "File owners and admins can update files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'band-files' AND
    ((SELECT uploaded_by FROM band_files WHERE storage_path = name LIMIT 1) = auth.uid() OR
     (SELECT band_id FROM band_files WHERE storage_path = name LIMIT 1) IN (
       SELECT band_id FROM band_members WHERE user_id = auth.uid() AND role = 'admin'
     ))
  );

CREATE POLICY "File owners and admins can delete files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'band-files' AND
    ((SELECT uploaded_by FROM band_files WHERE storage_path = name LIMIT 1) = auth.uid() OR
     (SELECT band_id FROM band_files WHERE storage_path = name LIMIT 1) IN (
       SELECT band_id FROM band_members WHERE user_id = auth.uid() AND role = 'admin'
     ))
  );

-- Function to generate unique storage path
CREATE OR REPLACE FUNCTION generate_storage_path(
  band_id_param uuid,
  folder_path_param text,
  file_name_param text
) RETURNS text AS $$
DECLARE
  clean_path text;
  file_extension text;
  base_name text;
  unique_id text;
BEGIN
  -- Clean folder path
  clean_path := TRIM(BOTH '/' FROM COALESCE(folder_path_param, ''));

  -- Extract file extension
  file_extension := CASE
    WHEN file_name_param ~ '\.[^.]+$' THEN
      '.' || (regexp_matches(file_name_param, '\.([^.]+)$'))[1]
    ELSE ''
  END;

  -- Get base name without extension
  base_name := regexp_replace(file_name_param, '\.[^.]+$', '');

  -- Generate unique identifier
  unique_id := EXTRACT(EPOCH FROM now())::text || '_' || gen_random_uuid()::text;

  -- Construct path: band_id/folder_path/timestamp_uuid_filename.ext
  RETURN band_id_param::text ||
    CASE WHEN clean_path = '' THEN '' ELSE '/' || clean_path END ||
    '/' || unique_id || '_' || regexp_replace(base_name, '[^a-zA-Z0-9._-]', '_', 'g') || file_extension;
END;
$$ LANGUAGE plpgsql;

-- Function to update download count
CREATE OR REPLACE FUNCTION increment_download_count(file_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE band_files
  SET download_count = download_count + 1,
      updated_at = now()
  WHERE id = file_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get folder contents
CREATE OR REPLACE FUNCTION get_folder_contents(
  band_id_param uuid,
  folder_path_param text DEFAULT '/'
) RETURNS TABLE (
  type text,
  id uuid,
  name text,
  size bigint,
  mime_type text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  uploaded_by uuid,
  uploader_name text,
  download_count integer,
  file_count integer
) AS $$
BEGIN
  RETURN QUERY
  -- Get subfolders
  SELECT
    'folder'::text,
    bf.id,
    bf.name,
    0::bigint,
    'folder'::text,
    bf.created_at,
    bf.updated_at,
    bf.created_by,
    p.display_name,
    0::integer,
    (SELECT COUNT(*)::integer FROM band_files WHERE folder_path LIKE bf.folder_path || '%')
  FROM band_folders bf
  LEFT JOIN profiles p ON bf.created_by = p.id
  WHERE bf.band_id = band_id_param
    AND bf.parent_folder_id = (
      SELECT id FROM band_folders
      WHERE band_id = band_id_param AND folder_path = folder_path_param
      LIMIT 1
    )

  UNION ALL

  -- Get files
  SELECT
    'file'::text,
    bfi.id,
    bfi.file_name,
    bfi.file_size,
    bfi.mime_type,
    bfi.created_at,
    bfi.updated_at,
    bfi.uploaded_by,
    p.display_name,
    bfi.download_count,
    0::integer
  FROM band_files bfi
  LEFT JOIN profiles p ON bfi.uploaded_by = p.id
  WHERE bfi.band_id = band_id_param
    AND bfi.folder_path = folder_path_param

  ORDER BY type DESC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;