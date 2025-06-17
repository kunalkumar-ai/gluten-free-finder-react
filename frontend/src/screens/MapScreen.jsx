import React, { useState, useEffect } from 'react';
// FIX: Added 'Popup' to the import list
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet CSS ---
import 'leaflet/dist/leaflet.css';

// --- Custom Icons ---
import { restaurantIcon } from '../components/icons/restaurantIcon.js';

// Define the icon for the user's location using CSS
const userLocationIcon = new L.DivIcon({
  className: 'user-location-dot',
  iconSize: [16, 16],
  iconAnchor: [8, 8] // Center the icon
});

// A component for the details card that appears at the bottom
const PlaceDetailCard = ({ place, onClose }) => {
  if (!place) return null;
  
  return (
    <div className="place-detail-card">
      <button className="close-button" onClick={onClose}>×</button>
      <h3>{place.name}</h3>
      <p>{place.address}</p>
      <p><strong>Distance:</strong> {place.distance ? `${place.distance.toFixed(2)} km` : 'N/A'}</p>
      <p><strong>Rating:</strong> {place.rating} ({place.user_ratings_total} reviews)</p>
    </div>
  );
};

// A component for the filter buttons
const FilterButtons = ({ activeFilter, onFilterChange }) => {
  const filters = ['restaurants', 'cafes', 'bakery'];

  return (
    <div className="filter-container">
      {filters.map(filter => (
        <button
          key={filter}
          className={`filter-button ${activeFilter === filter ? 'active' : ''}`}
          onClick={() => onFilterChange(filter)}
        >
          {filter.charAt(0).toUpperCase() + filter.slice(1)}
        </button>
      ))}
    </div>
  );
};


const MapScreen = () => {
  const [position, setPosition] = useState(null); // Will hold the user's location
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); 
  const [dataLoading, setDataLoading] = useState(false); // For when we fetch places data
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [activeFilter, setActiveFilter] = useState('restaurants');

  const backendUrl = 'http://192.168.233.81:5007';

  // Effect to get user's initial location ONCE
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude }); // This will trigger the data fetch
      },
      (geoError) => {
        setError('Could not get your location. Please enable location services.');
        // If location is denied, we can't show the map. The error message will be displayed.
      }
    );
  }, []);

  // Effect to fetch data when position or filter changes
  useEffect(() => {
    // Only run if we have a position
    if (!position) return;

    setDataLoading(true);
    setError(null);
    setPlaces([]); // Clear old places while new ones are loading
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
  }, [position, activeFilter, backendUrl]); // Re-run when filter or position changes


  // --- RENDER LOGIC ---

  // While we are waiting for the user's location, show a loading screen.
  if (!position && !error) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Finding your location...</div>;
  }

  // If there was an error getting the location, show the error message.
  if (error) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px', textAlign: 'center'}}>Error: {error}</div>;
  }

  // If we have the position, render the map.
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      
      <MapContainer 
        center={position} // The map is now created with the correct center from the start
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
            return (
              <Marker 
                key={place.place_id} 
                position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
                icon={restaurantIcon}
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
