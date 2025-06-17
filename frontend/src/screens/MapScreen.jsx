import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Leaflet CSS and Icon Fix ---
import 'leaflet/dist/leaflet.css';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});
// --- End Leaflet Fix ---


// A helper component to automatically move the map view when the location changes
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const MapScreen = () => {
  // State to hold the user's location, loading status, errors, and place data
  const [position, setPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This code runs once when the component first loads
    
    // 1. Get the user's location from the browser
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const userPosition = { lat: latitude, lng: longitude };
        console.log("📍 Location found:", userPosition);
        setPosition(userPosition);

        // 2. Fetch data from YOUR backend using the found coordinates
        // IMPORTANT: Make sure your backend (Flask) server is running!
        fetch(`http://127.0.0.1:5007/get-restaurants?lat=${latitude}&lon=${longitude}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then(data => {
            console.log("✅ Data received from backend:", data);
            setPlaces(data.raw_data || []); 
            setLoading(false); 
          })
          .catch(apiError => {
            console.error("API Error:", apiError);
            setError('Could not fetch gluten-free places.');
            setLoading(false);
          });
      },
      (geoError) => {
        console.error("Geolocation Error:", geoError);
        setError('Could not get your location. Please enable location services for this site.');
        setLoading(false);
        setPosition({ lat: 52.52, lng: 13.40 });
      }
    );
  }, []); 

  // --- Render Logic ---

  if (loading) {
    return <div>Loading Map and Finding Your Location...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!position) {
    return <div>Waiting for location...</div>;
  }

  return (
    <MapContainer center={position} zoom={13} style={{ height: '100vh', width: '100%' }}>
      <ChangeView center={position} zoom={13} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Marker for the user's current position */}
      <Marker position={position}>
        <Popup>You are here</Popup>
      </Marker>

      {/* Markers for the gluten-free places */}
      {places.map(place => {
        // FIX: The Google Places API provides geometry.location.lat/lng
        // The check below ensures we don't try to render a marker without valid coordinates.
        if (place.geometry && place.geometry.location) {
          const placePosition = {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          };

          return (
            <Marker 
              key={place.place_id} 
              position={placePosition}
            >
              <Popup>
                <b>{place.name}</b><br />
                {place.address}<br />
                Distance: {place.distance ? `${place.distance.toFixed(2)} km` : 'N/A'}
              </Popup>
            </Marker>
          );
        }
        return null; // Don't render a marker if location data is missing
      })}
    </MapContainer>
  );
};

export default MapScreen;
