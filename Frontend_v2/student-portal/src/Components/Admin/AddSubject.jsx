import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
} from "firebase/firestore";
import Select from "react-select";

const AddSubject = () => {
  // ✅ 1. State for the initial page load
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [addSubjectId, setAddSubjectId] = useState("");
  const [name, setName] = useState("");
  const [credit, setCredit] = useState(""); // Changed initial state to empty string for consistency
  const [deleteSubjectId, setDeleteSubjectId] = useState("");
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [allSubjects, setAllSubjects] = useState([]);

  // ✅ 2. Updated useEffect to manage the initial loading state
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const snapshot = await getDocs(collection(db, "subjects"));
        const subjects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllSubjects(subjects);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setMessage("❌ Failed to load subject list.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();

    if (!addSubjectId.trim() || !name.trim() || !credit) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const subjectRef = doc(db, "subjects", addSubjectId);

    try {
      const docSnap = await getDoc(subjectRef);

      if (docSnap.exists()) {
        setMessage(`Subject with ID "${addSubjectId}" already exists.`);
      } else {
        await setDoc(subjectRef, {
          name,
          credit: Number(credit),
        });
        setMessage(`Subject "${name}" added successfully.`);
        setAddSubjectId("");
        setName("");
        setCredit("");

        // Refetch subjects to update the list
        const snapshot = await getDocs(collection(db, "subjects"));
        const updatedSubjects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllSubjects(updatedSubjects);
      }
    } catch (error) {
      console.error("Error adding subject:", error);
      setMessage("Failed to add subject.");
    }

    setLoading(false);
  };

  const fetchSubjectToDelete = async (id) => {
    if (!id || !id.trim()) {
      setSubjectToDelete(null);
      return;
    }

    const subjectRef = doc(db, "subjects", id);
    try {
      const docSnap = await getDoc(subjectRef);
      if (docSnap.exists()) {
        setSubjectToDelete(docSnap.data());
      } else {
        setSubjectToDelete(null);
      }
    } catch (error) {
      console.error("Error fetching subject:", error);
      setSubjectToDelete(null);
    }
  };

  useEffect(() => {
    if (deleteSubjectId) {
        fetchSubjectToDelete(deleteSubjectId);
    } else {
        setSubjectToDelete(null);
    }
  }, [deleteSubjectId]);

  // ✅ 3. Conditional return to show the spinner on initial load
  if (isInitialLoading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-8 px-4 flex flex-wrap gap-6">
      {/* Add Subject Section */}
      <div className="flex-1 min-w-[300px] border border-gray-300 rounded-lg p-6 bg-white shadow">
        <h2 className="text-xl font-semibold mb-4"> Add Subject</h2>
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Subject ID</label>
            <input
              type="text"
              value={addSubjectId}
              onChange={(e) => setAddSubjectId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Subject Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Credit</label>
            <input
              type="number"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              required
              min={1}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded text-white ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Processing..." : "Add Subject"}
          </button>
        </form>
      </div>

      {/* Delete Subject Section */}
      <div className="flex-1 min-w-[300px] border border-gray-300 rounded-lg p-6 bg-white shadow">
        <h2 className="text-xl font-semibold mb-4"> Delete Subject</h2>

        <div className="mb-4">
          <label className="block font-medium mb-1">Select Subject to Delete</label>
          <Select
            options={allSubjects.map((subject) => ({
              value: subject.id,
              label: `${subject.id} - ${subject.name}`,
            }))}
            value={
              deleteSubjectId
                ? {
                    value: deleteSubjectId,
                    label: `${deleteSubjectId} - ${subjectToDelete?.name || ""}`,
                  }
                : null
            }
            onChange={(selected) => setDeleteSubjectId(selected ? selected.value : "")}
            placeholder="Select a Subject..."
            isClearable
            isSearchable
            styles={{ container: (base) => ({ ...base, width: "100%" }) }}
          />
        </div>

        {subjectToDelete && (
          <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
            <p>
              <strong>Subject:</strong> {subjectToDelete.name}
            </p>
            <p>
              <strong>Credit:</strong> {subjectToDelete.credit}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={async () => {
            if (!deleteSubjectId) return;
            const confirmDelete = window.confirm(
              `Are you sure you want to delete "${deleteSubjectId}"?`
            );
            if (!confirmDelete) return;

            setLoading(true);
            try {
              await deleteDoc(doc(db, "subjects", deleteSubjectId));
              setMessage("Subject deleted successfully.");
              setDeleteSubjectId("");
              setSubjectToDelete(null);
              // Refetch subjects to update the list
              const snapshot = await getDocs(collection(db, "subjects"));
              const updatedSubjects = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setAllSubjects(updatedSubjects);
            } catch (error) {
              console.error("Error deleting subject:", error);
              setMessage("Failed to delete subject.");
            }
            setLoading(false);
          }}
          disabled={loading || !deleteSubjectId}
          className={`w-full py-2 px-4 rounded text-white ${
            loading || !deleteSubjectId
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {loading ? "Processing..." : "Delete Subject"}
        </button>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className="w-full mt-4 text-center text-sm font-medium">
          <p
            className={`${
              message.includes("successfully")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AddSubject;