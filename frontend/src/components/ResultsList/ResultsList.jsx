// frontend/src/components/ResultsList/ResultsList.jsx
import React from 'react';
import EstablishmentCard from '../EstablishmentCard/EstablishmentCard.jsx'; // Import the card component
import styles from './ResultsList.module.css';

function ResultsList({ searchResults, originalCityQuery }) {
  // Handle cases where searchResults or searchResults.result might be null/undefined or empty
  if (!searchResults || !searchResults.result || searchResults.result.trim() === "") {
    // Check if it's a specific "no results" message from Gemini that App.jsx might have passed through
    if (searchResults && searchResults.result && searchResults.result.toLowerCase().includes("no ") && searchResults.result.toLowerCase().includes("found matching your criteria")) {
        return <p className={styles.userMessage}>{searchResults.result}</p>;
    }
    // Generic message if data is truly empty or unparseable from the start
    return <p className={styles.userMessage}>No results to display at the moment.</p>;
  }

  const { result: geminiResultText, raw_data: rawData } = searchResults;

  const parsedEstablishments = [];
  const lines = geminiResultText.split('\n').filter(line => line.trim() !== '');

  lines.forEach((line, index) => { // Added index for a more unique key fallback
    const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(\[.+?\])$/);
    if (match) {
      const namePart = match[1].trim();
      const statusPartOriginal = match[2].trim();

      let statusClass = 'gfStatusUnknown'; // Corresponds to class in EstablishmentCard.module.css
      let statusText = statusPartOriginal.replace(/\[|\]/g, '').trim();

      if (statusPartOriginal === "[Dedicated GF]") {
        statusClass = 'gfStatusDedicated';
        statusText = '✓ ' + statusText;
      } else if (statusPartOriginal === "[Offers GF Menu]") {
        statusClass = 'gfStatusOptions';
      } else if (statusPartOriginal === "[Unclear - Verify Directly]") {
        statusClass = 'gfStatusUnclear';
      }

      let address = 'Address not available';
      // Attempt to find more details from rawData
      if (rawData && Array.isArray(rawData)) {
        const foundPlace = rawData.find(place =>
          place.name && place.name.trim().toLowerCase() === namePart.toLowerCase()
        );
        if (foundPlace && foundPlace.address) {
          address = foundPlace.address;
        }
      }

      // Construct Google Search URL
      let searchQueryComponents = [namePart];
      if (address && address !== 'Address not available') {
        searchQueryComponents.push(address);
      } else if (originalCityQuery && originalCityQuery.trim() !== '') {
        searchQueryComponents.push(originalCityQuery);
      }
      const fullSearchQuery = searchQueryComponents.join(' ');
      const encodedSearchQuery = encodeURIComponent(fullSearchQuery);
      const searchUrl = `http://google.com/search?q=${encodedSearchQuery}`;

      parsedEstablishments.push({
        // Using a combination of name and index as a key, assuming names within a single search result list are unique enough with an index
        id: `<span class="math-inline">\{namePart\}\-</span>{index}`,
        name: namePart,
        statusText,
        statusClass,
        address,
        searchUrl,
      });
    } else {
      // You could log unparsed lines if Gemini's format changes or if there are other lines in the output
      // console.warn("ResultsList: Unparsed line from Gemini output:", line);
    }
  });

  // After parsing, check if we actually got any establishments
  if (parsedEstablishments.length === 0) {
     // This means Gemini might have returned text, but it wasn't in the expected list format.
     // Or, it was a different kind of "no results" message not caught by the initial check.
    return (
        <>
            <p className={styles.userMessage}>Could not parse any establishments from the received summary.</p>
            {/* Optionally show the raw text if parsing failed completely but text was present */}
            <div className={styles.rawOutputOnError}>
                <h4>Received Summary:</h4>
                <pre>{geminiResultText}</pre>
            </div>
        </>
    );
  }

  return (
    <div className={styles.resultsGrid}>
      {parsedEstablishments.map(establishment => (
        <EstablishmentCard
          key={establishment.id} // React needs a unique key for list items
          name={establishment.name}
          address={establishment.address}
          statusText={establishment.statusText}
          statusClass={establishment.statusClass}
          searchUrl={establishment.searchUrl}
        />
      ))}
    </div>
  );
}

export default ResultsList;