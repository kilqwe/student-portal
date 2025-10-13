import React, { useEffect, useState } from "react";
import { FaSearch, FaEnvelope, FaPhone, FaIdBadge, FaArrowCircleLeft, FaArrowCircleRight } from "react-icons/fa";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

const StudentTeacherList = () => {
    const [allTeachers, setAllTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [departmentPages, setDepartmentPages] = useState({});

    useEffect(() => {
        async function fetchTeachers() {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "teachers"));
                const teachers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setAllTeachers(teachers);
            } catch (error) {
                console.error("Error fetching teachers:", error);
            }
            setLoading(false);
        }
        fetchTeachers();
    }, []);

    useEffect(() => {
        setDepartmentPages({});
    }, [teacherSearchQuery, selectedDepartment]);

    const filteredAndGroupedTeachers = Object.entries(
        allTeachers
            .filter((teacher) => {
                const query = teacherSearchQuery.toLowerCase();
                const matchesSearch =
                    (teacher.name || "").toLowerCase().includes(query) ||
                    (teacher.email || "").toLowerCase().includes(query) ||
                    String(teacher.phone || "").toLowerCase().includes(query) ||
                    (teacher.department || "").toLowerCase().includes(query);

                const matchesDepartment =
                    selectedDepartment === "All" ||
                    (teacher.department || "Unknown") === selectedDepartment;
                return matchesSearch && matchesDepartment;
            })
            .reduce((acc, teacher) => {
                const dept = teacher.department || "Unknown";
                if (!acc[dept]) acc[dept] = [];
                acc[dept].push(teacher);
                return acc;
            }, {})
    );

    if (loading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="bg-gray-50 p-4 md:p-6 min-h-screen">
            <section className="space-y-8">
                {/* --- Filter Section --- */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center flex items-center justify-center gap-3">
                        <img src="/lecture.png" alt="Teachers Icon" className="w-8 h-8" />
                        All Teachers
                    </h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative w-full md:w-1/2">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, phone, or department"
                                value={teacherSearchQuery}
                                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <select
                            id="departmentFilter"
                            value={selectedDepartment || "All"}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All Departments</option>
                            {Array.from(new Set(allTeachers.map((t) => t.department || "Unknown")))
                                .sort()
                                .map((dept) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* --- Teacher List Section --- */}
                {filteredAndGroupedTeachers.length > 0 ? (
                    filteredAndGroupedTeachers.map(([department, deptTeachers]) => {
                        const teachersPerPage = 3;
                        const currentPage = departmentPages[department] || 0;
                        const totalPages = Math.ceil(deptTeachers.length / teachersPerPage);
                        const startIndex = currentPage * teachersPerPage;
                        const paginatedTeachers = deptTeachers.slice(
                            startIndex,
                            startIndex + teachersPerPage
                        );

                        const handleNext = () => setDepartmentPages((prev) => ({ ...prev, [department]: Math.min(currentPage + 1, totalPages - 1) }));
                        const handlePrev = () => setDepartmentPages((prev) => ({ ...prev, [department]: Math.max(currentPage - 1, 0) }));

                        return (
                            <div key={department} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="flex-grow text-center text-xl font-semibold text-gray-700">{department} Department</h3>
                                    <div className="w-20 flex justify-end items-center gap-3">
                                        {deptTeachers.length > teachersPerPage && (
                                            <>
                                                <button onClick={handlePrev} disabled={currentPage === 0} className="disabled:opacity-40 disabled:cursor-not-allowed">
                                                    <FaArrowCircleLeft size={24} className="text-gray-500 hover:text-blue-600 transition" />
                                                </button>
                                                <button onClick={handleNext} disabled={currentPage >= totalPages - 1} className="disabled:opacity-40 disabled:cursor-not-allowed">
                                                    <FaArrowCircleRight size={24} className="text-gray-500 hover:text-blue-600 transition" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentPage}
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ duration: 0.3 }}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                    >
                                        {paginatedTeachers.map((teacher) => (
                                            <div key={teacher.id} className="bg-blue-50 rounded-lg shadow p-5 border border-gray-200 flex flex-col gap-3 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-105">
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-800">{teacher.name}</h4>
                                                    <p className="text-sm text-gray-500">{teacher.department || "Unknown"}</p>
                                                </div>
                                                <div className="space-y-2 text-sm text-gray-700">
                                                    <div className="flex items-center gap-3"><FaEnvelope className="text-gray-400" /><span>{teacher.email}</span></div>
                                                    <div className="flex items-center gap-3"><FaPhone className="text-gray-400" /><span>{teacher.phone}</span></div>
                                                </div>
                                                <div className="mt-auto pt-2">
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">
                                                        <FaIdBadge /><span>ID: {teacher.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center text-gray-500">
                        <p>No teachers found matching your criteria.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentTeacherList;