import React, { useEffect, useState, useRef } from 'react';
import { useNotifications } from '../helpers/NotificationContext';
import Pagination from '../helpers/Pagination';
import { getDocs, query, collection, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaInbox, FaTrash, FaEnvelopeOpen } from 'react-icons/fa';
import { FiMoreVertical, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from 'framer-motion';

const ViewStudentNotifications = () => {
    const { 
        notifications, 
        loading, 
        unreadCount,
        readNotifIds, 
        setNotifications,
        setReadNotifIds
    } = useNotifications();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedNotif, setSelectedNotif] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [senderMap, setSenderMap] = useState({});
    const menuRef = useRef(null);

    const NOTIFICATIONS_PER_PAGE = 10;

    useEffect(() => {
        const buildSenderMap = async () => {
            if (notifications.length === 0) return;
            const senderEmails = [...new Set(notifications.map((n) => n.senderEmail))];
            if (senderEmails.length === 0) return;
            const senderMapTemp = {};
            const chunks = [];
            for (let i = 0; i < senderEmails.length; i += 10) { chunks.push(senderEmails.slice(i, i + 10)); }
            for (const chunk of chunks) {
                const adminQuery = query(collection(db, "admin"), where("email", "in", chunk));
                const teacherQuery = query(collection(db, "teachers"), where("email", "in", chunk));
                const [adminSnap, teacherSnap] = await Promise.all([getDocs(adminQuery), getDocs(teacherQuery)]);
                adminSnap.forEach((doc) => (senderMapTemp[doc.data().email] = doc.data().name));
                teacherSnap.forEach((doc) => (senderMapTemp[doc.data().email] = doc.data().name));
            }
            setSenderMap(senderMapTemp);
        };
        buildSenderMap();
    }, [notifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) { setOpenMenuId(null); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        setSelectedNotif(notification);
        setOpenMenuId(null);
        const newReadIds = new Set(readNotifIds);
        newReadIds.add(notification.id);
        setReadNotifIds(newReadIds);
    };

    const handleMarkAsUnread = (notificationId) => {
        const newReadIds = new Set(readNotifIds);
        newReadIds.delete(notificationId);
        setReadNotifIds(newReadIds);
        setOpenMenuId(null);
    };

    const handleDelete = async (notificationId) => {
        if (!window.confirm("Are you sure you want to delete this notification?")) return;
        try {
            const notificationDocRef = doc(db, "notifications", notificationId);
            await deleteDoc(notificationDocRef);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (selectedNotif && selectedNotif.id === notificationId) {
                setSelectedNotif(null);
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
            alert("There was an error deleting the notification. Please try again.");
        }
        setOpenMenuId(null);
    };

    const totalPages = Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const paginatedNotifications = notifications.slice(startIndex, startIndex + NOTIFICATIONS_PER_PAGE);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex justify-center items-center h-[calc(100vh-200px)]">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 justify-center">
                {/* ✅ ICON REPLACED HERE */}
                <img src="/envelope-dot.svg" alt="Notifications" className="w-6 h-6" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </h2>
            <hr className="mb-5 border-gray-200" />
            
            <div className="flex flex-col md:flex-row gap-5 h-[calc(100vh-250px)]">
                <div className={`flex flex-col transition-all duration-300 ease-in-out ${ selectedNotif ? 'w-full md:w-2/5' : 'w-full' }`}>
                    {notifications.length === 0 ? (
                        <div className="border border-gray-200 rounded-md h-full flex items-center justify-center">
                            <div className="text-center">
                                <FaInbox className="mx-auto text-4xl text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700">All Caught Up!</h3>
                                <p className="text-gray-500 mt-1">You have no new notifications.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="overflow-y-auto flex-grow no-scrollbar">
                                {paginatedNotifications.map((notif) => {
                                    const isSelected = selectedNotif && selectedNotif.id === notif.id;
                                    const isRead = readNotifIds.has(notif.id);
                                    const senderFullName = senderMap[notif.senderEmail]?.trim() || "System";

                                    return (
                                        <div key={notif.id} className={`flex items-center gap-4 p-3 border-b border-gray-200 cursor-pointer transition-colors duration-150 relative ${isSelected ? 'bg-blue-100' : isRead ? 'bg-gray-50' : 'hover:bg-gray-50'}`} onClick={() => handleNotificationClick(notif)}>
                                            {!isRead && (<div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-1 bg-blue-600 rounded-r-full"></div>)}
                                            <div className="w-24 text-sm text-gray-600 font-medium text-left flex-shrink-0">{notif.timestamp?.toDate().toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}</div>
                                            <div className="flex-grow flex items-center gap-3 overflow-hidden">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md flex-shrink-0 ${isRead && !isSelected ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 text-gray-800'}`}>{senderFullName}</span>
                                                <div className="flex-grow overflow-hidden">
                                                    <p className={`font-semibold text-sm truncate ${isRead && !isSelected ? 'text-gray-500 font-normal' : 'text-gray-900 font-semibold'}`}>{notif.title}</p>
                                                    <p className={`text-xs truncate ${isRead && !isSelected ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                                                </div>
                                            </div>
                                            <div className="relative ml-auto pl-2">
                                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === notif.id ? null : notif.id); }} className="p-1 rounded-full text-gray-500 hover:bg-gray-300 focus:outline-none" aria-label="Options"><FiMoreVertical /></button>
                                                {openMenuId === notif.id && (
                                                    <div ref={menuRef} className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                                                        <ul className="py-1 text-sm text-gray-700">
                                                            {isRead && (<li><button onClick={(e) => { e.stopPropagation(); handleMarkAsUnread(notif.id); }} className="w-full text-left px-4 py-2 hover:bg-gray-100">Mark as unread</button></li>)}
                                                            <li><button onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Delete</button></li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-auto p-2 border-t border-gray-200 flex-shrink-0">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => setCurrentPage(page)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {selectedNotif && (
                    <div className="w-full md:w-3/5 border border-gray-300 rounded-md relative">
                        <button onClick={() => setSelectedNotif(null)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10" aria-label="Close"><FiX /></button>
                        <div className="p-5 h-full overflow-y-auto">
                            <h3 className="text-xl font-bold mb-2">{selectedNotif.title}</h3>
                            <div className="text-sm text-gray-600 mb-4 border-b pb-3">
                                <p><strong>From: </strong>{senderMap[selectedNotif.senderEmail]?.trim() || "Unknown"} ({selectedNotif.senderEmail})</p>
                                <p className="mt-1"><strong>Date: </strong>{selectedNotif.timestamp.toDate().toLocaleString("en-IN")}</p>
                            </div>
                            <div className="text-base text-gray-800 whitespace-pre-wrap">{selectedNotif.message}</div>
                            {selectedNotif.link && (<div className="mt-6"><a href={selectedNotif.link} target="_blank" rel="noopener noreferrer" className="text-base text-blue-700 underline hover:text-blue-900 font-medium">{selectedNotif.fileName || "View Attachment"}</a></div>)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewStudentNotifications;