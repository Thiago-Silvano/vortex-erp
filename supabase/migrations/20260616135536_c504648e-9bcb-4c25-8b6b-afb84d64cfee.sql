CREATE OR REPLACE FUNCTION public.get_public_proposal(p_short_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sale public.sales;
  v_result jsonb;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE short_id = p_short_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'sale', jsonb_build_object(
      'id', v_sale.id,
      'short_id', v_sale.short_id,
      'client_name', v_sale.client_name,
      'destination_image_url', v_sale.destination_image_url,
      'destination_image_config', v_sale.destination_image_config,
      'destination_name', v_sale.destination_name,
      'quote_title', v_sale.quote_title,
      'sale_date', v_sale.sale_date,
      'status', v_sale.status,
      'total_sale', v_sale.total_sale,
      'installments', v_sale.installments,
      'notes', v_sale.notes,
      'payment_method', v_sale.payment_method,
      'passengers_count', v_sale.passengers_count,
      'trip_nights', v_sale.trip_nights,
      'trip_start_date', v_sale.trip_start_date,
      'trip_end_date', v_sale.trip_end_date,
      'proposal_payment_options', v_sale.proposal_payment_options,
      'show_individual_values', v_sale.show_individual_values,
      'show_only_total', v_sale.show_only_total,
      'show_per_passenger', v_sale.show_per_passenger,
      'empresa_id', v_sale.empresa_id,
      'quote_id', v_sale.quote_id
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', si.id,
        'description', si.description,
        'total_value', si.total_value,
        'service_catalog_id', si.service_catalog_id,
        'metadata', si.metadata,
        'quote_option_id', si.quote_option_id,
        'images', (
          SELECT COALESCE(jsonb_agg(img.image_url ORDER BY img.sort_order), '[]'::jsonb)
          FROM public.sale_item_images img WHERE img.sale_item_id = si.id
        )
      ) ORDER BY si.sort_order), '[]'::jsonb)
      FROM public.sale_items si WHERE si.sale_id = v_sale.id
    ),
    'passengers', (
      SELECT COALESCE(jsonb_agg(to_jsonb(sp) ORDER BY sp.sort_order), '[]'::jsonb)
      FROM public.sale_passengers sp WHERE sp.sale_id = v_sale.id
    ),
    'receivables', (
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.installment_number), '[]'::jsonb)
      FROM public.receivables r WHERE r.sale_id = v_sale.id
    ),
    'agency', (
      SELECT to_jsonb(a) FROM public.agency_settings a
      WHERE a.empresa_id = v_sale.empresa_id LIMIT 1
    ),
    'catalog', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)), '[]'::jsonb)
      FROM public.services_catalog c
    ),
    'options', (
      SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.order_index), '[]'::jsonb)
      FROM public.sale_quote_options o WHERE o.sale_id = v_sale.id
    ),
    'quote', (
      SELECT jsonb_build_object(
        'client_passengers', q.client_passengers,
        'destination_image_url', q.destination_image_url,
        'trip_departure_date', q.trip_departure_date,
        'trip_destination', q.trip_destination,
        'trip_nights', q.trip_nights,
        'trip_origin', q.trip_origin,
        'trip_return_date', q.trip_return_date
      )
      FROM public.quotes q WHERE q.id = v_sale.quote_id
    ),
    'previous_choices', (
      SELECT pc.selected_item_ids FROM public.client_proposal_choices pc
      WHERE pc.sale_id = v_sale.id ORDER BY pc.submitted_at DESC LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;