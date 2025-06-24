import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { calculateDistance } from '../utils/distance.js';

// --- Leaflet CSS & Custom Icons ---
import 'leaflet/dist/leaflet.css';
const restaurantIcon = new L.DivIcon({ className: 'restaurant-icon' });
const dedicatedIcon = new L.DivIcon({ className: 'dedicated-icon' });
const userLocationIcon = new L.DivIcon({ className: 'user-location-dot', iconSize: [16, 16], iconAnchor: [8, 8] });

// --- UI Sub-Components (These are unchanged) ---

const PlaceDetailCard = ({ place, onClose, userPosition }) => {
  if (!place) return null;

  // NEW: Calculate smart distance if userPosition and place geometry are available
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
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="direction-link" aria-label="Get directions">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
      </a>
    </div>
  );
};

const FilterButtons = ({ activeFilter, onFilterChange, disabled }) => {
  // ... (no changes in this component)
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
    if (a.gf_status === 'Dedicated GF' && b.gf_status !== 'Dedicated GF') return -1;
    if (a.gf_status !== 'Dedicated GF' && b.gf_status === 'Dedicated GF') return 1;
    return 0;
  });
  
  const panelClassName = `list-view-panel ${isOpen ? 'open' : ''}`;

  return (
    <div className={panelClassName}>
      <div className="list-view-header" onClick={onClose}>
        <div className="handle-bar"></div>
        <h2>Nearby Places</h2>
      </div>
      <div className="list-view-content">
        {sortedPlaces.map(place => {
          // NEW: Calculate smart distance for each item in the list
          const smartDistance = userPosition && place.geometry
            ? calculateDistance(userPosition, place.geometry.location)
            : null;

          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}&query_place_id=${place.place_id}`;
          const isDedicated = place.gf_status === 'Dedicated GF';
          return (
            <a href={googleMapsUrl} key={place.place_id} className="list-item" target="_blank" rel="noopener noreferrer">
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

const CitySearchToggle = ({ onClick }) => (
  // ... (no changes in this component)
  <div className="city-search-toggle-container">
    <button onClick={onClick} className="city-search-toggle-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
      </svg>
      Find a City
    </button>
  </div>
);


// --- Main Map Screen Component ---
// MODIFIED: It now receives props from App.jsx
const MapScreen = ({ onNavigateToCitySearch, userPosition, locationError }) => {
  // REMOVED: Geolocation state is now managed in App.jsx
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(true); // This now means "loading places"
  const [error, setError] = useState(null); // This now means "error fetching places"
  const [activeFilter, setActiveFilter] = useState('');
  const [isListViewOpen, setListViewOpen] = useState(false);
  const [map, setMap] = useState(null);
  
  const fetchControllerRef = useRef(null);
  const initialSearchDone = useRef(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';
  
  // REMOVED: The Geolocation useEffect has been moved to App.jsx

  const startSearch = (filterType) => {
    if (!userPosition) return;
    setLoading(true);
    setActiveFilter(filterType);
    setError(null);
    setPlaces([]);
    setSelectedPlace(null);
    setListViewOpen(false);
  };

  // MODIFIED: This useEffect now uses the userPosition prop
  useEffect(() => {
    if (!activeFilter || !userPosition) {
      return;
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    const fetchURL = `${backendUrl}/get-restaurants?lat=${userPosition.lat}&lon=${userPosition.lng}&type=${activeFilter}`;
    
    fetch(fetchURL, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.error) { setError(data.error); } 
        else { setPlaces(data.raw_data || []); }
      })
      .catch(err => {
        if (err.name !== 'AbortError') { setError(`Could not fetch gluten-free ${activeFilter}.`); }
      })
      .finally(() => {
        if (!controller.signal.aborted) { setLoading(false); }
      });
  }, [activeFilter, userPosition]);

  // MODIFIED: This useEffect now uses the userPosition prop
  useEffect(() => {
    if (userPosition && !initialSearchDone.current) {
      setLoading(true); // Start loading when we have a position
      startSearch('restaurants');
      initialSearchDone.current = true;
    }
  }, [userPosition]);
  
  useEffect(() => {
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, []);

  // --- RENDER LOGIC ---
  if (!userPosition && !locationError) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Finding your location...</div>;
  }

  // Use the locationError from props
  const displayError = error || locationError;

  let message = null;
  if (loading) {
    message = `Searching GF ${activeFilter}...`;
  } else if (displayError) {
    message = `Error: ${displayError}`;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="top-ui-container">
        {userPosition && <CitySearchToggle onClick={onNavigateToCitySearch} />}
        <FilterButtons activeFilter={activeFilter} onFilterChange={startSearch} disabled={!userPosition} />
        {message && (
          <div className="map-message-overlay">
            {message}
          </div>
        )}
      </div>

      <MapContainer
        center={userPosition || [52.52, 13.40]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {userPosition && <Marker position={userPosition} icon={userLocationIcon} zIndexOffset={1000} />}

        {places.map(place => (
          place.geometry && place.geometry.location && (
            <Marker
              key={place.place_id}
              position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
              icon={place.gf_status === 'Dedicated GF' ? dedicatedIcon : restaurantIcon}
              eventHandlers={{ click: () => setSelectedPlace(place) }}
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

export default MapScreen;