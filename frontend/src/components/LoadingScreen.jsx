import React from 'react';
import '../App.css'; 

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <img src="/logo_6.png" alt="CeliacAI Logo" className="loading-logo" />
      <p className="loading-text">Your Next Great Meal Awaits</p>
    </div>
  );
};

export default LoadingScreen;