import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaSearch, FaPaperPlane, FaHistory, FaTrash, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaLink } from "react-icons/fa";
import { FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
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
import Pagination from "../helpers/Pagination";

const auth = getAuth();

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    let bgColor, textColor, Icon;
    switch (type) {
        case 'success': bgColor = 'bg-green-100'; textColor = 'text-green-800'; Icon = FaCheckCircle; break;
        case 'error': bgColor = 'bg-red-100'; textColor = 'text-red-800'; Icon = FaExclamationTriangle; break;
        default: bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; Icon = FaInfoCircle;
    }
    return (
      <div className={`p-3 rounded-md mb-6 flex items-center gap-3 text-sm font-semibold ${bgColor} ${textColor}`}>
        <Icon />
        <span>{message}</span>
      </div>
    );
};

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
    return <p className="text-xs text-gray-500 mt-2">No recipients specified.</p>;
  }

  const displayCount = 3;
  const shouldShowButton = recipients.length > displayCount;
  const remainingCount = recipients.length - displayCount;

  return (
    <div className="mt-3 text-sm">
      <div className="flex items-center flex-wrap gap-x-2">
        <p className="font-semibold text-gray-800">Recipients:</p>
        <p className="text-gray-600">{recipients.slice(0, displayCount).join(", ")}</p>
        {shouldShowButton && (
          <div className="relative inline-block">
            <button onClick={(e) => { e.stopPropagation(); setIsPopoverOpen(true); }} className="text-blue-600 underline font-semibold text-xs">
              +{remainingCount} more
            </button>
            {isPopoverOpen && (
              <div ref={popoverRef} className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-300 rounded-lg shadow-xl z-10 p-2 max-h-48 overflow-y-auto">
                <h4 className="font-bold text-base px-2 pt-1 pb-2 border-b">All Recipients ({recipients.length})</h4>
                <div className="space-y-1 mt-1">
                  {recipients.map((recipient, index) => (
                    <p key={index} className="text-gray-800 text-sm px-2 py-1">{recipient}</p>
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
  if (!notification) return null;

  return (
    <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-900">{notification.title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 p-1 rounded-full">
                        <FiX size={20}/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="text-sm text-gray-600 mb-4 space-y-1">
                        <p><strong className="font-semibold text-gray-800 w-16 inline-block">Sent on:</strong> {new Date(notification.timestamp.toDate()).toLocaleString("en-IN", { dateStyle: 'full', timeStyle: 'short' })}</p>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                        {notification.message}
                    </div>
                    {notification.link && (
                        <div className="mt-6 pt-6 border-t">
                             <a href={notification.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors">
                                <FaLink />
                                {notification.fileName || "View Attachment"}
                            </a>
                        </div>
                    )}
                    <RecipientList recipients={notification.recipients} />
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};


/* ---------------------- Main Component ---------------------- */
const SendNotificationToStudents = () => {
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
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("success");

  const displayMessage = (msg, type = "success", duration = 4000) => {
    setFormMessage(msg);
    setFormMessageType(type);
    if (duration) {
      setTimeout(() => setFormMessage(""), duration);
    }
  };

  const fetchSentNotifications = useCallback(async (email) => {
    const q = query(collection(db, "notifications"), where("senderEmail", "==", email), where("senderRole", "==", "teacher"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSentNotifications(data.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)));
  }, []);

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
  }, [fetchSentNotifications]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSem || !selectedSec) {
        setStudents([]);
        return;
      }
      setStudentsLoading(true);
      try {
        const q = query(collection(db, "students"), where("semester", "==", Number(selectedSem)), where("section", "==", selectedSec));
        const snapshot = await getDocs(q);
        setStudents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching students:", error);
        displayMessage("Failed to fetch students.", "error");
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
    setSelectedStudents([]);
  }, [selectedSem, selectedSec]);

  const toggleSelection = (email) => {
    setSelectedStudents((prev) => prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]);
  };

  const handleSelectAllToggle = () => {
    setSelectedStudents(selectedStudents.length === students.length ? [] : students.map((s) => s.email));
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      setDeletingId(id);
      try {
        await deleteDoc(doc(db, "notifications", id));
        setSentNotifications((prev) => prev.filter((note) => note.id !== id));
        displayMessage("Notification deleted successfully.", "success");
      } catch (error) {
        console.error("Error deleting notification:", error);
        displayMessage("Failed to delete notification.", "error");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const sendNotification = async () => {
    if (!title || !message || selectedStudents.length === 0) {
      return displayMessage("Please fill all fields and select at least one student.", "error");
    }
    setIsSending(true);
    try {
      await addDoc(collection(db, "notifications"), {
        title, message, link, senderRole: "teacher", senderEmail: teacherEmail,
        recipients: selectedStudents, timestamp: serverTimestamp(), targetRoles: ["students"], sent: null,
      });
      displayMessage("Notification sent successfully!", "success");
      setTitle(""); setMessage(""); setLink(""); setSelectedStudents([]);
      await fetchSentNotifications(teacherEmail);
    } catch (error) {
      console.error("Error sending notification:", error);
      displayMessage("Failed to send notification.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const filteredNotifications = sentNotifications.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) || note.message.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        {/* --- COMPOSE SECTION --- */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3"><FaPaperPlane /> Send Notification to Students</h2>
        <StatusMessage message={formMessage} type={formMessageType} />
        <div className="space-y-6">
          <div>
            <label className="font-semibold text-gray-700 block mb-2">Filter Students</label>
            <div className="flex gap-4">
              <select value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                <option value="">Select Semester</option>
                {semesters.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
              </select>
              <select value={selectedSec} onChange={(e) => setSelectedSec(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                <option value="">Select Section</option>
                {sections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
            {studentsLoading && <div className="text-center p-4 text-gray-500">Loading students...</div>}
            {!studentsLoading && students.length > 0 && (
              <div className="mt-4">
                <button onClick={handleSelectAllToggle} className="text-sm font-semibold text-blue-600 hover:underline mb-2">{selectedStudents.length === students.length ? "Deselect All" : "Select All"}</button>
                <div className="max-h-48 overflow-y-auto border p-3 rounded bg-gray-50 text-sm space-y-2">
                  {students.map((s) => (
                    <label key={s.id} className="cursor-pointer flex items-center">
                      <input type="checkbox" checked={selectedStudents.includes(s.email)} onChange={() => toggleSelection(s.email)} className="mr-2 h-4 w-4 rounded" />
                      {s.name} <span className="text-gray-500 ml-1">({s.id})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {!studentsLoading && selectedSem && selectedSec && students.length === 0 && <p className="text-sm text-gray-500 mt-2">No students found for this selection.</p>}
          </div>
          <div className="space-y-4 border-t pt-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Title</label>
              <input type="text" placeholder="Enter notification title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Message</label>
              <textarea placeholder="Enter your message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="w-full p-2 border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Attachment Link (Optional)</label>
              <input type="text" placeholder="e.g., https://drive.google.com/..." value={link} onChange={(e) => setLink(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="mt-6">
            <button onClick={sendNotification} disabled={isSending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg cursor-pointer transition shadow-sm disabled:bg-gray-400">
              {isSending ? "Sending..." : "Send Notification"}
            </button>
          </div>
        </div>

        <hr className="my-8" />

        {/* --- SENT NOTIFICATIONS HISTORY SECTION --- */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3"><FaHistory /> Sent Notification History</h2>
        {sentNotifications.length === 0 ? (
          <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600">You have not sent any notifications yet.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search sent notifications..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-4">
              {currentItems.map((note) => (
                <div 
                    key={note.id}
                    onClick={() => setSelectedNoteForModal(note)}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{note.title}</h4>
                      {/* ✅ FIXED: Removed `truncate` and added `break-words` for proper wrapping */}
                      <p className="text-sm text-gray-600 mt-1 break-words">
                        {note.message.length > 150 ? `${note.message.substring(0, 150)}...` : note.message}
                      </p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0 flex items-center gap-4">
                      <p className="text-xs text-gray-500">{note.timestamp?.toDate ? new Date(note.timestamp.toDate()).toLocaleString("en-IN") : "N/A"}</p>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} disabled={deletingId === note.id} className="text-red-500 hover:text-red-700 disabled:text-gray-400" title="Delete Notification">
                        {deletingId === note.id ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <FaTrash size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && <div className="mt-6"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
          </>
        )}
      </div>

      <NotificationModal 
        notification={selectedNoteForModal} 
        onClose={() => setSelectedNoteForModal(null)}
      />
    </>
  );
};

export default SendNotificationToStudents;