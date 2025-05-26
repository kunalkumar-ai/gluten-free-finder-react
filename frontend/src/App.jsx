// frontend/src/App.jsx
import React, { useState } from 'react';
import styles from './App.module.css'; // For App layout and feedback messages
import Header from './components/Header/Header.jsx';
import Navigation from './components/Navigation/Navigation.jsx';
import SearchForm from './components/SearchForm/SearchForm.jsx';
import ResultsList from './components/ResultsList/ResultsList.jsx';
import AdvisoryNote from './components/AdvisoryNote/AdvisoryNote.jsx'; // Import AdvisoryNote

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null); // Will store { result: "...", raw_data: [...] }
  const [lastSearchedCity, setLastSearchedCity] = useState(''); // For ResultsList context

  const handleSearchTrigger = async (searchParams) => {
    // searchParams will be an object like { city: 'New York', country: 'USA', type: 'restaurants' }
    console.log("Search triggered in App with params:", searchParams);
    setIsLoading(true);
    setError(null);
    setSearchResults(null); // Clear previous results
    setLastSearchedCity(searchParams.city); // Store the city for context

    // --- IMPORTANT: Configure your backend URL ---
    // For testing on the same machine as your backend:
    const backendHost = 'http://127.0.0.1:5007';
    // For testing on your mobile phone (replace with YOUR computer's network IP):
    // const backendHost = 'http://192.168.233.81:5007'; // Example IP (replace with your actual IP)

    const queryParams = new URLSearchParams({
        city: searchParams.city,
        type: searchParams.type,
    });

    if (searchParams.country && searchParams.country.trim() !== '') {
        queryParams.append('country', searchParams.country.trim());
    }

    const fetchURL = `${backendHost}/get-restaurants?${queryParams.toString()}`;
    
    console.log("Fetching from URL:", fetchURL);

    try {
      const response = await fetch(fetchURL);
      if (!response.ok) {
        // Try to parse error from backend, otherwise use HTTP status
        const errorData = await response.json().catch(() => ({ error: `HTTP error! Status: ${response.status}` }));
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Data fetched successfully:", data);

      if (data && typeof data.result === 'string') {
        setSearchResults(data);
      } else {
        console.error("Received data is not in the expected format:", data);
        throw new Error("Received data is not in the expected format or 'result' field is missing/invalid.");
      }

    } catch (e) {
      console.error("Fetch error:", e);
      setError(e.message || "Failed to fetch results. Please try again.");
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.appContainer}>
      <Header />
      <Navigation />
      <SearchForm onSearch={handleSearchTrigger} />

      {/* Display loading message */}
      {isLoading && <p className={styles.feedbackMessage}>Searching... This may take a moment.</p>}
      
      {/* Display error message */}
      {!isLoading && error && <p className={`${styles.feedbackMessage} ${styles.errorMessage}`}>Error: {error}</p>}
      
      {/* Display ResultsList and AdvisoryNote if data is available, not loading, and no error */}
      {!isLoading && !error && searchResults && (
        <> {/* Use a Fragment to group ResultsList and AdvisoryNote */}
          <ResultsList 
            searchResults={searchResults} 
            originalCityQuery={lastSearchedCity} 
          />
          <AdvisoryNote /> {/* Display the advisory note below the results */}
        </>
      )}
      
      {/* Display initial prompt if no search yet, not loading, and no error */}
      {!isLoading && !error && !searchResults && (
        <p className={styles.feedbackMessage}>Enter a city and search to find gluten-free places!</p>
      )}
    </div>
  );
}

export default App;
