import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../helpers/NotificationContext'; // Use the central context
import Pagination from '../helpers/Pagination';
import { getDocs, query, collection, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// --- ICONS ---
const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const MoreVerticalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
);


const ViewAdminNotifications = () => {
    // Get all state and functions from the central context
    const { 
        notifications, 
        loading, 
        unreadCount,
        readNotifIds, 
        setNotifications,
        setReadNotifIds
    } = useNotifications();
    
    // Local state is only for UI things like selection and pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedNotif, setSelectedNotif] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [senderMap, setSenderMap] = useState({});
    const menuRef = useRef(null);

    const NOTIFICATIONS_PER_PAGE = 10;

    useEffect(() => {
        // Build the sender map when notifications are loaded from the context
        const buildSenderMap = async () => {
            if (notifications.length === 0) return;
            // Assuming senders are admins
            const adminSnap = await getDocs(collection(db, "admin"));
            const emailToNameMap = {};
            adminSnap.forEach(doc => {
                const data = doc.data();
                emailToNameMap[data.email] = data.name;
            });
            setSenderMap(emailToNameMap);
        };
        buildSenderMap();
    }, [notifications]);

    // Effect to close the menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) { setOpenMenuId(null); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = (notification) => {
        setSelectedNotif(notification);
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
        try {
            const notificationDocRef = doc(db, "notifications", notificationId);
            await deleteDoc(notificationDocRef);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (selectedNotif && selectedNotif.id === notificationId) {
                setSelectedNotif(null);
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
            alert("Failed to delete notification.");
        }
        setOpenMenuId(null);
    };

    const totalPages = Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const paginatedNotifications = notifications.slice(startIndex, startIndex + NOTIFICATIONS_PER_PAGE);

    if (loading) return <div className="spinner-container"><div className="spinner"></div></div>;

    return (
        // ADDED: Grey background for the whole page area
        <div className="bg-gray-50 p-6 font-sans min-h-full"> 
            {/* ADDED: White container for all content */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 justify-center">
                    <BellIcon />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-sm font-semibold px-2.5 py-0.5 rounded-full">
                            {`${unreadCount} new`}
                        </span>
                    )}
                </h2>
                <hr className="mb-5 border-gray-300" />
                
                {/* Original split-view layout is preserved below */}
                <div className="flex flex-col md:flex-row gap-5 h-[calc(100vh-250px)]">
                    <div className={`flex flex-col transition-all duration-300 ease-in-out ${selectedNotif ? 'w-full md:w-2/5' : 'w-full'}`}>
                        {notifications.length === 0 ? (
                            <div className="border border-gray-200 rounded-md h-full flex items-center justify-center">
                                <p className="text-gray-600 italic text-center p-4">No notifications available.</p>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col border border-gray-200 rounded-lg">
                                <div className="overflow-y-auto flex-grow no-scrollbar">
                                    {paginatedNotifications.map((notif) => {
                                        const isSelected = selectedNotif && selectedNotif.id === notif.id;
                                        const isRead = readNotifIds.has(notif.id);
                                        const senderName = senderMap[notif.senderEmail] || "Admin";

                                        return (
                                            <div key={notif.id} className={`flex items-center gap-4 p-3 border-b border-gray-200 cursor-pointer transition-colors duration-150 relative ${isSelected ? 'bg-blue-100' : isRead ? 'bg-gray-50' : 'hover:bg-gray-50'}`} onClick={() => handleNotificationClick(notif)}>
                                                {!isRead && (<div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-1 bg-blue-600 rounded-r-full"></div>)}
                                                <div className="w-24 text-sm text-gray-600 font-medium text-left flex-shrink-0">{notif.timestamp?.toDate().toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}</div>
                                                <div className="flex-grow flex items-center gap-3 overflow-hidden">
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-md flex-shrink-0 ${isRead && !isSelected ? 'bg-gray-200 text-gray-500' : 'bg-gray-200 text-gray-800'}`}>{senderName}</span>
                                                    <div className="flex-grow overflow-hidden">
                                                        <p className={`font-semibold text-sm truncate ${isRead && !isSelected ? 'text-gray-500 font-normal' : 'text-gray-900 font-semibold'}`}>{notif.title}</p>
                                                        <p className={`text-xs truncate ${isRead && !isSelected ? 'text-gray-400' : 'text-gray-500'}`}>{notif.message}</p>
                                                    </div>
                                                </div>
                                                <div className="relative ml-auto pl-2">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === notif.id ? null : notif.id); }} className="p-1 rounded-full text-gray-500 hover:bg-gray-300 focus:outline-none" aria-label="Options"><MoreVerticalIcon /></button>
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
                                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* REVERTED: The detail view logic is back */}
                    {selectedNotif && (
                        <div className="w-full md:w-3/5 border border-gray-300 rounded-lg relative">
                            <button onClick={() => setSelectedNotif(null)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10" aria-label="Close"><CloseIcon /></button>
                            <div className="p-5 h-full overflow-y-auto">
                                <h3 className="text-xl font-bold mb-2">{selectedNotif.title}</h3>
                                <div className="text-sm text-gray-600 mb-4 border-b pb-3">
                                    <p><strong>From: </strong>{senderMap[selectedNotif.senderEmail] || "Admin"} ({selectedNotif.senderEmail})</p>
                                    <p className="mt-1"><strong>Date: </strong>{selectedNotif.timestamp.toDate().toLocaleString("en-IN")}</p>
                                </div>
                                <div className="text-base text-gray-800 whitespace-pre-wrap">{selectedNotif.message}</div>
                                {selectedNotif.link && (<div className="mt-6"><a href={selectedNotif.link} target="_blank" rel="noopener noreferrer" className="text-base text-blue-700 underline hover:text-blue-900 font-medium">{selectedNotif.fileName || "View Attachment"}</a></div>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewAdminNotifications;