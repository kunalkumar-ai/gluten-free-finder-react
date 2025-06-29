import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { calculateDistance } from '../utils/distance.js';
import ReactGA from "react-ga4";
// --- Leaflet CSS & Custom Icons ---
import 'leaflet/dist/leaflet.css';

const restaurantIcon = new L.DivIcon({ className: 'restaurant-icon' });
const dedicatedIcon = new L.DivIcon({ className: 'dedicated-icon' });

// --- UI Sub-Components ---

const PlaceDetailCard = ({ place, onClose, userPosition }) => {
  if (!place) return null;

  // NEW: Calculate smart distance if userPosition is available
  const smartDistance = userPosition && place.geometry
    ? calculateDistance(userPosition, place.geometry.location)
    : null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}&query_place_id=${place.place_id}`;
  return (
    <div className="place-detail-card">
      <button className="close-button" onClick={onClose}>×</button>
      <div style={{ paddingRight: '40px' }}>
        <h3>{place.name}</h3>
        <p><strong>Status: {place.gf_status}</strong></p>
        <p>{place.address}</p>
        
        {/* MODIFIED: Conditionally display the smart distance */}
        {smartDistance !== null && (
          <p><strong>Distance:</strong> {`${smartDistance.toFixed(2)} km`}</p>
        )}

        <p><strong>Rating:</strong> {place.rating} ({place.user_ratings_total} reviews)</p>
      </div>
      <a 
        href={googleMapsUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="direction-link" 
        aria-label="Get directions"
        onClick={() => ReactGA.event({
          category: "Engagement",
          action: "Click Get Directions",
          label: place.name
        })}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
      </a>
    </div>
  );
};

const FilterButtons = ({ activeFilter, onFilterChange, disabled }) => {
  const filters = ['restaurants', 'cafes', 'bakery'];
  return (
    <div className="filter-container">
      {filters.map(filter => (
        <button
          key={filter}
          className={`filter-button ${activeFilter === filter ? 'active' : ''}`}
          onClick={() => onFilterChange(filter)}
          disabled={disabled}>
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
  );
};

const ListViewPanel = ({ places, onClose, isOpen, userPosition }) => {
  const sortedPlaces = [...places].sort((a, b) => {
    // ... sort logic is unchanged
    if (a.gf_status === 'Dedicated GF' && b.gf_status !== 'Dedicated GF') return -1;
    if (a.gf_status !== 'Dedicated GF' && b.gf_status === 'Dedicated GF') return 1;
    return 0;
  });
  
  const panelClassName = `list-view-panel ${isOpen ? 'open' : ''}`;

  return (
    <div className={panelClassName}>
      <div className="list-view-header">
        <div className="handle-bar"></div>
        <h2>Nearby Places</h2>
        <button onClick={onClose} className="list-view-close-button">×</button>
      </div>
      <div className="list-view-content">
        {sortedPlaces.map(place => {
          // NEW: Calculate smart distance for each item
          const smartDistance = userPosition && place.geometry
            ? calculateDistance(userPosition, place.geometry.location)
            : null;

          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}&query_place_id=${place.place_id}`;
          const isDedicated = place.gf_status === 'Dedicated GF';
          return (
            <a 
              href={googleMapsUrl} 
              key={place.place_id} 
              className="list-item" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => ReactGA.event({
                category: "Engagement",
                action: "View Place Details",
                label: `City List - ${place.name}`
              })}
            >
              <div className={`list-item-icon ${isDedicated ? 'dedicated' : 'offers'}`}></div>
              <div className="list-item-info"><h4>{place.name}</h4><p>{isDedicated ? 'Dedicated Gluten-Free' : 'Offers Gluten-Free'}</p></div>
              
              {/* MODIFIED: Conditionally display the smart distance */}
              {smartDistance !== null && (
                <p>{`${smartDistance.toFixed(2)} km`}</p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
};

// CORRECTION 1: Moved ChangeMapView to be its own component
function ChangeMapView({ coords }) {
    const map = useMap();
    map.flyTo(coords, 13);
    return null; // This component renders nothing to the screen
}

const CitySearchBar = ({ onSearch, cityInput, setCityInput, onReset, loading }) => {
    const handleSubmit = (e) => {
      e.preventDefault();
      onSearch();
    };
  
    return (
      <div className="city-search-bar-container">
        <form onSubmit={handleSubmit} style={{display: 'flex', flexGrow: 1}}>
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Enter location and press enter..."
            className="city-search-input"
            disabled={loading}
          />
        </form>
        <button onClick={onReset} className="reset-location-button" aria-label="Reset to my location" title="Reset to my location">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
        </button>
      </div>
    );
};


// --- The Main City Search Screen Component ---
const CitySearchScreen = ({ onNavigateToLiveSearch, userPosition }) => {
  const [cityInput, setCityInput] = useState('');
  const [searchCoordinates, setSearchCoordinates] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('restaurants');
  const [isListViewOpen, setListViewOpen] = useState(false);
  const [map, setMap] = useState(null);
  
  const fetchControllerRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';

  const handleSearch = async () => {
    if (!cityInput.trim()) {
      setError("Please enter a city.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // This function now ONLY fetches coordinates and sets the state.
      const coordsResponse = await fetch(`${backendUrl}/find-city-coordinates?city=${cityInput}`);
      const cityCoords = await coordsResponse.json();
      if (!coordsResponse.ok) {
        throw new Error(cityCoords.error || "Could not find that city.");
      }
      setSearchCoordinates(cityCoords);
    } catch (err) {
      setError(err.message);
      setLoading(false); // Set loading false only on error here
    }
  };

  const handlePlaceSelect = (place) => {
    setSelectedPlace(place);
    ReactGA.event({
      category: "Engagement",
      action: "View Place Details",
      label: `City Map - ${place.name}` // Track that the click came from the city map
    });
  };



// NEW: This useEffect makes the search "reactive"
  useEffect(() => {
  // Don't run if we don't have coordinates or a filter
  if (!searchCoordinates || !activeFilter) {
    return;
  }

  // This logic is now inside the useEffect
  setLoading(true);
  setError(null);
  setPlaces([]);
  setListViewOpen(false);

  if (fetchControllerRef.current) {
    fetchControllerRef.current.abort();
  }
  const controller = new AbortController();
  fetchControllerRef.current = controller;

  const placesURL = `${backendUrl}/get-restaurants?lat=${searchCoordinates.lat}&lon=${searchCoordinates.lng}&type=${activeFilter}&city=${encodeURIComponent(cityInput)}`;
  
  fetch(placesURL, { signal: controller.signal })
    .then(res => res.json())
    .then(placesData => {
      if (placesData.error) {
        throw new Error(placesData.error || "Could not fetch places.");
      }
      
      const placesFound = placesData.raw_data || [];
      setPlaces(placesFound);

      // NEW: Send event to Google Analytics if results were found
      if (placesFound.length > 0) {
        ReactGA.event({
          category: "Search",
          action: "City Search Success",
          label: `${cityInput} - ${activeFilter}`, // e.g., 'Berlin - restaurants'
          value: placesFound.length
        });
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    })
    .finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });
}, [searchCoordinates, activeFilter]); // It runs when coordinates or filter change

// NEW: This useEffect resets the search when the input is cleared
useEffect(() => {
  // If the input is empty, reset the search state
  if (cityInput.trim() === '') {
    setSearchCoordinates(null);
    setPlaces([]);
    setError(null);
  }
}, [cityInput]); // This hook watches only the cityInput text
// Prepare the message variable before the return statement
let message = null;
if (loading) {
  message = "Searching...";
} else if (error) {
  message = `Error: ${error}`;
}

return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>

    {/* NEW: A single container for all top UI elements */}
    <div className="top-ui-container">
      <CitySearchBar
        onSearch={handleSearch}
        cityInput={cityInput}
        setCityInput={setCityInput}
        onReset={onNavigateToLiveSearch}
        loading={loading}
      />
      
      <FilterButtons 
        activeFilter={activeFilter} 
        onFilterChange={setActiveFilter} 
        disabled={loading} 
      />
      
      {message && <div className="map-message-overlay">{message}</div>}
    </div>


    <MapContainer
      center={[51.505, -0.09]}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      whenCreated={setMap}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
      />

      {searchCoordinates && <ChangeMapView coords={searchCoordinates} />}

      {places.map(place => (
        place.geometry && place.geometry.location && (
          <Marker
            key={place.place_id}
            position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
            icon={place.gf_status === 'Dedicated GF' ? dedicatedIcon : restaurantIcon}
            eventHandlers={{ click: () => handlePlaceSelect(place) }}
          />
        )
      ))}
    </MapContainer>
    
    {!isListViewOpen && places.length > 0 && !loading && (
      <button className="list-view-button" onClick={() => setListViewOpen(true)}>
        Offers ({places.length})
      </button>
    )}
    
    <ListViewPanel 
        places={places} 
        onClose={() => setListViewOpen(false)} 
        isOpen={isListViewOpen}
        userPosition={userPosition}
    />
    <PlaceDetailCard 
        place={selectedPlace} 
        onClose={() => setSelectedPlace(null)} 
        userPosition={userPosition}
    />
  </div>
);
}; 

export default CitySearchScreen;