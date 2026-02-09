
-- Roles enum and user_roles table (separate from profiles per security requirements)
CREATE TYPE public.app_role AS ENUM ('member', 'governor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS on user_roles: users see own roles, governors see all
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Governors can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  vault_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  lending_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  frozen_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','submitted','approved','rejected')),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Governors can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lender_id UUID REFERENCES auth.users(id),
  principal NUMERIC(18,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  duration_days INTEGER NOT NULL DEFAULT 28,
  collateral_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','active','repaid','defaulted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loans"
  ON public.loans FOR SELECT TO authenticated
  USING (borrower_id = auth.uid() OR lender_id = auth.uid());

CREATE POLICY "Governors can view all loans"
  ON public.loans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

CREATE POLICY "Users can request loans"
  ON public.loans FOR INSERT TO authenticated
  WITH CHECK (borrower_id = auth.uid());

CREATE POLICY "Governors can update loans"
  ON public.loans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- Lending marketplace: authenticated users can see approved/pending loans for funding
CREATE POLICY "Authenticated users can view marketplace loans"
  ON public.loans FOR SELECT TO authenticated
  USING (status IN ('approved', 'pending'));

-- Ledger (immutable append-only)
CREATE TABLE public.ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','loan','interest','referral','fee','repayment')),
  amount NUMERIC(18,2) NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger"
  ON public.ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Governors can view all ledger"
  ON public.ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

CREATE POLICY "System can insert ledger"
  ON public.ledger FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE policies on ledger (immutable)

-- Admin income ledger
CREATE TABLE public.admin_income_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('borrower_interest','deposit_fee','insurance','transfer_fee')),
  amount NUMERIC(18,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_income_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Governors can view admin income"
  ON public.admin_income_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- Profit distribution history
CREATE TABLE public.profit_distribution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  total_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  distributed_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profit_distribution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Governors can view profit history"
  ON public.profit_distribution_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- Referrals (3 levels)
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Governors can view all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- System settings
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Governors can update settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- Deposits (pending approval)
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deposits"
  ON public.deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create deposits"
  ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Governors can view all deposits"
  ON public.deposits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

CREATE POLICY "Governors can update deposits"
  ON public.deposits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'governor'));

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('base_interest_rate', '12'),
  ('lender_share_pct', '70'),
  ('deposit_fee_pct', '2'),
  ('max_loan_ratio', '50'),
  ('capital_lock_days', '28'),
  ('min_account_age_days', '6'),
  ('system_frozen', 'false'),
  ('referral_l1_pct', '5'),
  ('referral_l2_pct', '3'),
  ('referral_l3_pct', '1');

-- Auto-generate referral code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    code := 'ABC-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    public.generate_referral_code()
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX idx_loans_lender_id ON public.loans(lender_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_ledger_user_id ON public.ledger(user_id);
CREATE INDEX idx_ledger_type ON public.ledger(type);
CREATE INDEX idx_referrals_user_id ON public.referrals(user_id);
CREATE INDEX idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX idx_deposits_status ON public.deposits(status);
