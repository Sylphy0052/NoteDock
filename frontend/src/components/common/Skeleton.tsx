import clsx from 'clsx'

interface SkeletonProps {
  variant?: 'text' | 'title' | 'card' | 'avatar'
  width?: 'short' | 'medium' | 'long' | string
  className?: string
  count?: number
}

export default function Skeleton({ variant = 'text', width, className, count = 1 }: SkeletonProps) {
  const baseClass = 'skeleton'

  const variantClass = {
    text: 'skeleton-text',
    title: 'skeleton-title',
    card: 'skeleton-card',
    avatar: 'skeleton-avatar',
  }[variant]

  const widthClass = width === 'short' || width === 'medium' || width === 'long' ? width : undefined

  const style =
    width && !widthClass ? { width: typeof width === 'string' ? width : undefined } : undefined

  if (count === 1) {
    return <div className={clsx(baseClass, variantClass, widthClass, className)} style={style} />
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={clsx(baseClass, variantClass, widthClass, className)}
          style={style}
        />
      ))}
    </>
  )
}

// Pre-built skeleton layouts
export function NoteCardSkeleton() {
  return (
    <div className="note-card" style={{ padding: '1rem' }}>
      <Skeleton variant="title" />
      <Skeleton variant="text" width="long" />
      <Skeleton variant="text" width="medium" />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="80px" />
      </div>
    </div>
  )
}

export function NoteListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="notes-grid">
      {Array.from({ length: count }).map((_, index) => (
        <NoteCardSkeleton key={index} />
      ))}
    </div>
  )
}
