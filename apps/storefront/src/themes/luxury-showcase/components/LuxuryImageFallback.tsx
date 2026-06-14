export default function LuxuryImageFallback({
  aspectRatio = '1/1',
  icon = 'perfume',
  className = '',
}: {
  aspectRatio?: string;
  icon?: 'perfume' | 'star' | 'gift';
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        aspectRatio,
        backgroundColor: 'var(--lux-image-frame, #F7EFE6)',
      }}
    >
      {icon === 'star' ? (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4L29.09 18.18L44 19.36L32.36 30.54L35.28 46L24 38.54L12.72 46L15.64 30.54L4 19.36L18.91 18.18L24 4Z" fill="var(--lux-primary, #B88A3D)" opacity="0.3"/>
          <path d="M24 10L27.64 20.64L38 21.46L30 29.18L32.24 40L24 34.18L15.76 40L18 29.18L10 21.46L20.36 20.64L24 10Z" fill="var(--lux-primary, #B88A3D)" opacity="0.5"/>
        </svg>
      ) : icon === 'gift' ? (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="18" width="36" height="26" rx="2" fill="var(--lux-primary, #B88A3D)" opacity="0.3"/>
          <path d="M24 18V44M6 18H42M12 18C12 14 15 8 24 8C33 8 36 14 36 18M16 18C16 12 19 6 24 6C29 6 32 12 32 18" stroke="var(--lux-primary, #B88A3D)" strokeWidth="2" opacity="0.5"/>
          <line x1="24" y1="18" x2="24" y2="44" stroke="var(--lux-primary, #B88A3D)" strokeWidth="1.5" opacity="0.3"/>
        </svg>
      ) : (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="34" rx="16" ry="10" fill="var(--lux-primary, #B88A3D)" opacity="0.15"/>
          <path d="M24 8C18 8 14 12 14 18C14 24 24 38 24 38C24 38 34 24 34 18C34 12 30 8 24 8Z" fill="var(--lux-primary, #B88A3D)" opacity="0.35"/>
          <ellipse cx="24" cy="18" rx="4" ry="5" fill="var(--lux-primary, #B88A3D)" opacity="0.5"/>
        </svg>
      )}
    </div>
  );
}
