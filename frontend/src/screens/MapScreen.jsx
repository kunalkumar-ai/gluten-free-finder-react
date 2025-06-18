import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet CSS ---
import 'leaflet/dist/leaflet.css';

// --- Custom Icons ---
import { restaurantIcon } from '../components/icons/restaurantIcon.js';
import { dedicatedIcon } from '../components/icons/dedicatedIcon.js';

const userLocationIcon = new L.DivIcon({
  className: 'user-location-dot',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// --- UI Sub-Components ---

const PlaceDetailCard = ({ place, onClose }) => {
  if (!place) return null;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  return (
    <div className="place-detail-card">
      <button className="close-button" onClick={onClose}>×</button>
      <div style={{ paddingRight: '40px' }}>
        <h3>{place.name}</h3>
        <p><strong>Status: {place.gf_status}</strong></p>
        <p>{place.address}</p>
        <p><strong>Distance:</strong> {place.distance ? `${place.distance.toFixed(2)} km` : 'N/A'}</p>
        <p><strong>Rating:</strong> {place.rating} ({place.user_ratings_total} reviews)</p>
      </div>
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="direction-link" aria-label="Get directions">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
        </svg>
      </a>
    </div>
  );
};

const FilterButtons = ({ activeFilter, onFilterChange, disabled }) => {
  const filters = ['restaurants', 'cafes', 'bakery'];
  return (
    <div className="filter-container">
      {filters.map(filter => (
        <button key={filter} className={`filter-button ${activeFilter === filter ? 'active' : ''}`} onClick={() => onFilterChange(filter)} disabled={disabled}>
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
  );
};

// NEW: A component for the full-screen list view panel
const ListViewPanel = ({ places, onClose }) => {
  // Create a sorted copy of the places for rendering
  const sortedPlaces = [...places].sort((a, b) => {
    if (a.gf_status === 'Dedicated GF' && b.gf_status !== 'Dedicated GF') return -1;
    if (a.gf_status !== 'Dedicated GF' && b.gf_status === 'Dedicated GF') return 1;
    return 0;
  });

  return (
    <div className="list-view-panel">
      <div className="list-view-header">
        <h2>Nearby Places</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="list-view-content">
        {sortedPlaces.map(place => {
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
          const isDedicated = place.gf_status === 'Dedicated GF';
          
          return (
            <a href={googleMapsUrl} key={place.place_id} className="list-item" target="_blank" rel="noopener noreferrer">
              <div className={`list-item-icon ${isDedicated ? 'dedicated' : 'offers'}`}></div>
              <div className="list-item-info">
                <h4>{place.name}</h4>
                <p>{isDedicated ? 'Dedicated Gluten-Free' : 'Offers Gluten-Free'}</p>
              </div>
              <p>{place.distance ? `${place.distance.toFixed(2)} km` : ''}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
};


// --- Main Map Screen Component ---
const MapScreen = () => {
  const [position, setPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('restaurants');
  const [isListViewOpen, setListViewOpen] = useState(false); // NEW: State to control list view

  const backendUrl = 'http://192.168.233.81:5007';

  useEffect(() => {
    if (!position) return;
    setLoading(true);
    setError(null);
    setPlaces([]);
    setSelectedPlace(null);

    const fetchURL = `${backendUrl}/get-restaurants?lat=${position.lat}&lon=${position.lng}&type=${activeFilter}`;
    
    fetch(fetchURL)
      .then(res => res.json())
      .then(data => data.error ? setError(data.error) : setPlaces(data.raw_data || []))
      .catch(() => setError(`Could not fetch gluten-free ${activeFilter}.`))
      .finally(() => setLoading(false));
  }, [position, activeFilter, backendUrl]);
  
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setError('Could not get your location.');
        setLoading(false);
      }
    );
  }, []);

  if (!position && loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Finding your location...</div>;
  }
  // ADD THE CONSOLE LOG HERE
  console.log(`Number of places to display: ${places.length}`);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} disabled={loading || isListViewOpen} />
      
      {error && !loading && <div className="summary-card" style={{top: '80px', backgroundColor: '#ffebee', color: '#c62828'}}>{error}</div>}

      <MapContainer 
        center={position || [52.52, 13.40]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {position && <Marker position={position} icon={userLocationIcon} zIndexOffset={1000} />}

        {places.map(place => {
          if (place.geometry && place.geometry.location) {
            const iconToUse = place.gf_status === 'Dedicated GF' ? dedicatedIcon : restaurantIcon;
            return (
              <Marker 
                key={place.place_id} 
                position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
                icon={iconToUse}
                eventHandlers={{ click: () => setSelectedPlace(place) }}
              />
            );
          }
          return null;
        })}
      </MapContainer>
      
      {/* Conditionally render the "Show List" button OR the list panel */}
      {!isListViewOpen ? (
        places.length > 0 && !loading && (
          <button className="list-view-button" onClick={() => setListViewOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
            Show List ({places.length})
          </button>
        )
      ) : (
        <ListViewPanel places={places} onClose={() => setListViewOpen(false)} />
      )}
      
      <PlaceDetailCard place={selectedPlace} onClose={() => setSelectedPlace(null)} />
    </div>
  );
};

export default MapScreen;
