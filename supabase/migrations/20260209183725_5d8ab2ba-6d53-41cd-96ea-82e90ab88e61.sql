
-- Validate loan status transitions via trigger
CREATE OR REPLACE FUNCTION public.validate_loan_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Terminal states cannot transition
  IF OLD.status IN ('rejected', 'defaulted', 'completed') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', OLD.status;
  END IF;

  -- Valid transitions
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    RETURN NEW;
  ELSIF OLD.status = 'approved' AND NEW.status IN ('completed', 'defaulted') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid loan status transition: % → %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER enforce_loan_status_transition
  BEFORE UPDATE OF status ON public.loans
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_loan_status_transition();
