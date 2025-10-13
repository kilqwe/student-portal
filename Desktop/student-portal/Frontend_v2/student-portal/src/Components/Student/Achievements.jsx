import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { FaTrophy } from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";

export default function StudentAchievements() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    const fetchAchievements = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsInitialLoading(false);
        return;
      }
      try {
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setStatus("Student record not found.");
          return;
        }
        const studentDoc = querySnapshot.docs[0];
        const studentRef = doc(db, "students", studentDoc.id);
        const snap = await getDoc(studentRef);
        if (snap.exists() && Array.isArray(snap.data().achievements)) {
          setAchievements(snap.data().achievements);
        } else {
          setAchievements([]);
        }
      } catch (error) {
        console.error("Error fetching achievements:", error);
        setStatus("Error fetching achievements.");
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setStatus("Please enter a description.");
      return;
    }
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setStatus("User not authenticated.");
      setLoading(false);
      return;
    }
    try {
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setStatus("Student record not found.");
        setLoading(false);
        return;
      }
      const studentDoc = querySnapshot.docs[0];
      const studentRef = doc(db, "students", studentDoc.id);
      await setDoc(
        studentRef,
        { achievements: arrayUnion(description) },
        { merge: true }
      );
      setAchievements((prev) => [...prev, description]);
      setDescription("");
      setStatus("Achievement saved!");
    } catch (error) {
      setStatus("Error saving achievement.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (achToDelete) => {
    const user = auth.currentUser;
    if (!user) {
      setStatus("User not authenticated.");
      return;
    }
    setLoading(true);
    try {
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setStatus("Student record not found.");
        setLoading(false);
        return;
      }
      const studentDoc = querySnapshot.docs[0];
      const studentRef = doc(db, "students", studentDoc.id);
      await setDoc(
        studentRef,
        { achievements: arrayRemove(achToDelete) },
        { merge: true }
      );
      setAchievements((prev) => prev.filter((ach) => ach !== achToDelete));
      setStatus("Achievement deleted!");
    } catch (error) {
      setStatus("Error deleting achievement.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
      {/* Form Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center justify-center gap-2">
          <FaTrophy />
          <span>Add a New Achievement</span>
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'Won first prize in the national hackathon'"
            rows={4}
            className="w-full p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            className={`w-fit bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={loading || !description.trim()}
          >
            {loading ? "Saving..." : "Save Achievement"}
          </button>
        </form>
        {status && (
          <div
            className={`mt-4 text-center font-semibold ${
              status.includes("saved") || status.includes("deleted")
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {status}
          </div>
        )}
      </div>

      <hr className="my-8" />

      {/* List Section */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Your Saved Achievements
        </h3>
        {achievements.length === 0 ? (
          <div className="text-gray-500 italic bg-gray-50 p-4 rounded-md border border-gray-200">
            No achievements added yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {achievements.map((ach, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center bg-gray-50 p-4 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-800 break-all pr-4">{ach}</span>
                <button
                  onClick={() => handleDelete(ach)}
                  className="flex-shrink-0 bg-red-600 text-white px-3 py-1 text-sm font-semibold rounded-md hover:bg-red-700 transition"
                  disabled={loading}
                  aria-label={`Delete achievement: ${ach}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}