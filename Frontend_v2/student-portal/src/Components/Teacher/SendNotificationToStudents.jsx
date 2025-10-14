import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import Pagination from "../helpers/Pagination"; // Adjust the path if necessary
import { FaPaperPlane, FaHistory } from "react-icons/fa"; // ✅ Icons imported

const auth = getAuth();

// --- ICONS ---
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ---------------------- RecipientList Component (for Modal) ---------------------- */
const RecipientList = ({ recipients }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPopoverOpen]);

  if (!recipients || recipients.length === 0) {
    return <p className="text-xs text-gray-500 mt-2">No recipients</p>;
  }

  const shouldShowButton = recipients.length > 3;
  const remainingCount = recipients.length - 3;

  return (
    <div className="mt-3 text-sm">
      <div className="flex items-center flex-wrap">
        <p className="font-semibold text-gray-800 mr-2">Recipients:</p>
        <p className="text-gray-600">{recipients.slice(0, 3).join(", ")}</p>

        {shouldShowButton && (
          <div className="relative inline-block ml-2">
            <button
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className="text-blue-600 underline font-semibold text-xs"
            >
              +{remainingCount} more
            </button>

            {isPopoverOpen && (
              <div
                ref={popoverRef}
                className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-20 p-2 max-h-48 overflow-y-auto"
              >
                <h4 className="font-bold text-base px-2 pt-1 pb-2 border-b">
                  All Recipients ({recipients.length})
                </h4>
                <div className="space-y-1 mt-1">
                  {recipients.map((recipient, index) => (
                    <p key={index} className="text-gray-800 text-sm px-2 py-1">
                      {recipient}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------------- Notification Modal Component ---------------------- */
const NotificationModal = ({ notification, onClose }) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Close">
          <CloseIcon />
        </button>
        <h3 className="text-xl font-bold mb-2 text-gray-900">{notification.title}</h3>
        <p className="text-xs text-gray-500 mb-4 border-b pb-3">
          Sent on: {new Date(notification.timestamp.toDate()).toLocaleString("en-IN")}
        </p>
        <div className="whitespace-pre-wrap text-gray-800 mb-4 max-h-60 overflow-y-auto">
          {notification.message}
        </div>
        {notification.link && (
          <div className="mb-4">
            <p className="text-sm break-words">
              <strong>Attachment:</strong>{" "}
              <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                {notification.link}
              </a>
            </p>
          </div>
        )}
        <RecipientList recipients={notification.recipients} />
      </div>
    </div>
  );
};


/* ---------------------- Main Component ---------------------- */
const SendNotificationToStudents = ({ isSidebarOpen }) => {
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [semesters] = useState(["1", "2", "3", "4", "5", "6", "7", "8"]);
  const [sections] = useState(["A", "B", "C"]);
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSec, setSelectedSec] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sentNotifications, setSentNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNoteForModal, setSelectedNoteForModal] = useState(null);
  const itemsPerPage = 5;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setTeacherEmail(user.email);
        fetchSentNotifications(user.email).finally(() => setLoading(false)); 
      } else {
        setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSem || !selectedSec) {
        setStudents([]);
        return;
      }
      setStudentsLoading(true); 
      try {
        const q = query(
          collection(db, "students"),
          where("semester", "==", Number(selectedSem)),
          where("section", "==", selectedSec)
        );
        const snapshot = await getDocs(q);
        setStudents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching students:", error);
        alert("Failed to fetch students.");
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
    setSelectedStudents([]);
  }, [selectedSem, selectedSec]);

  const toggleSelection = (email) => {
    setSelectedStudents((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.email));
    }
  };

  const fetchSentNotifications = async (email) => {
    const q = query(
      collection(db, "notifications"),
      where("senderEmail", "==", email),
      where("senderRole", "==", "teacher")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSentNotifications(
      data.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0))
    );
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      setDeletingId(id);
      try {
        await deleteDoc(doc(db, "notifications", id));
        setSentNotifications((prev) => prev.filter((note) => note.id !== id));
      } catch (error) {
        console.error("Error deleting notification:", error);
        alert("Failed to delete notification.");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const sendNotification = async () => {
    if (!title || !message || selectedStudents.length === 0) {
      return alert("Please fill all fields and select at least one student.");
    }
    setIsSending(true);
    try {
      await addDoc(collection(db, "notifications"), {
        title,
        message,
        link,
        senderRole: "teacher",
        senderEmail: teacherEmail,
        recipients: selectedStudents,
        timestamp: serverTimestamp(),
        targetRoles: ["students"],
        sent: null,
      });
      alert("Notification sent!");
      setTitle("");
      setMessage("");
      setLink("");
      setSelectedStudents([]);
      fetchSentNotifications(teacherEmail);
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification.");
    } finally {
      setIsSending(false); 
    }
  };

  const filteredNotifications = sentNotifications.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        {/* --- Main Container for the Form --- */}
        <div className="p-6 bg-white rounded-xl shadow-md">
          {/* ✅ TITLE UPDATED */}
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-3">
            <FaPaperPlane />
            Notifications to Students
          </h2>
          <hr className="mb-6 border-gray-200" />
          
          <div className="flex w-full gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Semester</label>
              <select
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select</option>
                {semesters.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Section</label>
              <select
                value={selectedSec}
                onChange={(e) => setSelectedSec(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select</option>
                {sections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
          </div>

          {studentsLoading ? (
            <div className="text-center p-4">Loading students...</div>
          ) : (
            students.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold mb-2">Select Recipients:</p>
                <div className="mb-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      onChange={handleSelectAllToggle}
                      checked={students.length > 0 && selectedStudents.length === students.length}
                      className="mr-2 h-4 w-4 rounded"
                    />
                    Select All Students
                  </label>
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-300 p-3 rounded bg-gray-50/50 space-y-2">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.email)}
                        onChange={() => toggleSelection(s.email)}
                        className="mr-2 h-4 w-4"
                      />
                      {s.name} ({s.email})
                    </label>
                  ))}
                </div>
              </div>
            )
          )}

          <div className="flex flex-col gap-3 mb-6">
            <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="p-2 border border-gray-300 rounded-md" />
            <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="p-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Attachment Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} className="p-2 border border-gray-300 rounded-md" />
          </div>

          <button onClick={sendNotification} disabled={isSending} className="bg-blue-500 hover:bg-blue-700 text-white px-5 py-2 rounded-md w-full disabled:bg-gray-400 disabled:cursor-not-allowed">
            {isSending ? "Sending..." : "Send Notification"}
          </button>
        </div>

        {/* --- Container for Sent Notifications --- */}
        <div className="mt-6 p-6 bg-white rounded-xl shadow-md">
          {/* ✅ TITLE UPDATED */}
          <h3 className="text-2xl font-semibold mb-3 text-gray-800 flex items-center justify-center gap-3">
            <FaHistory />
            Sent Notifications
          </h3>
          {sentNotifications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No notifications sent yet.</p>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search sent notifications..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full mb-4 p-2 border border-gray-300 rounded-md"
              />
              <div>
                {currentItems.map((note) => {
                    const truncateWords = (str, num) => {
                      const words = str.split(" ");
                      if (words.length <= num) return str;
                      return words.slice(0, num).join(" ") + "...";
                    };
                    const truncatedMessage = truncateWords(note.message, 50);

                  return (
                      <div key={note.id} className="border-b border-gray-200 last:border-b-0">
                          <div 
                              onClick={() => setSelectedNoteForModal(note)} 
                              className="flex items-center p-3 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                          >
                              <div className="w-24 text-sm text-gray-600 font-medium flex-shrink-0">
                                  {note.timestamp?.toDate ? new Date(note.timestamp.toDate()).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) : "N/A"}
                              </div>
                              <div className="flex-grow overflow-hidden mx-4">
                                  <p className="font-semibold text-gray-800 truncate">{note.title}</p>
                                  <p className="text-sm text-gray-500 truncate">{truncatedMessage}</p>
                              </div>
                              <div className="ml-auto">
                                  <button 
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(note.id);
                                      }}
                                      disabled={deletingId === note.id}
                                      className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 focus:outline-none disabled:opacity-50"
                                      aria-label="Delete Notification"
                                  >
                                    {deletingId === note.id ? <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <DeleteIcon />}
                                  </button>
                              </div>
                          </div>
                      </div>
                  );
                })}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      {/* --- RENDER THE MODAL --- */}
      <NotificationModal 
        notification={selectedNoteForModal} 
        onClose={() => setSelectedNoteForModal(null)}
      />
    </>
  );
};

export default SendNotificationToStudents;