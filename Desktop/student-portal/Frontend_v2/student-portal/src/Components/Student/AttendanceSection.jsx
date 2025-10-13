import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Helper function for all attendance logic (no changes needed here)
const calculateAttendanceMetrics = (attended, total, minPercent = 75) => {
  if (total === 0) {
    return {
      status: "N/A",
      classesMissed: 0,
      canStillMiss: "N/A",
      colorClass: "text-gray-500",
      percentage: "0.00",
    };
  }
  const percentage = (attended / total) * 100;
  const classesMissed = total - attended;
  const maxAllowedAbsences = Math.floor(total * (1 - minPercent / 100));
  const canStillMiss = maxAllowedAbsences - classesMissed;

  let status = "";
  let colorClass = "";

  if (percentage >= 85) {
    status = "Safe";
    colorClass = "text-green-700";
  } else if (percentage >= minPercent) {
    status = "At Risk";
    colorClass = "text-orange-500";
  } else {
    status = "Danger";
    colorClass = "text-red-600";
  }

  return {
    percentage: percentage.toFixed(2),
    classesMissed,
    canStillMiss,
    status,
    colorClass,
  };
};

const AttendanceSection = ({ studentId, semester }) => {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId || !semester) return;
      setIsLoading(true);
      setError(null);
      try {
        const subjectsPromise = getDocs(collection(db, "subjects"));
        const attendancePromise = getDocs(
          query(
            collection(db, "attendance"),
            where("semester", "==", Number(semester))
          )
        );
        const [subjectsSnap, attendanceSnap] = await Promise.all([
          subjectsPromise,
          attendancePromise,
        ]);
        const subjectMap = {};
        subjectsSnap.docs.forEach((doc) => {
          subjectMap[doc.id] = doc.data().name;
        });

        if (attendanceSnap.empty) {
          setError("No attendance records found for this semester.");
          setAttendanceSummary([]);
          setIsLoading(false);
          return;
        }

        const rawData = attendanceSnap.docs.map((doc) => doc.data());
        const summary = {};
        rawData.forEach((record) => {
          const code = record.subjectCode;
          if (!summary[code]) {
            summary[code] = { attended: 0, total: 0 };
          }
          summary[code].attended += record.attendanceByStudent?.[studentId] || 0;
          summary[code].total += Number(record.totalClasses) || 0;
        });

        const finalSummary = Object.entries(summary).map(
          ([subjectCode, { attended, total }]) => {
            const metrics = calculateAttendanceMetrics(attended, total);
            return {
              subjectCode,
              subjectName: subjectMap[subjectCode] || "N/A",
              attended,
              total,
              ...metrics,
            };
          }
        );
        setAttendanceSummary(finalSummary);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load attendance data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [studentId, semester]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex justify-center items-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    // --- THIS LINE IS UPDATED TO CREATE THE WHITE CONTAINER ---
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-3"> 
        <img src="/attendance.png" alt="Attendance Icon" className="w-8 h-8"/>Attendance Summary</h2>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {attendanceSummary.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Subject</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Attendance</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Classes Missed</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Available Leaves</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceSummary.map((record) => (
                <tr key={record.subjectCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{record.subjectName}</div>
                    <div className="text-xs text-gray-500">{record.subjectCode}</div>
                  </td>
                  <td className={`px-4 py-3 text-center font-bold ${record.colorClass}`}>
                    {record.percentage}%
                    <div className="font-normal text-gray-500 text-xs">
                      ({record.attended}/{record.total})
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{record.classesMissed}</td>
                  <td className={`px-4 py-3 text-center font-bold ${record.canStillMiss < 1 ? 'text-red-600' : ''}`}>
                    {record.canStillMiss}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && <p>No attendance data to display.</p>
      )}
    </section>
  );
};

export default AttendanceSection;