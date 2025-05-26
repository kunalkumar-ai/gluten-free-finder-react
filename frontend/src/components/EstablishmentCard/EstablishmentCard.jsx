// frontend/src/components/EstablishmentCard/EstablishmentCard.jsx
import React from 'react';
import styles from './EstablishmentCard.module.css'; // We'll create these styles next

// These are the props the component expects to receive
function EstablishmentCard({ name, address, statusText, statusClass, searchUrl }) {

  // Construct the full CSS class string for the status badge
  // It combines a general 'gfStatus' class with a specific one like 'gfStatusDedicated'
  // We also provide a fallback to 'gfStatusUnknown' if statusClass is not recognized.
  const fullStatusClass = `${styles.gfStatus} ${styles[statusClass] || styles.gfStatusUnknown}`;

  return (
    <a
      href={searchUrl} // The URL to open when the card is clicked (Google search for now)
      target="_blank" // Opens the link in a new tab
      rel="noopener noreferrer" // Security best practice for target="_blank"
      className={styles.establishmentCard} // The main style for the card
    >
      <h3 className={styles.name}>{name}</h3>
      <span className={fullStatusClass}>{statusText}</span>
      <p className={styles.address}>{address}</p>
    </a>
  );
}

export default EstablishmentCard;