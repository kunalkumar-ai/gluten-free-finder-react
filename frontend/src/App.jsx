import React, { useState } from 'react';
import MapScreen from './screens/MapScreen';
// NEW: Import the CitySearchScreen component
import CitySearchScreen from './screens/CitySearchScreen';
import './App.css';

function App() {
  // State to manage which view is shown, defaults to 'live'
  const [currentView, setCurrentView] = useState('live');

  // Function to switch to the city search view
  const navigateToCitySearch = () => {
    setCurrentView('city');
  };

  // Function to switch back to the live search view
  const navigateToLiveSearch = () => {
    setCurrentView('live');
  };

  return (
    <div className="App">
      {/* Conditionally render the correct view based on state */}
      {currentView === 'live' ? (
        <MapScreen onNavigateToCitySearch={navigateToCitySearch} />
      ) : (
        // MODIFIED: Replaced the placeholder with the actual component
        <CitySearchScreen onNavigateToLiveSearch={navigateToLiveSearch} />
      )}
    </div>
  );
}

export default App;