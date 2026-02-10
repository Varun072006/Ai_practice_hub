import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationContext = createContext(null);

export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [historyStack, setHistoryStack] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // Initialize with current location on mount
  useEffect(() => {
    if (!isInitialized) {
      // Don't add login/register to stack
      if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/forgot-password') {
        setHistoryStack([location.pathname]);
        setIsInitialized(true);
      }
    }
  }, [location.pathname, isInitialized]);

  // Clear stack when navigating to login/register (logout scenario)
  useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/register') {
      setHistoryStack([]);
      setIsInitialized(false);
    }
  }, [location.pathname]);

  // Track location changes and update stack
  useEffect(() => {
    if (isInitialized && !isNavigatingBack) {
      const currentPath = location.pathname;

      // Only add to stack if it's a new page (not going back)
      // We'll handle back navigation separately
      if (currentPath !== '/login' &&
        currentPath !== '/register' &&
        currentPath !== '/forgot-password') {
        setHistoryStack(prev => {
          const lastPath = prev[prev.length - 1];
          // Avoid duplicates if same page is visited consecutively
          if (prev.length === 0 || lastPath !== currentPath) {
            // Limit stack size to prevent memory issues (keep last 50 pages)
            const newStack = [...prev, currentPath];
            return newStack.slice(-50);
          }
          return prev;
        });
      }
    }
    // Reset the flag after navigation completes
    if (isNavigatingBack) {
      setIsNavigatingBack(false);
    }
  }, [location.pathname, isInitialized, isNavigatingBack]);

  // Navigate to a new page (pushes to stack)
  const navigateTo = useCallback((path, options = {}) => {
    if (path !== location.pathname) {
      setHistoryStack(prev => {
        const newStack = [...prev, path];
        return newStack.slice(-50); // Limit to 50 pages
      });
      navigate(path, options);
    }
  }, [navigate, location.pathname]);

  // Navigate back using stack
  const navigateBack = useCallback(() => {
    setIsNavigatingBack(true);
    setHistoryStack(prev => {
      if (prev.length <= 1) {
        return ['/dashboard'];
      }
      return prev.slice(0, -1);
    });
  }, []);

  // Perform the actual navigation after the stack state has updated
  useEffect(() => {
    if (isNavigatingBack) {
      const targetPath = historyStack[historyStack.length - 1] || '/dashboard';
      navigate(targetPath, { replace: historyStack.length <= 1 });
    }
  }, [isNavigatingBack, historyStack, navigate]);

  // Replace current page in stack (for redirects)
  const replaceCurrent = useCallback((path) => {
    setHistoryStack(prev => {
      const newStack = [...prev.slice(0, -1), path];
      return newStack.slice(-50);
    });
    navigate(path, { replace: true });
  }, [navigate]);

  // Clear stack (useful for logout)
  const clearStack = useCallback(() => {
    setHistoryStack([]);
    setIsInitialized(false);
  }, []);

  // Get previous page
  const getPreviousPage = useCallback(() => {
    if (historyStack.length <= 1) {
      return '/dashboard';
    }
    return historyStack[historyStack.length - 2] || '/dashboard';
  }, [historyStack]);

  // Check if can go back
  const canGoBack = useCallback(() => {
    return historyStack.length > 1;
  }, [historyStack]);

  const value = {
    historyStack,
    navigateTo,
    navigateBack,
    replaceCurrent,
    clearStack,
    getPreviousPage,
    canGoBack,
    currentPath: location.pathname,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};
