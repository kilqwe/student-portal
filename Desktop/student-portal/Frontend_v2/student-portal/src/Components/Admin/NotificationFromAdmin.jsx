import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaSearch, FaPaperPlane, FaHistory, FaTrash, FaTimes } from "react-icons/fa";
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
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase";
import Pagination from "../helpers/Pagination";

/* ---------------------- RecipientList (Internal Component) ---------------------- */
const RecipientList = ({ recipients }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isPopoverOpen) return;
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPopoverOpen]);

  if (!recipients || recipients.length === 0) {
    return <p className="text-xs text-gray-500 mt-1">No recipients</p>;
  }

  const displayCount = 2;
  const shouldShowButton = recipients.length > displayCount;
  const remainingCount = recipients.length - displayCount;

  return (
    <div className="mt-1 text-xs">
      <div className="flex items-center flex-wrap gap-x-2">
        <p className="font-semibold text-gray-500">To:</p>
        <p className="text-gray-500">{recipients.slice(0, displayCount).join(", ")}</p>
        {shouldShowButton && (
          <div className="relative inline-block">
            <button
              onClick={(e) => { e.stopPropagation(); setIsPopoverOpen(true); }}
              className="text-blue-600 hover:underline font-semibold"
            >
              +{remainingCount} more
            </button>
            {isPopoverOpen && (
              <div
                ref={popoverRef}
                className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-gray-300 rounded-lg shadow-xl z-20 p-2 space-y-1 max-h-48 overflow-y-auto"
              >
                <h4 className="font-bold text-base px-2 pt-1 pb-2 border-b">All Recipients ({recipients.length})</h4>
                {recipients.map((recipient, index) => (
                  <p key={index} className="text-gray-800 text-sm px-2 py-1">{recipient}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------------- SentNotificationList (Updated Component) ---------------------- */
const SentNotificationList = ({ notifications, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNote, setSelectedNote] = useState(null); // State for the modal
  const itemsPerPage = 5;

  const filteredNotifications = notifications.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <div className="relative mb-6">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search sent notifications..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {currentItems.length > 0 ? (
        <div className="space-y-3">
          {currentItems.map((note) => (
            <div 
              key={note.id} 
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-4 transition hover:bg-gray-100 cursor-pointer"
              onClick={() => setSelectedNote(note)}
            >
                <div className="flex-shrink-0 w-16 text-center">
                    <p className="text-sm font-bold text-gray-700">{note.timestamp?.toDate().toLocaleDateString("en-GB", { day: 'numeric' })}</p>
                    <p className="text-xs text-gray-500">{note.timestamp?.toDate().toLocaleDateString("en-GB", { month: 'short' })}</p>
                </div>
                <div className="flex-grow overflow-hidden">
                    <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full">{note.senderName || 'Admin'}</span>
                        <h3 className="font-semibold text-gray-800 truncate">{note.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">{note.message}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  className="ml-auto flex-shrink-0 text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                  title="Delete Notification"
                >
                  <FaTrash />
                </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No notifications found.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* --- MODAL WINDOW FOR FULL NOTIFICATION --- */}
      {selectedNote && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={() => setSelectedNote(null)}
        >
          <div 
            className="relative bg-white pt-6 pb-8 px-8 rounded-lg shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedNote(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1 rounded-full transition-colors"
              aria-label="Close"
            >
              <FaTimes size={20}/>
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedNote.title}</h2>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>From:</strong> {selectedNote.senderName || 'Admin'} ({selectedNote.senderEmail})</p>
              <p><strong>Date:</strong> {selectedNote.timestamp.toDate().toLocaleString('en-GB')}</p>
            </div>

            <hr className="my-4" />

            <div className="max-h-[50vh] overflow-y-auto pr-2 text-base text-gray-700 whitespace-pre-wrap">
               {selectedNote.message}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ---------------------- Main Component ---------------------- */
const NotificationFromAdmin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ email: "", name: ""});
  const [departments] = useState(["CSE", "ECE", "AI/ML", "ME", "Basic Sciences"]);
  const [selectedDept, setSelectedDept] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [semesters] = useState(["1", "2", "3", "4", "5", "6", "7", "8"]);
  const [sections] = useState(["A", "B", "C"]);
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSec, setSelectedSec] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [mode, setMode] = useState("teachers");
  const [sentNotifications, setSentNotifications] = useState([]);
  
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("success");

  const fetchSentNotifications = useCallback(async (email) => {
    if (!email) return;
    const q = query(
      collection(db, "notifications"),
      where("senderEmail", "==", email),
      where("senderRole", "==", "admin")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSentNotifications(data.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)));
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const q = query(collection(db, "admin"), where("email", "==", user.email));
          const adminSnapshot = await getDocs(q);
          const adminData = adminSnapshot.docs[0]?.data();

          setAdminInfo({ email: user.email, name: adminData?.name || "Admin" });
          await fetchSentNotifications(user.email);
        }
      } catch (error) {
        console.error("Error fetching initial notifications:", error);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchSentNotifications]);

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!selectedDept) {
        setTeachers([]); return;
      }
      const q = query(collection(db, "teachers"), where("department", "==", selectedDept));
      const snapshot = await getDocs(q);
      setTeachers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchTeachers();
    setSelectedTeachers([]);
  }, [selectedDept]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSem || !selectedSec) {
        setStudents([]); return;
      }
      const q = query(
        collection(db, "students"),
        where("semester", "==", Number(selectedSem)),
        where("section", "==", selectedSec.toUpperCase())
      );
      const snapshot = await getDocs(q);
      setStudents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchStudents();
    setSelectedStudents([]);
  }, [selectedSem, selectedSec]);

  const toggleSelection = (list, setList, email) => {
    setList(list.includes(email) ? list.filter((e) => e !== email) : [...list, email]);
  };

  const toggleSelectAll = (dataList, selectedList, setSelectedList) => {
    setSelectedList(selectedList.length === dataList.length ? [] : dataList.map((item) => item.email));
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      await deleteDoc(doc(db, "notifications", id));
      setSentNotifications((prev) => prev.filter((note) => note.id !== id));
    }
  };
  
  const displayFormMessage = (msg, type = "success") => {
    setFormMessage(msg);
    setFormMessageType(type);
    setTimeout(() => setFormMessage(""), 4000);
  };

  const sendNotification = async () => {
    const recipients = [
      ...(mode === "teachers" || mode === "both" ? selectedTeachers : []),
      ...(mode === "students" || mode === "both" ? selectedStudents : []),
    ];

    if (!title || !message || recipients.length === 0) {
      return displayFormMessage("Title, message, and at least one recipient are required.", "error");
    }

    await addDoc(collection(db, "notifications"), {
      title, message, link,
      senderRole: "admin",
      senderEmail: adminInfo.email,
      senderName: adminInfo.name,
      recipients,
      timestamp: serverTimestamp(),
      targetRoles: mode === "both" ? ["students", "teachers"] : [mode],
    });
    
    await fetchSentNotifications(adminInfo.email);
    
    displayFormMessage("Notification sent successfully!", "success");
    setTitle(""); setMessage(""); setLink("");
    setSelectedTeachers([]); setSelectedStudents([]);
  };

  if (isLoading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="space-y-8">
      {/* --- COMPOSE NOTIFICATION CARD --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaPaperPlane /> Compose Notification</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Send To</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                <option value="teachers">Teachers</option>
                <option value="students">Students</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="space-y-4">
              {(mode === "teachers" || mode === "both") && (
                <div className="p-4 border rounded-md bg-gray-50/50 space-y-3">
                  <label className="font-semibold text-gray-700 block">Filter Teachers</label>
                  <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">Select Department</option>
                    {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
                  </select>
                  {teachers.length > 0 && (
                    <>
                      <button onClick={() => toggleSelectAll(teachers, selectedTeachers, setSelectedTeachers)} className="text-sm font-semibold text-blue-600 hover:underline">
                        {selectedTeachers.length === teachers.length ? "Deselect All" : "Select All"}
                      </button>
                      <div className="max-h-40 overflow-y-auto border p-3 rounded bg-white text-sm space-y-2">
                        {teachers.map((t) => (
                          <label key={t.id} className="cursor-pointer flex items-center">
                            <input type="checkbox" checked={selectedTeachers.includes(t.email)} onChange={() => toggleSelection(selectedTeachers, setSelectedTeachers, t.email)} className="mr-2 h-4 w-4 rounded" />
                            {t.name} <span className="text-gray-500 ml-1">({t.id})</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {(mode === "students" || mode === "both") && (
                <div className="p-4 border rounded-md bg-gray-50/50 space-y-3">
                  <label className="font-semibold text-gray-700 block">Filter Students</label>
                  <div className="flex gap-3">
                    <select value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} className="flex-1 p-2 border rounded-md">
                      <option value="">Semester</option>
                      {semesters.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
                    </select>
                    <select value={selectedSec} onChange={(e) => setSelectedSec(e.target.value)} className="flex-1 p-2 border rounded-md">
                      <option value="">Section</option>
                      {sections.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  </div>
                  {students.length > 0 && (
                    <>
                      <button onClick={() => toggleSelectAll(students, selectedStudents, setSelectedStudents)} className="text-sm font-semibold text-blue-600 hover:underline">
                        {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                      </button>
                      <div className="max-h-40 overflow-y-auto border p-3 rounded bg-white text-sm space-y-2">
                        {students.map((s) => (
                          <label key={s.id} className="cursor-pointer flex items-center">
                            <input type="checkbox" checked={selectedStudents.includes(s.email)} onChange={() => toggleSelection(selectedStudents, setSelectedStudents, s.email)} className="mr-2 h-4 w-4 rounded"/>
                            {s.name} <span className="text-gray-500 ml-1">({s.id})</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4 flex flex-col lg:row-span-2">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Title</label>
              <input type="text" placeholder="Enter notification title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col flex-grow">
              <label className="block mb-2 font-semibold text-gray-700">Message</label>
              <textarea placeholder="Enter your message" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md resize-y focus:ring-2 focus:ring-blue-500 flex-grow" />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Attachment Link (Optional)</label>
              <input type="text" placeholder="e.g., https://drive.google.com/..." value={link} onChange={(e) => setLink(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mt-auto pt-4">
              {formMessage && (
                <p className={`mb-4 p-3 rounded-md text-white text-center text-sm ${ formMessageType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{formMessage}</p>
              )}
              <button onClick={sendNotification} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg cursor-pointer transition shadow-sm">
                Send Notification
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* --- NOTIFICATION HISTORY CARD --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3 justify-center"><FaHistory /> Notification History</h2>
          <SentNotificationList
            notifications={sentNotifications}
            onDelete={handleDelete}
          />
      </div>
    </div>
  );
};

export default NotificationFromAdmin;