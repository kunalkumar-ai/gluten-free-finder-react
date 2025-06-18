import L from 'leaflet';

// This creates a custom icon using the CSS class defined in App.css
export const restaurantIcon = new L.DivIcon({
  className: 'restaurant-icon',
  iconSize: [18, 18],
});
