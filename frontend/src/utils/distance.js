// frontend/src/utils/distance.js

/**
 * Calculates the distance between two geographic points in kilometers
 * using the Haversine formula.
 * @param {object} point1 - The first point with lat and lng properties.
 * @param {object} point2 - The second point with lat and lng properties.
 * @returns {number|null} The distance in kilometers, or null if input is invalid.
 */
export const calculateDistance = (point1, point2) => {
    // Return null if we don't have valid points to compare
    if (!point1 || !point2 || !point1.lat || !point1.lng || !point2.lat || !point2.lng) {
      return null;
    }
  
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
    const dLon = (point2.lng - point1.lng) * (Math.PI / 180);
    const lat1 = point1.lat * (Math.PI / 180);
    const lat2 = point2.lat * (Math.PI / 180);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
  
    return distance;
  };