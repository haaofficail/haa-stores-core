ALTER TABLE "store_settings" ADD COLUMN "product_features" jsonb DEFAULT '{"imageLightbox":true,"stickyCart":true,"trustBadges":true,"reviews":true,"shareButton":true,"deliveryEstimate":true,"sizeGuide":true,"alsoBought":true,"recentlyViewed":true,"priceAlert":true,"giftWrap":true,"stockBar":true,"liveViewers":true,"compareBadges":true}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_user_id_unique" UNIQUE("tenant_id","user_id");--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_slug_unique" UNIQUE("store_id","slug");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_sku_unique" UNIQUE("store_id","sku");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_phone_unique" UNIQUE("store_id","phone");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_order_number_unique" UNIQUE("store_id","order_number");--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_store_id_code_unique" UNIQUE("store_id","code");