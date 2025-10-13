import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import Pagination from "../helpers/Pagination";
import { FaUserPlus, FaUsers, FaUserShield, FaEye, FaEyeSlash, FaTrash, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// A reusable component for displaying styled messages
const StatusMessage = ({ message, type }) => {
    if (!message) return null;
    let bgColor, textColor, Icon;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; Icon = FaCheckCircle;
            break;
        case 'error':
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; Icon = FaExclamationTriangle;
            break;
        default:
            return null;
    }
  
    return (
      <div className={`p-3 rounded-md mb-6 flex items-center gap-3 text-sm font-semibold ${bgColor} ${textColor}`}>
        <Icon />
        <span>{message}</span>
      </div>
    );
};

export default function ManageAdmins() {
    const [activeTab, setActiveTab] = useState('viewTeachers');
    const [admins, setAdmins] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState("success");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [selectedDept, setSelectedDept] = useState("All");
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const TEACHERS_PER_PAGE = 7;

    const showMessage = (msg, type = "success", duration = 4000) => {
        setStatus(msg);
        setStatusType(type);
        if (duration) {
            setTimeout(() => setStatus(""), duration);
        }
    };

    const fetchAdmins = async () => {
        const snapshot = await getDocs(collection(db, "admin"));
        setAdmins(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    const fetchTeachers = async () => {
        const snapshot = await getDocs(collection(db, "teachers"));
        setTeachers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([fetchAdmins(), fetchTeachers()]);
            } catch (error) {
                showMessage("Failed to fetch initial data.", "error");
                console.error("Error fetching data: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDept]);

    const handleAddTeacher = async (e) => {
        e.preventDefault();
        const { name, email, phone, department, employeeId, password } = e.target.elements;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
            await setDoc(doc(db, "teachers", employeeId.value), { 
                name: name.value, email: email.value, phone: phone.value, department: department.value, 
                role: "teacher", uid: userCredential.user.uid 
            });
            showMessage("Teacher added successfully!", "success");
            e.target.reset();
            fetchTeachers();
        } catch (err) {
            showMessage("Failed to add teacher: " + err.message, "error");
        }
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        const { name, email, phone, employeeId, password } = e.target.elements;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
            await setDoc(doc(db, "admin", employeeId.value), { 
                name: name.value, email: email.value, phone: phone.value, 
                role: "admin", uid: userCredential.user.uid 
            });
            showMessage("Admin added successfully!", "success");
            e.target.reset();
            fetchAdmins();
        } catch (err) {
            showMessage("Failed to add admin: " + err.message, "error");
        }
    };

    const handleDelete = async (collectionName, id) => {
        if (!window.confirm(`Are you sure you want to delete this user from ${collectionName}? This action is permanent.`)) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
            showMessage(`Successfully deleted user from ${collectionName}.`, "success");
            collectionName === "admin" ? fetchAdmins() : fetchTeachers();
        } catch (err) {
            showMessage("Delete failed: " + err.message, "error");
        }
    };
    
    const departments = ["All", "CSE", "AI/ML", "ECE", "MECH"];
    const filteredTeachers = selectedDept === "All" ? teachers : teachers.filter((t) => t.department === selectedDept);
    const totalPages = Math.ceil(filteredTeachers.length / TEACHERS_PER_PAGE);
    const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * TEACHERS_PER_PAGE, currentPage * TEACHERS_PER_PAGE);

    const TabButton = ({ tabName, label, icon: Icon }) => (
        <button
          onClick={() => setActiveTab(tabName)}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-lg border-b-4 transition-colors ${
            activeTab === tabName
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Icon /> {label}
        </button>
    );

    if (isLoading) {
        return <div className="spinner-container"><div className="spinner"></div></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex border-b border-gray-200">
                <TabButton tabName="viewTeachers" label="View Teachers" icon={FaUsers} />
                <TabButton tabName="addTeacher" label="Add Teacher" icon={FaUserPlus} />
                <TabButton tabName="viewAdmins" label="View Admins" icon={FaUserShield} />
                <TabButton tabName="addAdmin" label="Add Admin" icon={FaUserPlus} />
            </div>

            <StatusMessage message={status} type={statusType} />

            {/* View Teachers Tab */}
            {activeTab === 'viewTeachers' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 flex-grow text-center">Current Teachers</h2>
                        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full md:w-auto p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                            {departments.map((dept) => (<option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>))}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="text-xs text-white uppercase bg-blue-600">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Employee ID</th><th scope="col" className="px-6 py-3">Email & Phone</th><th scope="col" className="px-6 py-3">Department</th><th scope="col" className="px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTeachers.map((t) => (
                                    <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{t.name}</td><td className="px-6 py-4">{t.id}</td>
                                        <td className="px-6 py-4"><div>{t.email}</div><div className="text-gray-500">{t.phone}</div></td>
                                        <td className="px-6 py-4">{t.department}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDelete("teachers", t.id)} className="text-red-500 hover:text-red-700" title="Delete Teacher"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredTeachers.length === 0 && <p className="text-center text-gray-500 py-10">No teachers found for the selected department.</p>}
                    </div>
                    {totalPages > 1 && (<div className="flex justify-center mt-6"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>)}
                </div>
            )}

            {/* Add Teacher Tab */}
            {activeTab === 'addTeacher' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center justify-center">Add New Teacher</h2>
                    <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input name="name" placeholder="Name" required className="p-2 border rounded-md" />
                        <input name="employeeId" placeholder="Employee ID" required className="p-2 border rounded-md" />
                        <input name="email" type="email" placeholder="Email Address" required className="p-2 border rounded-md" />
                        <input name="phone" placeholder="Phone Number" required className="p-2 border rounded-md" />
                        <select name="department" required className="p-2 border rounded-md h-[42px]">
                            <option value="" disabled>Select Department</option>
                            {departments.slice(1).map((dept) => (<option key={dept} value={dept}>{dept}</option>))}
                        </select>
                        <div className="relative">
                            <input name="password" type={passwordVisible ? "text" : "password"} placeholder="Password" required className="p-2 w-full border rounded-md pr-12" />
                            <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-gray-800">
                                {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <button type="submit" className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">Add Teacher</button>
                    </form>
                </div>
            )}
            
            {/* View Admins Tab */}
            {activeTab === 'viewAdmins' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center justify-center">Current Admins</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-700">
                            <thead className="text-xs text-white uppercase bg-blue-600">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Employee ID</th><th scope="col" className="px-6 py-3">Email & Phone</th><th scope="col" className="px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map((a) => (
                                    <tr key={a.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{a.name}</td><td className="px-6 py-4">{a.id}</td>
                                        <td className="px-6 py-4"><div>{a.email}</div><div className="text-gray-500">{a.phone}</div></td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDelete("admin", a.id)} className="text-red-500 hover:text-red-700" title="Delete Admin"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {admins.length === 0 && <p className="text-center text-gray-500 py-10">No admins found.</p>}
                    </div>
                </div>
            )}

            {/* Add Admin Tab */}
            {activeTab === 'addAdmin' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center justify-center">Add New Admin</h2>
                    <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input name="name" placeholder="Name" required className="p-2 border rounded-md" />
                        <input name="employeeId" placeholder="Employee ID" required className="p-2 border rounded-md" />
                        <input name="email" type="email" placeholder="Email Address" required className="p-2 border rounded-md" />
                        <input name="phone" placeholder="Phone Number" required className="p-2 border rounded-md" />
                        <div className="relative md:col-span-2">
                            <input name="password" type={passwordVisible ? "text" : "password"} placeholder="Password" required className="p-2 w-full border rounded-md pr-12" />
                            <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500 hover:text-gray-800">
                                {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        <button type="submit" className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition">Add Admin</button>
                    </form>
                </div>
            )}
        </div>
    );
}