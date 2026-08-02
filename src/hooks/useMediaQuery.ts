import { useEffect, useState } from 'react'

/** Match a CSS media query; defaults false until mounted (SSR-safe). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Desktop / tablet landscape layout breakpoint (matches CSS). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 900px)')
}
