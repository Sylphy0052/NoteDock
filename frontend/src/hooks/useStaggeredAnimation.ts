import { useEffect, useState, useRef } from 'react'

interface UseStaggeredAnimationOptions {
  /** Delay between each item's animation start (ms) */
  staggerDelay?: number
  /** Whether to re-animate when items change */
  reanimateOnChange?: boolean
  /** Whether the animation is enabled */
  enabled?: boolean
}

/**
 * Hook to manage staggered animations for list items.
 * Returns a class name to apply to items that should animate.
 *
 * @param itemCount - Number of items to animate
 * @param options - Animation options
 * @returns Object with shouldAnimate boolean and className to apply
 */
export function useStaggeredAnimation(
  itemCount: number,
  options: UseStaggeredAnimationOptions = {}
) {
  const { staggerDelay = 50, reanimateOnChange = false, enabled = true } = options

  const [hasAnimated, setHasAnimated] = useState(false)
  const previousCountRef = useRef(itemCount)

  useEffect(() => {
    if (!enabled) return

    // Check if we should animate
    const shouldAnimate =
      !hasAnimated || (reanimateOnChange && itemCount !== previousCountRef.current)

    if (shouldAnimate && itemCount > 0) {
      // Set animated after all animations would have completed
      const totalDuration = itemCount * staggerDelay + 250 // 250ms is the animation duration
      const timer = setTimeout(() => {
        setHasAnimated(true)
      }, totalDuration)

      return () => clearTimeout(timer)
    }

    previousCountRef.current = itemCount
  }, [itemCount, hasAnimated, reanimateOnChange, staggerDelay, enabled])

  // Reset animation state when enabled changes to false then true
  useEffect(() => {
    if (!enabled) {
      setHasAnimated(false)
    }
  }, [enabled])

  return {
    shouldAnimate: enabled && !hasAnimated,
    className: enabled && !hasAnimated ? 'animate-in' : '',
  }
}

/**
 * Simple hook to get animation class for a specific item index
 */
export function useItemAnimation(index: number, shouldAnimate: boolean) {
  const [isAnimated, setIsAnimated] = useState(!shouldAnimate)

  useEffect(() => {
    if (!shouldAnimate) return

    const delay = index * 50 // 50ms stagger
    const timer = setTimeout(() => {
      setIsAnimated(true)
    }, delay + 250) // Add animation duration

    return () => clearTimeout(timer)
  }, [index, shouldAnimate])

  return {
    className: shouldAnimate && !isAnimated ? 'animate-in' : '',
    isAnimated,
  }
}
