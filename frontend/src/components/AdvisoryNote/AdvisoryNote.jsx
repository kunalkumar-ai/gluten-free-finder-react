// frontend/src/components/AdvisoryNote/AdvisoryNote.jsx
import React from 'react';
import styles from './AdvisoryNote.module.css';

function AdvisoryNote() {
  return (
    <div className={styles.advisoryNote}>
      <p><strong>Reminder:</strong> Gluten-free status classifications are AI-assisted suggestions. 
      Always call establishments directly to confirm their current gluten-free practices, menu, 
      cross-contamination protocols, and to discuss your specific dietary needs, 
      especially if you have celiac disease or severe sensitivities. Information can change.</p>
    </div>
  );
}

export default AdvisoryNote;