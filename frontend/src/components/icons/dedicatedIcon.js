import L from 'leaflet';

// This creates a custom icon using the CSS class 'dedicated-icon'
export const dedicatedIcon = new L.DivIcon({
  className: 'dedicated-icon',
  iconSize: [30, 30], // Make it slightly larger to stand out
});
