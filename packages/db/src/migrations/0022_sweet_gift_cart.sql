ALTER TABLE cart_items
ADD COLUMN gift_wrap_selected boolean NOT NULL DEFAULT false,
ADD COLUMN gift_wrap_price decimal(12,2),
ADD COLUMN send_as_gift boolean NOT NULL DEFAULT false,
ADD COLUMN gift_message varchar(1000);
