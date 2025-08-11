-- Fix the create_band_member_account function to handle existing profiles properly
CREATE OR REPLACE FUNCTION create_band_member_account(
  p_email TEXT,
  p_band_id UUID,
  p_role TEXT,
  p_display_name TEXT,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_shared_password TEXT;
BEGIN
  -- Get the band's shared password
  SELECT shared_password INTO v_shared_password
  FROM bands
  WHERE id = p_band_id;
  
  IF v_shared_password IS NULL THEN
    RAISE EXCEPTION 'Band does not have a shared password set';
  END IF;
  
  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    -- Create new auth user with shared password
    v_user_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      v_user_id,
      p_email,
      crypt(v_shared_password, gen_salt('bf')),
      NOW(), -- Auto-confirm email
      NOW(),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('display_name', p_display_name),
      'authenticated',
      'authenticated'
    );
  END IF;
  
  -- Always ensure profile exists (create or update)
  INSERT INTO profiles (id, email, display_name)
  VALUES (v_user_id, p_email, p_display_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;
  
  -- Add user to band if not already a member
  INSERT INTO band_members (band_id, user_id, role, joined_at)
  VALUES (p_band_id, v_user_id, p_role, NOW())
  ON CONFLICT (band_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;
  
  RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_band_member_account TO authenticated;