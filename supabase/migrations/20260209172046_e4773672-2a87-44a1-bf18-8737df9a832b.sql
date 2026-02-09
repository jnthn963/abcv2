
-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 15,
  bank_name TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  account_holder TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Governors can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (has_role(auth.uid(), 'governor'::app_role));

CREATE POLICY "Users can create withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Governors can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (has_role(auth.uid(), 'governor'::app_role));

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets for deposit proofs and QR codes
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);

-- Deposit proofs: users upload their own, governors can view all
CREATE POLICY "Users can upload deposit proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own deposit proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Governors can view all deposit proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deposit-proofs' AND has_role(auth.uid(), 'governor'::app_role));

-- QR codes: public read, governors can upload/update
CREATE POLICY "Anyone can view QR codes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qr-codes');

CREATE POLICY "Governors can upload QR codes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'governor'::app_role));

CREATE POLICY "Governors can update QR codes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'governor'::app_role));

CREATE POLICY "Governors can delete QR codes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'qr-codes' AND has_role(auth.uid(), 'governor'::app_role));
