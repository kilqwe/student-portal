import React, { useEffect, useState, useRef } from 'react';
import { useNotifications } from '../helpers/NotificationContext';
import Pagination from '../helpers/Pagination';
import { getDocs, collection, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaInbox, FaTrash, FaEnvelopeOpen, FaSearch, FaLink } from 'react-icons/fa';
import { FiX } from "react-icons/fi";
import { motion, AnimatePresence } from 'framer-motion';

const ViewAdminNotifications = () => {
    const { 
        notifications, 
        loading, 
        unreadCount,
        readNotifIds, 
        setNotifications,
        setReadNotifIds
    } = useNotifications();
    
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedNotif, setSelectedNotif] = useState(null); // State to manage the open modal
    const [senderMap, setSenderMap] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const NOTIFICATIONS_PER_PAGE = 10;

    useEffect(() => {
        const buildSenderMap = async () => {
            if (notifications.length === 0) return;
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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // This function now marks as read AND opens the modal
    const handleNotificationClick = (notification) => {
        const newReadIds = new Set(readNotifIds);
        newReadIds.add(notification.id);
        setReadNotifIds(newReadIds);
        setSelectedNotif(notification); // Open the modal with the clicked notification
    };

    const handleMarkAsUnread = (notificationId) => {
        const newReadIds = new Set(readNotifIds);
        newReadIds.delete(notificationId);
        setReadNotifIds(newReadIds);
    };

    const handleDelete = async (notificationId) => {
        if (!window.confirm("Are you sure you want to delete this notification?")) return;
        try {
            await deleteDoc(doc(db, "notifications", notificationId));
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (selectedNotif && selectedNotif.id === notificationId) {
                setSelectedNotif(null); // Close modal if the open notification is deleted
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
            alert("Failed to delete notification.");
        }
    };
    
    const filteredNotifications = notifications.filter(notif => 
        notif.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        notif.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (senderMap[notif.senderEmail] || "Admin").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + NOTIFICATIONS_PER_PAGE);

    if (loading) return <div className="spinner-container"><div className="spinner"></div></div>;

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                {unreadCount} New
                            </span>
                        )}
                    </h2>
                    <div className="relative w-full md:w-auto">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                
                {notifications.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
                        <FaInbox className="mx-auto text-4xl text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700">All Caught Up!</h3>
                        <p className="text-gray-500 mt-1">You have no notifications.</p>
                    </div>
                ) : paginatedNotifications.length === 0 ? (
                     <div className="text-center py-16 px-6 bg-gray-50 rounded-lg">
                        <FaSearch className="mx-auto text-4xl text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700">No Matching Notifications</h3>
                        <p className="text-gray-500 mt-1">Try a different search term.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-700">
                                <thead className="text-xs text-white uppercase bg-blue-600">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">From</th>
                                        <th scope="col" className="px-6 py-3">Title</th>
                                        <th scope="col" className="px-6 py-3">Message</th>
                                        <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedNotifications.map((notif) => {
                                        const isRead = readNotifIds.has(notif.id);
                                        const senderName = senderMap[notif.senderEmail] || "Admin";

                                        return (
                                            <tr 
                                                key={notif.id} 
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`border-b hover:bg-gray-100 cursor-pointer ${!isRead && 'bg-blue-50 font-semibold'}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                                    {notif.timestamp?.toDate().toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4">{senderName}</td>
                                                <td className={`px-6 py-4 ${!isRead && 'text-gray-900'}`}>{notif.title}</td>
                                                <td className="px-6 py-4 max-w-sm truncate text-gray-600" title={notif.message}>
                                                    {notif.message}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-4">
                                                        {isRead && (
                                                            <button onClick={(e) => { e.stopPropagation(); handleMarkAsUnread(notif.id); }} className="text-gray-400 hover:text-blue-600" title="Mark as Unread">
                                                                <FaEnvelopeOpen />
                                                            </button>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }} className="text-gray-400 hover:text-red-600" title="Delete">
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-6">
                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- NOTIFICATION MODAL --- */}
            <AnimatePresence>
                {selectedNotif && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedNotif(null)} // Close on overlay click
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h3 className="text-xl font-bold text-gray-900">{selectedNotif.title}</h3>
                                <button onClick={() => setSelectedNotif(null)} className="text-gray-400 hover:text-gray-800 p-1 rounded-full">
                                    <FiX size={20}/>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <div className="text-sm text-gray-600 mb-4 space-y-1">
                                    <p><strong className="font-semibold text-gray-800 w-16 inline-block">From:</strong> {senderMap[selectedNotif.senderEmail] || "Admin"}</p>
                                    <p><strong className="font-semibold text-gray-800 w-16 inline-block">Date:</strong> {selectedNotif.timestamp.toDate().toLocaleString("en-IN", { dateStyle: 'full', timeStyle: 'short' })}</p>
                                </div>
                                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {selectedNotif.message}
                                </div>
                                {selectedNotif.link && (
                                    <div className="mt-6 pt-6 border-t">
                                        <a href={selectedNotif.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors">
                                            <FaLink />
                                            {selectedNotif.fileName || "View Attachment"}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ViewAdminNotifications;