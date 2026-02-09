
CREATE OR REPLACE FUNCTION public.atomic_distribute_profits(p_year integer, p_total_profit numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_vault NUMERIC;
  v_member RECORD;
  v_share NUMERIC;
  v_distributed NUMERIC := 0;
  v_count INTEGER := 0;
BEGIN
  -- Check if already distributed for this year
  IF EXISTS (SELECT 1 FROM profit_distribution_history WHERE year = p_year) THEN
    RETURN json_build_object('error', 'Profits already distributed for year ' || p_year);
  END IF;

  IF p_total_profit <= 0 THEN
    RETURN json_build_object('error', 'No profit to distribute');
  END IF;

  -- Get total vault balances
  SELECT COALESCE(SUM(vault_balance), 0) INTO v_total_vault FROM profiles WHERE vault_balance > 0;
  IF v_total_vault <= 0 THEN
    RETURN json_build_object('error', 'No eligible members with vault balance');
  END IF;

  -- Distribute proportionally
  FOR v_member IN SELECT user_id, vault_balance FROM profiles WHERE vault_balance > 0 FOR UPDATE LOOP
    v_share := ROUND((v_member.vault_balance / v_total_vault) * p_total_profit, 2);
    IF v_share > 0 THEN
      UPDATE profiles SET vault_balance = vault_balance + v_share, updated_at = now()
      WHERE user_id = v_member.user_id;

      INSERT INTO ledger (user_id, type, amount, description)
      VALUES (v_member.user_id, 'interest', v_share, 'Annual profit distribution (' || p_year || ')');

      v_distributed := v_distributed + v_share;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Record distribution
  INSERT INTO profit_distribution_history (year, total_profit, distributed_amount)
  VALUES (p_year, p_total_profit, v_distributed);

  RETURN json_build_object('success', true, 'distributed', v_distributed, 'members', v_count);
END;
$$;
