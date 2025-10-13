import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FeedbackFormSubmission = () => {
  const [isLoading, setIsLoading] = useState(true);

  const [studentData, setStudentData] = useState(null);
  const [formURL, setFormURL] = useState('');
  const [formId, setFormId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

 
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser?.email) return;

        const studentRef = collection(db, 'students');
        const q = query(studentRef, where('email', '==', currentUser.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setStudentData({ ...data, id: querySnapshot.docs[0].id });

          // Fetch the form
          const formsRef = collection(db, 'feedbackForms');
          const fq = query(
            formsRef,
            where('semester', '==', data.semester.toString()),
            where('section', '==', data.section),
            where('status', '==', 'active')
          );
          const formSnap = await getDocs(fq);
          if (!formSnap.empty) {
            const formData = formSnap.docs[0].data();
            setFormURL(formData.formURL);
            setFormId(formSnap.docs[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        // Optionally set an error state to show a message
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  const handleConfirmSubmission = async () => {
    if (!studentData || !formId) return;

    try {
      const feedbackStatusRef = collection(db, 'feedbackStatus');
      await addDoc(feedbackStatusRef, {
        studentId: studentData.id,
        studentName: studentData.name,
        semester: studentData.semester.toString(),
        section: studentData.section,
        formId: formId,
        status: 'Filled',
        timestamp: Timestamp.now(),
      });

      setConfirmed(true);
      alert('Submission confirmed!');
    } catch (err) {
      console.error('Error confirming submission:', err);
      alert('Error confirming. Please try again.');
    }
  };
  
  
  if (isLoading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Feedback Form</h2>

      {formURL ? (
        <>
          <iframe
            title="Feedback Form"
            src={formURL}
            width="100%"
            height="600px"
            style={styles.iframe}
            onLoad={() => setSubmitted(true)}
          ></iframe>

          <button
            onClick={handleConfirmSubmission}
            disabled={!submitted || confirmed}
            style={{
              ...styles.button,
              backgroundColor: submitted && !confirmed ? '#4CAF50' : '#ccc',
              cursor: submitted && !confirmed ? 'pointer' : 'not-allowed',
            }}
          >
            {confirmed ? 'Submission Confirmed' : 'Confirm Submission'}
          </button>
        </>
      ) : (
        <p>No active feedback form available for your semester and section.</p>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    fontSize: '24px',
    marginBottom: '1rem',
    color: '#333',
    textAlign: 'center',
  },
  iframe: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
  },
};

export default FeedbackFormSubmission;