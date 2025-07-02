import React, { useState, useEffect } from 'react';
import MapScreen from './screens/MapScreen';
import CitySearchScreen from './screens/CitySearchScreen';
import LoadingScreen from './components/LoadingScreen'; // NEW: Import the loading screen
import './App.css';
import ReactGA from "react-ga4";

const FeedbackModal = ({ isOpen, onClose, onSubmit }) => {
  // ... (This component is unchanged)
  const [content, setContent] = useState('');
  if (!isOpen) return null;
  const handleSubmit = () => { if (content.trim()) { onSubmit(content); setContent(''); } };
  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal-content">
        <h2>Share Your Feedback</h2>
        <p>We'd love to hear your thoughts, suggestions, or any bugs you've found!</p>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type your feedback here..." rows="5"></textarea>
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
  
  // NEW: State to manage the initial loading screen
  const [isAppLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
      ReactGA.initialize(measurementId);
      console.log("Google Analytics Initialized");
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition(userPos);
        setAppLoading(false); // Hide loading screen on success
      },
      () => {
        setLocationError('Location permission denied.');
        setCurrentView('city');
        setAppLoading(false); // Also hide loading screen on failure
      }
    );
  }, []);

  const navigateToCitySearch = () => { setCurrentView('city'); };
  const navigateToLiveSearch = () => { if (userPosition) { setCurrentView('live'); } else { alert('You need to enable location permission...'); } };

  const handleFeedbackSubmit = async (feedbackContent) => {
    // ... (This function is unchanged)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';
    try {
      const response = await fetch(`${backendUrl}/submit-feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: feedbackContent }) });
      if (response.ok) { alert('Thank you for your feedback!'); } 
      else { alert('Sorry, there was an error submitting your feedback.'); }
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert('Sorry, there was an error submitting your feedback.');
    }
    setFeedbackModalOpen(false);
  };

  // NEW: Main render logic now shows the loading screen first
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
      <button className="floating-feedback-button" onClick={() => setFeedbackModalOpen(true)} title="Send Feedback">
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