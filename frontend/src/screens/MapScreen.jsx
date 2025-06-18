import React, { useState, useEffect } from 'react';
// FIX: Added 'Popup' to the import list from your original file
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet CSS ---
import 'leaflet/dist/leaflet.css';

// --- Custom Icons ---
import { restaurantIcon } from '../components/icons/restaurantIcon.js';
// NEW: Import the dedicatedIcon
import { dedicatedIcon } from '../components/icons/dedicatedIcon.js';

// Define the icon for the user's location using CSS
const userLocationIcon = new L.DivIcon({
  className: 'user-location-dot',
  iconSize: [16, 16],
  iconAnchor: [8, 8] // Center the icon
});

// A component for the details card that appears at the bottom
const PlaceDetailCard = ({ place, onClose }) => {
  if (!place) return null;

  // Construct the Google Maps URL using the place_id for accuracy
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
  
  return (
    <div className="place-detail-card">
      <button className="close-button" onClick={onClose}>×</button>
      <div style={{ paddingRight: '40px' }}> {/* Add padding to prevent text from overlapping the new button */}
        <h3>{place.name}</h3>
        <p><strong>Status: {place.gf_status || 'Offers GF'}</strong></p>
        <p>{place.address}</p>
        <p><strong>Distance:</strong> {place.distance ? `${place.distance.toFixed(2)} km` : 'N/A'}</p>
        <p><strong>Rating:</strong> {place.rating} ({place.user_ratings_total} reviews)</p>
      </div>
      
      {/* NEW: Link to Google Maps */}
      <a 
        href={googleMapsUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="direction-link"
        aria-label="Get directions on Google Maps"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
        </svg>
      </a>
    </div>
  );
};

// A component for the filter buttons
const FilterButtons = ({ activeFilter, onFilterChange, disabled }) => {
  const filters = ['restaurants', 'cafes', 'bakery'];

  return (
    <div className="filter-container">
      {filters.map(filter => (
        <button
          key={filter}
          className={`filter-button ${activeFilter === filter ? 'active' : ''}`}
          onClick={() => onFilterChange(filter)}
          disabled={disabled}
        >
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
  );
};


const MapScreen = () => {
  const [position, setPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); 
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [activeFilter, setActiveFilter] = useState('restaurants');

  const backendUrl = 'http://192.168.233.81:5007';

  // Effect to get user's initial location ONCE
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
      },
      (geoError) => {
        setError('Could not get your location. Please enable location services.');
      }
    );
  }, []);

  // Effect to fetch data when position or filter changes
  useEffect(() => {
    if (!position) return;

    setDataLoading(true);
    setError(null);
    setPlaces([]);
    setSelectedPlace(null);

    const fetchURL = `${backendUrl}/get-restaurants?lat=${position.lat}&lon=${position.lng}&type=${activeFilter}`;
    
    fetch(fetchURL)
      .then(response => response.json())
      .then(data => {
        setPlaces(data.raw_data || []); 
      })
      .catch(apiError => {
        setError(`Could not fetch gluten-free ${activeFilter}.`);
      })
      .finally(() => {
        setDataLoading(false); 
      });
  }, [position, activeFilter, backendUrl]);


  // --- RENDER LOGIC ---

  if (!position && !error) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Finding your location...</div>;
  }

  if (error && places.length === 0) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px', textAlign: 'center'}}>Error: {error}</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} disabled={dataLoading} />
      
      <MapContainer 
        center={position || [52.52, 13.40]} // Use fallback if position is not yet set
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {position && (
            <Marker 
                position={position} 
                icon={userLocationIcon}
                zIndexOffset={1000}
            >
                <Popup>You are here</Popup>
            </Marker>
        )}

        {places.map(place => {
          if (place.geometry && place.geometry.location) {
            // --- NEW: Logic to choose the correct icon ---
            const iconToUse = place.gf_status === 'Dedicated GF' ? dedicatedIcon : restaurantIcon;
            
            return (
              <Marker 
                key={place.place_id} 
                position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
                icon={iconToUse} // Use the conditionally chosen icon
                eventHandlers={{
                  click: () => setSelectedPlace(place),
                }}
              />
            );
          }
          return null; 
        })}
      </MapContainer>
      
      {dataLoading && <div style={{position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'}}>Finding {activeFilter}...</div>}
      
      <PlaceDetailCard place={selectedPlace} onClose={() => setSelectedPlace(null)} />
    </div>
  );
};

export default MapScreen;
