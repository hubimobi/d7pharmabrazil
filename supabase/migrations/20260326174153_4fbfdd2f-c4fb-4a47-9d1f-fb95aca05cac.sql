UPDATE store_settings 
SET combo_offer_enabled = true, 
    combo_offer_products = '["3bfdf515-1dc4-488c-ac23-7102932a810c", "2f194d0f-a875-4840-988d-2fae4566fdb5"]'::jsonb, 
    combo_offer_discount = 17, 
    combo_offer_free_shipping = true, 
    combo_offer_label = 'OFERTA EXCLUSIVA PARA VOCÊ'
WHERE id = '09ea6465-2be4-4352-867e-c1b417d73591';