
// AdminBar.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession'; // Adjust import path based on your project structure

// Icons - you can replace these with your preferred icon library
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

const AdminBar = () => {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [viewAsUser, setViewAsUser] = useState(false);
  const [position, setPosition] = useState('bottom'); // 'top' or 'bottom'
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { session } = useSession(); // Assuming you have a session hook

  // Navigation links with their paths and search keywords
  const navigationLinks = [
    {
      category: 'Admin',
      links: [
        { name: 'Admin Dashboard', path: '/admin', keywords: ['admin', 'dashboard', 'overview'] },
        { name: 'User Management', path: '/admin/users', keywords: ['users', 'accounts', 'management'] },
        { name: 'Content Moderation', path: '/admin/videos', keywords: ['content', 'videos', 'moderation'] },
        { name: 'Revenue Management', path: '/admin/revenue', keywords: ['revenue', 'earnings', 'money'] },
        { name: 'System Settings', path: '/admin/settings', keywords: ['settings', 'configuration', 'system'] },
      ]
    },
    {
      category: 'Creator',
      links: [
        { name: 'Creator Dashboard', path: '/dashboard', keywords: ['creator', 'dashboard', 'my account'] },
        { name: 'Upload Interface', path: '/upload', keywords: ['upload', 'new video'] },
        { name: 'My Videos', path: '/my-videos', keywords: ['my videos', 'content', 'uploads'] },
        { name: 'Creator Earnings', path: '/earnings', keywords: ['earnings', 'revenue', 'income'] },
        { name: 'Analytics', path: '/analytics', keywords: ['analytics', 'stats', 'performance'] },
      ]
    }
  ];

  // Flatten navigation links for search
  const allLinks = navigationLinks.flatMap(category => category.links);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allLinks.filter(link => 
      link.name.toLowerCase().includes(query) || 
      link.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
    
    setSearchResults(results);
  }, [searchQuery]);

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Command+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setExpanded(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 10);
      }

      // Escape to close search results or collapse bar
      if (e.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('');
        } else if (expanded) {
          setExpanded(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, searchQuery]);

  // Check if user is admin - adjust based on your auth system
  const isAdmin = session?.user?.role === 'admin';

  // If not admin, don't render the component
  if (!isAdmin) {
    return null;
  }

  // Toggle "View as User" mode
  const toggleViewMode = () => {
    setViewAsUser(!viewAsUser);
    // Here you would implement the actual view switching logic
    // This could involve changing a global state, setting a cookie, etc.
    localStorage.setItem('viewAsUser', !viewAsUser ? 'true' : 'false');
    // You might want to reload the page or update state in a parent component
  };

  // Toggle bar position between top and bottom
  const togglePosition = () => {
    setPosition(position === 'top' ? 'bottom' : 'top');
  };

  // Navigate to a path and reset search
  const navigateTo = (path) => {
    navigate(path);
    setSearchQuery('');
    if (!expanded) {
      setExpanded(false);
    }
  };

  return (
    <div 
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-50 transition-all duration-300 ease-in-out`}
    >
      {/* Main bar */}
      <div 
        className={`
          bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-md text-white
          border-t border-purple-500/30 shadow-lg
          ${expanded ? 'p-4' : 'p-2'} transition-all duration-300
        `}
      >
        <div className="container mx-auto">
          {/* Collapsed view */}
          {!expanded && (
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setExpanded(true)}
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
              >
                <ExpandIcon />
                <span className="text-sm font-medium">RideReels Admin</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={togglePosition}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                >
                  Move to {position === 'top' ? 'Bottom' : 'Top'}
                </button>
                
                <div className="text-xs bg-pink-600/80 px-2 py-1 rounded-full">
                  {viewAsUser ? 'Viewing as User' : 'Admin View'}
                </div>
              </div>
            </div>
          )}
          
          {/* Expanded view */}
          {expanded && (
            <div className="space-y-4">
              {/* Header with search and controls */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
                <div className="flex items-center">
                  <button 
                    onClick={() => setExpanded(false)}
                    className="mr-4 text-white/80 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold">RideReels Admin Navigation</h2>
                </div>
                
                <div className="flex items-center space-x-4 w-full md:w-auto">
                  {/* Search input */}
                  <div className="relative flex-grow md:w-64">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/60">
                      <SearchIcon />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 border border-purple-500/30 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-white/50 text-white"
                      placeholder="Search pages (Ctrl+K)..."
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/60 hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* View toggle */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-white/80">Admin</span>
                    <button 
                      onClick={toggleViewMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500/50 ${viewAsUser ? 'bg-pink-600' : 'bg-gray-700'}`}
                    >
                      <span 
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${viewAsUser ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                    <span className="text-xs text-white/80">User</span>
                  </div>
                  
                  <button 
                    onClick={togglePosition}
                    className="text-xs text-white/70 hover:text-white transition-colors bg-white/10 px-2 py-1 rounded"
                  >
                    Move to {position === 'top' ? 'Bottom' : 'Top'}
                  </button>
                </div>
              </div>
              
              {/* Search Results */}
              {searchQuery && searchResults.length > 0 && (
                <div className="bg-white/10 rounded-lg p-2 border border-purple-500/30">
                  <h3 className="text-sm font-medium mb-2 px-2">Search Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchResults.map((link, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigateTo(link.path)}
                        className="text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex items-center space-x-2"
                      >
                        <span>{link.name}</span>
                        <span className="text-xs text-white/50">{link.path}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Navigation Links - Only show when not searching */}
              {(!searchQuery || searchResults.length === 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {navigationLinks.map((category, idx) => (
                    <div key={idx} className="bg-white/10 rounded-lg p-3 border border-purple-500/30">
                      <h3 className="text-sm font-medium mb-2 px-1 text-pink-300">{category.category}</h3>
                      <div className="space-y-1">
                        {category.links.map((link, linkIdx) => (
                          <button
                            key={linkIdx}
                            onClick={() => navigateTo(link.path)}
                            className="w-full text-left px-3 py-2 rounded hover:bg-white/10 transition-colors flex justify-between items-center"
                          >
                            <span>{link.name}</span>
                            <span className="text-xs text-white/50">{link.path}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Footer with shortcuts */}
              <div className="mt-2 text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-1">
                <span>Press <kbd className="px-1 py-0.5 bg-white/20 rounded">Ctrl+K</kbd> to search</span>
                <span>Press <kbd className="px-1 py-0.5 bg-white/20 rounded">Esc</kbd> to close</span>
                <span className="ml-auto">{viewAsUser ? 'Currently viewing as regular user' : 'Currently in admin mode'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBar;
