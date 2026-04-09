
CREATE TABLE public.whatsapp_conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.whatsapp_labels(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, label_id)
);

ALTER TABLE public.whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage conversation labels for their company"
  ON public.whatsapp_conversation_labels
  FOR ALL
  TO authenticated
  USING (empresa_id IN (SELECT id FROM public.companies))
  WITH CHECK (empresa_id IN (SELECT id FROM public.companies));
