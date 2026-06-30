UPDATE public.ds160_forms
SET current_step = 0,
    last_saved_at = now()
WHERE status IN ('in_progress', 'viewed')
  AND status NOT IN ('submitted', 'deleted');