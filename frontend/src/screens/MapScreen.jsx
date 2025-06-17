import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet CSS ---
import 'leaflet/dist/leaflet.css';

// --- Custom Icons ---
import { restaurantIcon } from '../components/icons/restaurantIcon.js';

// A new component for the details card, styled via App.css
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

const MapScreen = () => {
  const [position, setPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null); // State to hold the map instance

  const backendUrl = 'http://192.168.233.81:5007';

  // This effect runs only once to get the user's location and fetch data
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const userPosition = { lat: latitude, lng: longitude };
        setPosition(userPosition);

        const fetchURL = `${backendUrl}/get-restaurants?lat=${latitude}&lon=${longitude}`;
        
        fetch(fetchURL)
          .then(response => response.json())
          .then(data => {
            setPlaces(data.raw_data || []); 
            setLoading(false); 
          })
          .catch(apiError => {
            setError('Could not fetch gluten-free places.');
            setLoading(false);
          });
      },
      (geoError) => {
        setError('Could not get your location.');
        setLoading(false);
        setPosition({ lat: 52.52, lng: 13.40 }); // Fallback location
      }
    );
  }, [backendUrl]);

  // This new effect runs when the position is found and the map is ready.
  // It will fly to the user's location once, and that's it.
  useEffect(() => {
    if (map && position) {
      map.flyTo(position, 14, {
        animate: true,
        duration: 1.5
      });
    }
  }, [position, map]);


  if (loading) return <div>Finding your location and nearby places...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer 
        center={position || [52.52, 13.40]} // Initial center before location is found
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap} // Get the map instance once it's created
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {places.map(place => {
          if (place.geometry && place.geometry.location) {
            const placePosition = {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            };

            return (
              <Marker 
                key={place.place_id} 
                position={placePosition}
                icon={restaurantIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedPlace(place); 
                  },
                }}
              />
            );
          }
          return null; 
        })}
      </MapContainer>
      
      <PlaceDetailCard place={selectedPlace} onClose={() => setSelectedPlace(null)} />
    </div>
  );
};

export default MapScreen;
