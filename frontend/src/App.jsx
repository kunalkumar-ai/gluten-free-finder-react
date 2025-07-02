import React, { useState, useEffect } from 'react';
import MapScreen from './screens/MapScreen';
import CitySearchScreen from './screens/CitySearchScreen';
import LoadingScreen from './components/LoadingScreen';
import './App.css';
import ReactGA from "react-ga4";

const FeedbackModal = ({ isOpen, onClose, onSubmit }) => {
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal-content">
        <h2>Share Your Feedback</h2>
        <p>We'd love to hear your thoughts, suggestions, or any bugs you've found!</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your feedback here..."
          rows="5"
        ></textarea>
        <div className="feedback-modal-actions">
          <button onClick={onClose} className="feedback-cancel-button">Cancel</button>
          <button onClick={handleSubmit} className="feedback-submit-button">Submit</button>
        </div>
      </div>
    </div>
  );
};


function App() {
  const [currentView, setCurrentView] = useState('live');
  const [userPosition, setUserPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isAppLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // --- Initialize Google Analytics ---
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
      ReactGA.initialize(measurementId);
      console.log("Google Analytics Initialized");
    }

    // --- Main Loading Logic ---
    const runInitialLoad = () => {
      setAppLoading(true);

      // Promise 1: A timer that resolves after 3 seconds
      const minimumDisplayTime = new Promise(resolve => setTimeout(resolve, 2000));

      // Promise 2: The geolocation check
      const getLocation = new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Promise.all waits for BOTH the timer and the location check to finish
      Promise.all([minimumDisplayTime, getLocation])
        .then(([_, pos]) => {
          // This runs only on SUCCESS
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPosition(userPos);
          setCurrentView('live');
        })
        .catch(() => {
          // This runs only on FAILURE (permission denied)
          setLocationError('Location permission denied.');
          setCurrentView('city');
        })
        .finally(() => {
          // This runs in ALL cases (success or failure)
          setAppLoading(false); // Hide the loading screen
        });
    };

    // This event listener handles the case where a user navigates back to the page
    const handlePageShow = (event) => {
      if (event.persisted) {
        console.log("Page was loaded from back/forward cache. Re-running load logic.");
        runInitialLoad();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    runInitialLoad(); // Run the logic for the initial visit

    // Clean up the event listener when the component is unmounted
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []); // This hook only needs to run once to set up the listeners

  const navigateToCitySearch = () => {
    setCurrentView('city');
  };

  const navigateToLiveSearch = () => {
    if (userPosition) {
      setCurrentView('live');
    } else {
      alert('You need to enable location permission in your browser settings to use the live map.');
    }
  };

  const handleFeedbackSubmit = async (feedbackContent) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';
    try {
      const response = await fetch(`${backendUrl}/submit-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: feedbackContent }),
      });
      if (response.ok) {
        alert('Thank you for your feedback!');
      } else {
        alert('Sorry, there was an error submitting your feedback.');
      }
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert('Sorry, there was an error submitting your feedback.');
    }
    setFeedbackModalOpen(false);
  };

  if (isAppLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      {currentView === 'live' ? (
        <MapScreen 
          onNavigateToCitySearch={navigateToCitySearch} 
          userPosition={userPosition}
          locationError={locationError}
        />
      ) : (
        <CitySearchScreen 
          onNavigateToLiveSearch={navigateToLiveSearch} 
          userPosition={userPosition}
        />
      )}
      <button 
        className="floating-feedback-button" 
        onClick={() => setFeedbackModalOpen(true)}
        title="Send Feedback"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
        </svg>
      </button>
      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setFeedbackModalOpen(false)} 
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}

export default App;