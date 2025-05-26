// frontend/src/App.jsx
import React, { useState } from 'react';
import styles from './App.module.css'; // For App layout and feedback messages
import Header from './components/Header/Header.jsx';
import Navigation from './components/Navigation/Navigation.jsx';
import SearchForm from './components/SearchForm/SearchForm.jsx';
import ResultsList from './components/ResultsList/ResultsList.jsx';
import AdvisoryNote from './components/AdvisoryNote/AdvisoryNote.jsx';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null); // Will store { result: "...", raw_data: [...] }
  const [lastSearchedCity, setLastSearchedCity] = useState(''); // For ResultsList context

  const handleSearchTrigger = async (searchParams) => {
    console.log("Search triggered in App with params:", searchParams);
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setLastSearchedCity(searchParams.city);

    // --- Use environment variable for the backend host URL ---
    // Vite exposes env variables prefixed with VITE_ on import.meta.env
    // Provide a fallback to localhost for local development if the env var isn't set,
    // though it's best practice to ensure it's always set via .env files.
    const backendHost = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5007'; 

    const queryParams = new URLSearchParams({
        city: searchParams.city,
        type: searchParams.type,
    });

    if (searchParams.country && searchParams.country.trim() !== '') {
        queryParams.append('country', searchParams.country.trim());
    }

    const fetchURL = `${backendHost}/get-restaurants?${queryParams.toString()}`;
    
    console.log("Fetching from URL:", fetchURL); // This will now show the URL from your .env file (or fallback)

    try {
      const response = await fetch(fetchURL);
      if (!response.ok) {
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
          <AdvisoryNote />
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
