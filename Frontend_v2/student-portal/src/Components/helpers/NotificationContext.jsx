import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, or, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [readNotifIds, setReadNotifIds] = useState(new Set());
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const studentQuery = query(collection(db, "students"), where("email", "==", user.email));
                const teacherQuery = query(collection(db, "teachers"), where("email", "==", user.email));
                const [studentSnapshot, teacherSnapshot] = await Promise.all([
                    getDocs(studentQuery),
                    getDocs(teacherQuery)
                ]);

                let role = null;
                if (!studentSnapshot.empty) role = 'student';
                else if (!teacherSnapshot.empty) role = 'teacher';

                if (role) {
                    const info = { email: user.email, role: role };
                    setUserInfo(info);
                    fetchData(info.email, info.role);
                } else {
                    setLoading(false);
                }
            } else {
                setUserInfo(null);
                setNotifications([]);
                setReadNotifIds(new Set());
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!userInfo) return;
        const LOCAL_STORAGE_KEY = `read_notifs_${userInfo.role}_${userInfo.email}`;
        const storedReadIds = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedReadIds) {
            setReadNotifIds(new Set(JSON.parse(storedReadIds)));
        }
    }, [userInfo]);
    
    useEffect(() => {
        if (!userInfo) return;
        const LOCAL_STORAGE_KEY = `read_notifs_${userInfo.role}_${userInfo.email}`;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(readNotifIds)));
    }, [readNotifIds, userInfo]);

    useEffect(() => {
        const count = notifications.filter(n => !readNotifIds.has(n.id)).length;
        setUnreadCount(count);
    }, [notifications, readNotifIds]);

    const fetchData = async (email, role) => {
        setLoading(true);
        try {
            let notifQuery;
            if (role === 'student') {
                const studentDoc = (await getDocs(query(collection(db, "students"), where("email", "==", email)))).docs[0];
                const studentData = studentDoc.data();
                notifQuery = query(collection(db, "notifications"),
                    or(
                        where("recipients", "array-contains", email),
                        where("semester", "==", studentData.semester),
                        where("section", "==", studentData.section)
                    )
                    // Note: Student query is complex, sorting is done later
                );
            } else if (role === 'teacher') {
                // --- THIS IS THE CHANGED PART ---
                // We remove the orderBy() from the Firestore query to avoid the index error.
                notifQuery = query(collection(db, "notifications"),
                    where("recipients", "array-contains", email)
                );
            } else {
                setNotifications([]);
                setLoading(false);
                return;
            }

            const notifSnap = await getDocs(notifQuery);
            let notifData = notifSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            // We now sort the data here in the browser for ALL roles
            notifData.sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));

            setNotifications(notifData);

        } catch (error) {
            console.error("Failed to fetch notifications:", error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        readNotifIds,
        setNotifications,
        setReadNotifIds,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};