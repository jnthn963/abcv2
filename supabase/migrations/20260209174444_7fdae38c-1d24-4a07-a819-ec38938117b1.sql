-- Fix 1: Prevent users from modifying balance columns directly
-- Only service_role can update vault_balance, lending_balance, frozen_balance
CREATE OR REPLACE FUNCTION public.prevent_balance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    IF NEW.vault_balance IS DISTINCT FROM OLD.vault_balance OR
       NEW.lending_balance IS DISTINCT FROM OLD.lending_balance OR
       NEW.frozen_balance IS DISTINCT FROM OLD.frozen_balance THEN
      RAISE EXCEPTION 'Balance fields cannot be updated by users';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_balance_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_balance_update();

-- Fix 2: Update admin_income_ledger CHECK constraint to include all valid types
ALTER TABLE public.admin_income_ledger 
DROP CONSTRAINT IF EXISTS admin_income_ledger_type_check;

ALTER TABLE public.admin_income_ledger
ADD CONSTRAINT admin_income_ledger_type_check
CHECK (type IN (
  'borrower_interest',
  'deposit_fee',
  'withdrawal_fee',
  'interest_spread',
  'insurance',
  'transfer_fee',
  'default_alert'
));