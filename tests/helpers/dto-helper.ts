type AnyRecord = Record<string, unknown>;

export function toPublicProduct(product: AnyRecord): AnyRecord {
  const { cost: _cost, images, ...rest } = product;
  const imageUrls: string[] = Array.isArray(images) ? images.map((img: any) => img.url ?? img) : [];
  return { ...rest, images: imageUrls };
}
