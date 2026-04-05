import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to save scroll position before navigating away
 * Returns a function to get current scroll position
 */
export const useScrollRestoration = () => {
  const location = useLocation();

  // Save scroll position when component unmounts
  useEffect(() => {
    return () => {
      // Save scroll position in sessionStorage before leaving
      const scrollY = window.scrollY;
      sessionStorage.setItem('scrollPosition', scrollY.toString());
    };
  }, []);

  // Restore scroll position when coming back
  useEffect(() => {
    if (location.state?.scrollPosition !== undefined) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        window.scrollTo({
          top: location.state.scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [location.state]);

  // Function to get current scroll position (for passing to navigation state)
  const getCurrentScrollPosition = () => {
    return window.scrollY;
  };

  return { getCurrentScrollPosition };
};