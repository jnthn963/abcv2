-- Add amount validation constraints
ALTER TABLE public.deposits 
ADD CONSTRAINT deposits_amount_positive 
CHECK (amount > 0 AND amount <= 999999999.99);

ALTER TABLE public.withdrawals 
ADD CONSTRAINT withdrawals_amount_positive 
CHECK (amount > 0 AND amount <= 999999999.99);

ALTER TABLE public.withdrawals
ADD CONSTRAINT withdrawals_fee_non_negative
CHECK (fee >= 0 AND fee <= 999999999.99);

ALTER TABLE public.loans
ADD CONSTRAINT loans_principal_positive
CHECK (principal > 0 AND principal <= 999999999.99);

ALTER TABLE public.loans
ADD CONSTRAINT loans_collateral_non_negative
CHECK (collateral_amount >= 0 AND collateral_amount <= 999999999.99);

ALTER TABLE public.loans
ADD CONSTRAINT loans_interest_rate_valid
CHECK (interest_rate >= 0 AND interest_rate <= 100);

ALTER TABLE public.loans
ADD CONSTRAINT loans_duration_valid
CHECK (duration_days >= 1 AND duration_days <= 3650);

-- Configure storage bucket limits
UPDATE storage.buckets 
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('deposit-proofs', 'qr-codes');