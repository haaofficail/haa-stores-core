'use client'

import { type ReactNode, type CSSProperties } from 'react'

const _textElements = [
  'largeTitle', 'title1', 'title2', 'title3',
  'headline', 'body', 'callout', 'subhead',
  'footnote', 'caption1', 'caption2',
] as const

type TextElement = (typeof _textElements)[number]

interface TextProps {
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label'
  variant?: TextElement
  weight?: 400 | 500 | 600 | 700
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse'
  align?: 'left' | 'center' | 'right'
  children: ReactNode
  style?: CSSProperties
  className?: string
  id?: string
}

const colorMap = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  tertiary: 'var(--text-tertiary)',
  inverse: 'var(--text-inverse)',
}

export function Text({
  as: Tag = 'span',
  variant = 'body',
  weight,
  color = 'primary',
  align,
  children,
  style,
  className,
  id,
}: TextProps) {
  const kebab = variant.replace(/([A-Z])/g, '-$1').toLowerCase()

  return (
    <Tag
      id={id}
      className={className}
      style={{
        fontSize: `var(--typography-${kebab}-size)`,
        fontWeight: weight ?? `var(--typography-${kebab}-font-weight)`,
        lineHeight: `var(--typography-${kebab}-line-height)`,
        letterSpacing: `var(--typography-${kebab}-letter-spacing)`,
        color: colorMap[color],
        fontFamily: 'var(--font-sans)',
        textAlign: align,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
