ALTER TABLE public.visa_sale_items 
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN payment_due_date date;