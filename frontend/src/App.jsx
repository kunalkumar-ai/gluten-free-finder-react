import React, { useState, useEffect } from 'react';
import MapScreen from './screens/MapScreen';
import CitySearchScreen from './screens/CitySearchScreen';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('live');
  
  // NEW: State for user's position and location error will be managed here
  const [userPosition, setUserPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // NEW: Geolocation logic is now in App.jsx
  useEffect(() => {
    // This runs only once when the app starts
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(userPos);
      },
      () => {
        setLocationError('Location permission denied.');
        // If permission is denied, force the view to city search
        setCurrentView('city');
      }
    );
  }, []); // Empty dependency array means this runs only once on mount

  const navigateToCitySearch = () => {
    setCurrentView('city');
  };

  const navigateToLiveSearch = () => {
    // Only allow navigating back to live if we have a position
    if (userPosition) {
      setCurrentView('live');
    } else {
      // If they denied permission initially, show the error again
      alert('You need to enable location permission in your browser settings to use the live map.');
    }
  };

  return (
    <div className="App">
      {currentView === 'live' ? (
        <MapScreen 
          onNavigateToCitySearch={navigateToCitySearch} 
          userPosition={userPosition}
          locationError={locationError}
        />
      ) : (
        <CitySearchScreen 
          onNavigateToLiveSearch={navigateToLiveSearch} 
          userPosition={userPosition}
        />
      )}
    </div>
  );
}

export default App;