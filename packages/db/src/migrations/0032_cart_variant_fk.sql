ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_variant_id_products_id_fk;

ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_variant_id_product_variants_id_fk;

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_variant_id_product_variants_id_fk
  FOREIGN KEY (variant_id) REFERENCES product_variants(id);
