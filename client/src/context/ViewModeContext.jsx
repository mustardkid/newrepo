
// ViewModeContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';

const ViewModeContext = createContext();

export const ViewModeProvider = ({ children }) => {
  const [viewAsUser, setViewAsUser] = useState(false);

  // Load saved preference from localStorage on initial load
  useEffect(() => {
    const savedPreference = localStorage.getItem('viewAsUser');
    if (savedPreference === 'true') {
      setViewAsUser(true);
    }
  }, []);

  // Update the view mode
  const toggleViewMode = () => {
    const newMode = !viewAsUser;
    setViewAsUser(newMode);
    localStorage.setItem('viewAsUser', newMode ? 'true' : 'false');
  };

  return (
    <ViewModeContext.Provider value={{ viewAsUser, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
