import React from "react";

export default function ProfileCard({
  photo,
  name,
  email,
  role = "Teacher",
  attributes = {},
}) {
  const roleSpecificAttributes = () => {
    switch (role.toLowerCase()) {
      case "admin":
        return {
          "Employee ID": attributes.employeeId,
          Phone: attributes.phone,
        };
      case "student":
        return {
          USN: attributes.usn,
          Semester: attributes.semester,
          Section: attributes.section,
          Phone: attributes.phone,
          Mentor: attributes.mentor,
        };
      case "teacher":
      case "professor":
        return {
          "Employee ID": attributes.employeeId,
          Department: attributes.department,
          Phone: attributes.phone,
        };
      default:
        return attributes;
    }
  };

  const displayAttributes = roleSpecificAttributes();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
      {/* Smaller Avatar */}
      <img
        src={
          photo ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name || "User"
          )}&background=D1E3FF&color=022C54&size=64&bold=true`
        }
        alt={name}
        className="w-16 h-16 object-cover rounded-full mx-auto border border-gray-300"
      />

      {/* Basic Info */}
      <h3 className="mt-2 text-sm font-semibold text-gray-900 truncate">{name}</h3>
      <p className="text-xs text-gray-500 truncate">{email}</p>
      <p className="mt-1 text-xs font-medium text-blue-600 capitalize">{role}</p>

      {/* Attributes */}
      <div className="mt-2 space-y-0.5 text-xs text-left">
        {Object.entries(displayAttributes).map(
          ([key, value]) =>
            value && (
              <p key={key} className="truncate">
                <span className="font-medium">{key}:</span> {value}
              </p>
            )
        )}
      </div>
    </div>
  );
}
