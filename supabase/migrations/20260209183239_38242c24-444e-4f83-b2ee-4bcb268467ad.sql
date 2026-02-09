
-- 1. Fix ledger type CHECK constraint to include all types used by edge functions
ALTER TABLE public.ledger DROP CONSTRAINT IF EXISTS ledger_type_check;
ALTER TABLE public.ledger ADD CONSTRAINT ledger_type_check CHECK (type IN (
  'deposit',
  'withdrawal',
  'withdrawal_fee',
  'loan',
  'loan_funding',
  'loan_received',
  'loan_repayment',
  'loan_repayment_received',
  'interest',
  'referral',
  'fee',
  'repayment',
  'collateral_lock',
  'collateral_release',
  'default',
  'default_recovery'
));

-- 2. Atomic deposit approval RPC
CREATE OR REPLACE FUNCTION public.atomic_approve_deposit(
  p_deposit_id UUID,
  p_fee_pct NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit RECORD;
  v_fee NUMERIC;
  v_net_amount NUMERIC;
BEGIN
  -- Lock deposit row
  SELECT * INTO v_deposit FROM deposits WHERE id = p_deposit_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Deposit not found or not pending');
  END IF;

  v_fee := v_deposit.amount * (p_fee_pct / 100);
  v_net_amount := v_deposit.amount - v_fee;

  -- Update deposit status
  UPDATE deposits SET status = 'approved', updated_at = now() WHERE id = p_deposit_id;

  -- Atomic balance update with row lock
  UPDATE profiles SET vault_balance = vault_balance + v_net_amount, updated_at = now()
  WHERE user_id = v_deposit.user_id;

  -- Ledger entry
  INSERT INTO ledger (user_id, type, amount, description, reference_id)
  VALUES (v_deposit.user_id, 'deposit', v_net_amount, 
    'Deposit approved (₳' || v_deposit.amount || ' - ' || p_fee_pct || '% fee)', p_deposit_id);

  -- Admin income from fee
  IF v_fee > 0 THEN
    INSERT INTO admin_income_ledger (type, amount, description)
    VALUES ('deposit_fee', v_fee, 'Deposit fee from ' || substring(v_deposit.user_id::text, 1, 8));
  END IF;

  RETURN json_build_object('success', true, 'net_amount', v_net_amount, 'fee', v_fee, 'user_id', v_deposit.user_id);
END;
$$;

-- 3. Atomic referral commission RPC
CREATE OR REPLACE FUNCTION public.atomic_referral_commission(
  p_user_id UUID,
  p_amount NUMERIC,
  p_level INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET vault_balance = vault_balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  INSERT INTO ledger (user_id, type, amount, description)
  VALUES (p_user_id, 'referral', p_amount, 'Referral commission (Level ' || p_level || ')');

  RETURN json_build_object('success', true);
END;
$$;

-- 4. Atomic withdrawal approval RPC
CREATE OR REPLACE FUNCTION public.atomic_approve_withdrawal(
  p_withdrawal_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_total NUMERIC;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Withdrawal not found or not pending');
  END IF;

  v_total := v_withdrawal.amount + v_withdrawal.fee;

  -- Lock profile row and check balance
  SELECT vault_balance INTO v_balance FROM profiles WHERE user_id = v_withdrawal.user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_total THEN
    RETURN json_build_object('error', 'Insufficient balance');
  END IF;

  UPDATE withdrawals SET status = 'approved', updated_at = now() WHERE id = p_withdrawal_id;
  UPDATE profiles SET vault_balance = vault_balance - v_total, updated_at = now() WHERE user_id = v_withdrawal.user_id;

  INSERT INTO ledger (user_id, type, amount, description, reference_id)
  VALUES (v_withdrawal.user_id, 'withdrawal', -v_withdrawal.amount,
    'Withdrawal to ' || v_withdrawal.bank_name || ' ****' || right(v_withdrawal.account_number, 4), p_withdrawal_id);

  IF v_withdrawal.fee > 0 THEN
    INSERT INTO ledger (user_id, type, amount, description, reference_id)
    VALUES (v_withdrawal.user_id, 'withdrawal_fee', -v_withdrawal.fee, 'Withdrawal processing fee', p_withdrawal_id);

    INSERT INTO admin_income_ledger (type, amount, description)
    VALUES ('withdrawal_fee', v_withdrawal.fee, 'Withdrawal fee from ' || substring(v_withdrawal.user_id::text, 1, 8));
  END IF;

  RETURN json_build_object('success', true, 'total_deduction', v_total);
END;
$$;

-- 5. Atomic collateral lock RPC
CREATE OR REPLACE FUNCTION public.atomic_lock_collateral(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  SELECT vault_balance - frozen_balance INTO v_available FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  IF v_available IS NULL OR v_available < p_amount THEN
    RETURN json_build_object('error', 'Insufficient available balance for collateral');
  END IF;

  UPDATE profiles SET 
    vault_balance = vault_balance - p_amount, 
    frozen_balance = frozen_balance + p_amount, 
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO ledger (user_id, type, amount, description)
  VALUES (p_user_id, 'collateral_lock', -p_amount, 'Collateral locked for loan request');

  RETURN json_build_object('success', true);
END;
$$;

-- 6. Atomic fund loan RPC
CREATE OR REPLACE FUNCTION public.atomic_fund_loan(
  p_loan_id UUID,
  p_lender_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
  v_lender_balance NUMERIC;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Loan not found or not pending');
  END IF;

  IF v_loan.borrower_id = p_lender_id THEN
    RETURN json_build_object('error', 'Cannot fund your own loan');
  END IF;

  -- Lock lender profile
  SELECT vault_balance INTO v_lender_balance FROM profiles WHERE user_id = p_lender_id FOR UPDATE;
  IF v_lender_balance IS NULL OR v_lender_balance < v_loan.principal THEN
    RETURN json_build_object('error', 'Insufficient vault balance to fund this loan');
  END IF;

  -- Lock borrower profile
  PERFORM 1 FROM profiles WHERE user_id = v_loan.borrower_id FOR UPDATE;

  -- Lender: vault -> lending
  UPDATE profiles SET 
    vault_balance = vault_balance - v_loan.principal,
    lending_balance = lending_balance + v_loan.principal,
    updated_at = now()
  WHERE user_id = p_lender_id;

  -- Borrower: receives principal in vault
  UPDATE profiles SET vault_balance = vault_balance + v_loan.principal, updated_at = now()
  WHERE user_id = v_loan.borrower_id;

  -- Update loan
  UPDATE loans SET status = 'approved', lender_id = p_lender_id, updated_at = now()
  WHERE id = p_loan_id;

  -- Ledger entries
  INSERT INTO ledger (user_id, type, amount, description, reference_id) VALUES
    (p_lender_id, 'loan_funding', -v_loan.principal, 'Funded loan for M-' || upper(substring(v_loan.borrower_id::text, 1, 4)), p_loan_id),
    (v_loan.borrower_id, 'loan_received', v_loan.principal, 'Loan funded by lender', p_loan_id);

  RETURN json_build_object('success', true);
END;
$$;

-- 7. Atomic repay loan RPC
CREATE OR REPLACE FUNCTION public.atomic_repay_loan(
  p_loan_id UUID,
  p_borrower_id UUID,
  p_lender_share_pct NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
  v_days_elapsed INT;
  v_interest NUMERIC;
  v_total_owed NUMERIC;
  v_lender_interest NUMERIC;
  v_system_interest NUMERIC;
  v_borrower_balance NUMERIC;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'approved' AND borrower_id = p_borrower_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Active loan not found or not yours');
  END IF;

  v_days_elapsed := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - v_loan.created_at)) / 86400));
  v_interest := v_loan.principal * (v_loan.interest_rate / 100.0) * (v_days_elapsed / 365.0);
  v_total_owed := v_loan.principal + v_interest;
  v_lender_interest := v_interest * (p_lender_share_pct / 100.0);
  v_system_interest := v_interest - v_lender_interest;

  -- Lock borrower profile
  SELECT vault_balance INTO v_borrower_balance FROM profiles WHERE user_id = p_borrower_id FOR UPDATE;
  IF v_borrower_balance IS NULL OR v_borrower_balance < v_total_owed THEN
    RETURN json_build_object('error', 'Insufficient vault balance', 'total_owed', ROUND(v_total_owed * 100) / 100);
  END IF;

  -- Deduct from borrower, release collateral
  UPDATE profiles SET 
    vault_balance = vault_balance - v_total_owed,
    frozen_balance = GREATEST(0, frozen_balance - v_loan.collateral_amount),
    updated_at = now()
  WHERE user_id = p_borrower_id;

  -- Credit lender if exists
  IF v_loan.lender_id IS NOT NULL THEN
    PERFORM 1 FROM profiles WHERE user_id = v_loan.lender_id FOR UPDATE;
    UPDATE profiles SET 
      vault_balance = vault_balance + v_loan.principal + v_lender_interest,
      lending_balance = GREATEST(0, lending_balance - v_loan.principal),
      updated_at = now()
    WHERE user_id = v_loan.lender_id;

    INSERT INTO ledger (user_id, type, amount, description, reference_id)
    VALUES (v_loan.lender_id, 'loan_repayment_received', v_loan.principal, 'Loan principal returned', p_loan_id);

    IF v_lender_interest > 0 THEN
      INSERT INTO ledger (user_id, type, amount, description, reference_id)
      VALUES (v_loan.lender_id, 'interest', v_lender_interest, 'Interest earned (' || v_days_elapsed || ' days)', p_loan_id);
    END IF;
  END IF;

  -- Update loan status
  UPDATE loans SET status = 'completed', updated_at = now() WHERE id = p_loan_id;

  -- Borrower ledger
  INSERT INTO ledger (user_id, type, amount, description, reference_id)
  VALUES (p_borrower_id, 'loan_repayment', -v_total_owed, 
    'Loan repaid (₳' || v_loan.principal || ' + ₳' || ROUND(v_interest::numeric, 2) || ' interest, ' || v_days_elapsed || 'd)', p_loan_id);

  IF v_loan.collateral_amount > 0 THEN
    INSERT INTO ledger (user_id, type, amount, description, reference_id)
    VALUES (p_borrower_id, 'collateral_release', v_loan.collateral_amount, 'Collateral released after loan repayment', p_loan_id);
  END IF;

  IF v_system_interest > 0 THEN
    INSERT INTO admin_income_ledger (type, amount, description)
    VALUES ('interest_spread', v_system_interest, 'Interest spread from loan repayment ' || substring(p_loan_id::text, 1, 8));
  END IF;

  RETURN json_build_object('success', true, 'interest', ROUND(v_interest * 100) / 100, 'total_owed', ROUND(v_total_owed * 100) / 100, 'days_elapsed', v_days_elapsed);
END;
$$;

-- 8. Atomic daily interest RPC
CREATE OR REPLACE FUNCTION public.atomic_daily_interest(
  p_loan_id UUID,
  p_lender_share NUMERIC,
  p_system_share NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Loan not found');
  END IF;

  IF v_loan.lender_id IS NOT NULL AND p_lender_share > 0 THEN
    PERFORM 1 FROM profiles WHERE user_id = v_loan.lender_id FOR UPDATE;
    UPDATE profiles SET lending_balance = lending_balance + p_lender_share, updated_at = now()
    WHERE user_id = v_loan.lender_id;

    INSERT INTO ledger (user_id, type, amount, description, reference_id)
    VALUES (v_loan.lender_id, 'interest', p_lender_share, 'Daily lending interest', p_loan_id);
  END IF;

  IF p_system_share > 0 THEN
    INSERT INTO admin_income_ledger (type, amount, description)
    VALUES ('interest_spread', p_system_share, 'Interest spread from loan ' || substring(p_loan_id::text, 1, 8));
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- 9. Atomic collateral release RPC
CREATE OR REPLACE FUNCTION public.atomic_release_collateral(
  p_loan_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Loan not found');
  END IF;

  IF v_loan.collateral_amount <= 0 THEN
    RETURN json_build_object('error', 'No collateral to release');
  END IF;

  -- Lock and update borrower profile
  PERFORM 1 FROM profiles WHERE user_id = v_loan.borrower_id FOR UPDATE;
  UPDATE profiles SET 
    vault_balance = vault_balance + v_loan.collateral_amount,
    frozen_balance = GREATEST(0, frozen_balance - v_loan.collateral_amount),
    updated_at = now()
  WHERE user_id = v_loan.borrower_id;

  INSERT INTO ledger (user_id, type, amount, description, reference_id)
  VALUES (v_loan.borrower_id, 'collateral_release', v_loan.collateral_amount, 'Collateral released for completed loan', p_loan_id);

  UPDATE loans SET status = 'completed', updated_at = now() WHERE id = p_loan_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 10. Atomic default loan RPC
CREATE OR REPLACE FUNCTION public.atomic_default_loan(
  p_loan_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Loan not found');
  END IF;

  IF v_loan.collateral_amount > 0 AND v_loan.lender_id IS NOT NULL THEN
    -- Lock profiles
    PERFORM 1 FROM profiles WHERE user_id = v_loan.borrower_id FOR UPDATE;
    PERFORM 1 FROM profiles WHERE user_id = v_loan.lender_id FOR UPDATE;

    UPDATE profiles SET frozen_balance = GREATEST(0, frozen_balance - v_loan.collateral_amount), updated_at = now()
    WHERE user_id = v_loan.borrower_id;

    UPDATE profiles SET 
      vault_balance = vault_balance + v_loan.collateral_amount,
      lending_balance = GREATEST(0, lending_balance - v_loan.principal),
      updated_at = now()
    WHERE user_id = v_loan.lender_id;

    INSERT INTO ledger (user_id, type, amount, description, reference_id) VALUES
      (v_loan.lender_id, 'default_recovery', v_loan.collateral_amount, 'Collateral seized from defaulted loan', p_loan_id),
      (v_loan.borrower_id, 'default', -v_loan.collateral_amount, 'Collateral seized - loan default', p_loan_id);
  END IF;

  UPDATE loans SET status = 'defaulted', updated_at = now() WHERE id = p_loan_id;

  INSERT INTO admin_income_ledger (type, amount, description)
  VALUES ('default_alert', 0, 'Loan ' || substring(p_loan_id::text, 1, 8) || ' defaulted. Borrower: ' || substring(v_loan.borrower_id::text, 1, 8));

  RETURN json_build_object('success', true);
END;
$$;

-- 11. Atomic reject loan (release collateral) RPC
CREATE OR REPLACE FUNCTION public.atomic_reject_loan(
  p_loan_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
BEGIN
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Loan not found or not pending');
  END IF;

  UPDATE loans SET status = 'rejected', updated_at = now() WHERE id = p_loan_id;

  IF v_loan.collateral_amount > 0 THEN
    PERFORM 1 FROM profiles WHERE user_id = v_loan.borrower_id FOR UPDATE;
    UPDATE profiles SET 
      vault_balance = vault_balance + v_loan.collateral_amount,
      frozen_balance = GREATEST(0, frozen_balance - v_loan.collateral_amount),
      updated_at = now()
    WHERE user_id = v_loan.borrower_id;

    INSERT INTO ledger (user_id, type, amount, description, reference_id)
    VALUES (v_loan.borrower_id, 'collateral_release', v_loan.collateral_amount,
      'Collateral released - loan rejected' || COALESCE(': ' || p_rejection_reason, ''), p_loan_id);
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
