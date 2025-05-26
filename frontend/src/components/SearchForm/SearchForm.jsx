// frontend/src/components/SearchForm/SearchForm.jsx
import React, { useState } from 'react'; // Import useState for managing form state
import styles from './SearchForm.module.css';

// The onSearch prop will be a function passed from App.jsx to trigger a search
function SearchForm({ onSearch }) {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [selectedType, setSelectedType] = useState('restaurants'); // Default selected type

  const establishmentTypes = [
    { key: 'restaurants', label: 'Restaurants' },
    { key: 'cafes', label: 'Cafes' },
    { key: 'bakery', label: 'Bakery' },
  ];

  const handleTypeButtonClick = (typeKey) => {
    setSelectedType(typeKey);
  };

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default form submission which reloads the page
    if (!city.trim()) {
      alert('Please enter a city name.'); // Simple validation for now
      return;
    }
    // Call the onSearch function passed from App.jsx with the search parameters
    onSearch({ city: city.trim(), country: country.trim(), type: selectedType });
  };

  return (
    <form className={styles.searchContainer} onSubmit={handleSubmit}>
      <div className={styles.searchInputs}>
        <input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={styles.textInput} // Using a general class for text inputs
        />
        <input
          type="text"
          placeholder="Country (optional)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={styles.textInput} // Using a general class for text inputs
        />
      </div>
      <div className={styles.typeButtons}>
        {establishmentTypes.map((type) => (
          <button
            type="button" // Important: type="button" to prevent form submission
            key={type.key}
            onClick={() => handleTypeButtonClick(type.key)}
            className={`${styles.typeButton} ${selectedType === type.key ? styles.selected : ''}`}
          >
            {type.label}
          </button>
        ))}
      </div>
      <button
        type="submit" // This button will trigger the form's onSubmit
        className={styles.searchButton}
      >
        Search
      </button>
    </form>
  );
}

export default SearchForm;