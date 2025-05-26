// frontend/src/App.jsx
import styles from './App.module.css';
import Header from './components/Header/Header.jsx'; // Import the Header component

function App() {
  return (
    <div className={styles.appContainer}>
      <Header /> {/* Add the Header component here */}
      {/* The "Welcome..." message can be removed or kept for now to confirm App is still rendering */}
      {/* <p>Welcome to The Gluten Free Way (React Version)!</p> */}
    </div>
  );
}

export default App;