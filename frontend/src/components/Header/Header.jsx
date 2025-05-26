// frontend/src/components/Header/Header.jsx
import React from 'react';
import styles from './Header.module.css'; // Import the CSS Module

function Header() {
  return (
    <header className={styles.appHeader}> {/* Use the semantic <header> HTML5 tag */}
      <h1 className={styles.title}>The Gluten Free Way</h1>
      <h2 className={styles.subtitle}>Your Companion for Living Gluten-Free</h2>
    </header>
  );
}

export default Header;