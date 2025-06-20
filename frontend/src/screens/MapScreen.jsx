import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet CSS & Custom Icons ---
import 'leaflet/dist/leaflet.css';
// These are placeholders, ensure you have actual icon components if needed
const restaurantIcon = new L.DivIcon({ className: 'restaurant-icon' });
const dedicatedIcon = new L.DivIcon({ className: 'dedicated-icon' });
const userLocationIcon = new L.DivIcon({ className: 'user-location-dot', iconSize: [16, 16], iconAnchor: [8, 8] });



const LoadingScreen = ({ isHidden }) => {
  return (
    <div className={`loading-screen ${isHidden ? 'hidden' : ''}`}>
      {/* This new div wraps your main content */}
      <div className="loading-content">
        <h1 className="font-poppins">CeliacAI</h1>
        <p>Tap. Find. Eat Gluten-Free.</p>
      </div>
      <footer className="loading-screen-footer">
        powered by celiac-ai
      </footer>
    </div>
  );
};


// --- UI Sub-Components (Unchanged from your file) ---

const PlaceDetailCard = ({ place, onClose }) => {
  if (!place) return null;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
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

const ListViewPanel = ({ places, onClose, isOpen }) => {
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
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
          const isDedicated = place.gf_status === 'Dedicated GF';
          return (
            <a href={googleMapsUrl} key={place.place_id} className="list-item" target="_blank" rel="noopener noreferrer">
              <div className={`list-item-icon ${isDedicated ? 'dedicated' : 'offers'}`}></div>
              <div className="list-item-info"><h4>{place.name}</h4><p>{isDedicated ? 'Dedicated Gluten-Free' : 'Offers Gluten-Free'}</p></div>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [isListViewOpen, setListViewOpen] = useState(false);
  const [map, setMap] = useState(null);
  
  const [isLocating, setIsLocating] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(userPos);
        if (map) {
          map.flyTo(userPos, 13);
        }
        setTimeout(() => {
          setIsLocating(false);
        }, 2000); 
      },
      (geoError) => {
        setError('Could not get your location. Please enable location services in your browser settings.');
        setIsLocating(false);
      }
    );
  }, [map]);


  const handleFilterSearch = (filterType) => {
    if (!position) return;
    setHasSearched(true);
    setLoading(true);
    setActiveFilter(filterType);
    setError(null);
    setPlaces([]);
    setSelectedPlace(null);
    setListViewOpen(false);

    const fetchURL = `${backendUrl}/get-restaurants?lat=${position.lat}&lon=${position.lng}&type=${filterType}`;
    
    fetch(fetchURL)
      .then(res => res.json())
      .then(data => data.error ? setError(data.error) : setPlaces(data.raw_data || []))
      .catch(() => setError(`Could not fetch gluten-free ${filterType}.`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (map && places.length > 0) {
      const bounds = new L.LatLngBounds();
      places.forEach(place => {
        if(place.geometry && place.geometry.location) {
          bounds.extend([place.geometry.location.lat, place.geometry.location.lng]);
        }
      });
      if (position) {
        bounds.extend([position.lat, position.lng]);
      }
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [places, map, position]);

  let message = null;
  if (error) {
    message = `Error: ${error}`;
  } else if (hasSearched && !loading && places.length === 0) {
      message = `No ${activeFilter} found nearby.`;
  } else if (!hasSearched && !loading) {
    message = "Select a filter to begin";
  } else if (loading) {
    message = `Searching GF ${activeFilter}...`;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <LoadingScreen isHidden={!isLocating} />

      <div style={{ visibility: isLocating ? 'hidden' : 'visible', height: '100%', width: '100%', transition: 'visibility 0s 0.5s' }}>
        <FilterButtons activeFilter={activeFilter} onFilterChange={handleFilterSearch} disabled={loading || !position} />
        
        {message && (
          <div 
            className="map-message-overlay" 
            style={{backgroundColor: error ? '#ffebee' : 'rgba(255, 255, 255, 0.9)', color: error ? '#c62828' : '#555'}}
          >
            {message}
          </div>
        )}

        <MapContainer 
          center={position || [52.52, 13.40]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          whenCreated={setMap}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {position && <Marker position={position} icon={userLocationIcon} zIndexOffset={1000} />}

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
        
        <ListViewPanel places={places} onClose={() => setListViewOpen(false)} isOpen={isListViewOpen} />
        
        <PlaceDetailCard place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      </div>
    </div>
  );
};

export default MapScreen;