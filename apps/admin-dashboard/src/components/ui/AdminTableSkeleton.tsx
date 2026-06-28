type AdminTableSkeletonProps = {
  columns?: readonly string[];
  rows?: number;
  className?: string;
};

const DEFAULT_COLUMNS = ['w-32', 'w-40', 'w-16', 'w-12'] as const;

export function AdminTableSkeleton({
  columns = DEFAULT_COLUMNS,
  rows = 5,
  className = '',
}: AdminTableSkeletonProps) {
  return (
    <div className={`p-8 space-y-4 ${className}`}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {columns.map((width, columnIndex) => (
            <div
              key={`${rowIndex}-${columnIndex}`}
              className={`h-4 ${width} bg-gray-200 rounded animate-pulse`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
