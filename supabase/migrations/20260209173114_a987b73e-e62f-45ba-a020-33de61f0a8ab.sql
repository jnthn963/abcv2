
-- 1. Remove direct client INSERT on ledger table (security fix)
DROP POLICY IF EXISTS "System can insert ledger" ON public.ledger;

-- 2. Update handle_new_user to process referral codes and build referral chain
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  referral_code_input TEXT;
BEGIN
  -- Extract referral code from metadata
  referral_code_input := NEW.raw_user_meta_data->>'referral_code';
  
  -- Find referrer if code provided
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT user_id INTO referrer_id 
    FROM public.profiles 
    WHERE referral_code = referral_code_input;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    user_id, first_name, last_name, email, 
    referral_code, referred_by
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    public.generate_referral_code(),
    referrer_id
  );
  
  -- Build referral chain (up to 3 levels)
  IF referrer_id IS NOT NULL THEN
    -- Level 1: Direct referrer
    INSERT INTO public.referrals (user_id, referred_user_id, level)
    VALUES (referrer_id, NEW.id, 1);
    
    -- Level 2: Referrer's referrer
    INSERT INTO public.referrals (user_id, referred_user_id, level)
    SELECT p.referred_by, NEW.id, 2
    FROM public.profiles p
    WHERE p.user_id = referrer_id AND p.referred_by IS NOT NULL;
    
    -- Level 3: Level 2's referrer
    INSERT INTO public.referrals (user_id, referred_user_id, level)
    SELECT p2.referred_by, NEW.id, 3
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.referred_by = p2.user_id
    WHERE p1.user_id = referrer_id 
      AND p2.referred_by IS NOT NULL;
  END IF;
  
  -- Assign member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;
