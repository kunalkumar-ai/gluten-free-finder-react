// frontend/src/components/Navigation/Navigation.jsx
import React from 'react';
import styles from './Navigation.module.css';

function Navigation() {
  const navLinks = [
    { text: "Home", href: "/" },
    // { text: "Gluten-Free News", href: "/news" }, // REMOVED
    // { text: "Apps", href: "/apps" },             // REMOVED
    //{ text: "Scanner", href: "/scanner" },
  ];

  return (
    <nav className={styles.mainNav}>
      <div className={styles.navContainer}>
        {navLinks.map((link) => (
          <a key={link.text} href={link.href} className={styles.navItem}>
            {link.text}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default Navigation;