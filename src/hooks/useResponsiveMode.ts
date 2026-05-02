import { useEffect, useState } from 'react'

type ResponsiveMode = {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

function getResponsiveMode(): ResponsiveMode {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    }
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches
  const isTablet = window.matchMedia(
    '(min-width: 769px) and (max-width: 1024px)',
  ).matches

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
  }
}

export function useResponsiveMode() {
  const [mode, setMode] = useState<ResponsiveMode>(() => getResponsiveMode())

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)')
    const tabletQuery = window.matchMedia(
      '(min-width: 769px) and (max-width: 1024px)',
    )
    const updateMode = () => setMode(getResponsiveMode())

    mobileQuery.addEventListener('change', updateMode)
    tabletQuery.addEventListener('change', updateMode)

    return () => {
      mobileQuery.removeEventListener('change', updateMode)
      tabletQuery.removeEventListener('change', updateMode)
    }
  }, [])

  return mode
}
