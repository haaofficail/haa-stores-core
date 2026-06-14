import { Link } from 'react-router-dom';

interface ProductTitleProps {
  name: string;
  href?: string;
  lines?: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'light' | 'medium' | 'semibold' | 'bold';
  color?: string;
  hoverColor?: string;
  className?: string;
  asLink?: boolean;
}

const linesMap = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
};

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const weightMap = {
  light: 'font-light',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const minHeightMap = {
  1: 'h-[1.25em]',
  2: 'h-[2.5em]',
  3: 'h-[3.75em]',
};

export function ProductTitle({ 
  name, 
  href, 
  lines = 2, 
  size = 'md', 
  weight = 'semibold', 
  color = 'text-black',
  hoverColor = 'text-blue-600',
  className = '',
  asLink = true
}: ProductTitleProps) {
  const Content = asLink && href ? (
    <Link 
      to={href} 
      className={`${linesMap[lines]} ${sizeMap[size]} ${weightMap[weight]} ${color} transition-colors duration-200 group-hover:${hoverColor} ${minHeightMap[lines]} leading-tight ${className}`}
    >
      {name}
    </Link>
  ) : (
    <span className={`${linesMap[lines]} ${sizeMap[size]} ${weightMap[weight]} ${color} ${minHeightMap[lines]} leading-tight ${className}`}>
      {name}
    </span>
  );

  return Content;
}