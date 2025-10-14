import React from "react";
import { Globe, CreditCard, GraduationCap, BarChart3, Laptop } from "lucide-react";

const links = [
  { title: "Official Website", url: "https://www.rvitm.edu.in/", icon: <Globe className="w-6 h-6" /> },
  { title: "Fees", url: "https://wds-prd.rvei.edu.in:4430/sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html", icon: <CreditCard className="w-6 h-6" /> },
  { title: "NPTEL Website", url: "https://nptel.ac.in/", icon: <GraduationCap className="w-6 h-6" /> },
  { title: "VTU Website", url: "https://vtu.ac.in/", icon: <BarChart3 className="w-6 h-6" /> },
  { title: "Xcelerator", url: "https://vtu.xcelerator.co.in/login", icon: <Laptop className="w-6 h-6" /> },
];

const QuickLinks = () => {
  return (
    <div className="w-full px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <h2 className="text-2xl font-bold mb-8 text-center text-gray-800 flex items-center justify-center gap-3">
          <img src="/link.png" alt="Links Icon" className="w-8 h-8" />
            Quick Links
        </h2>

        {/* Use flexbox instead of grid */}
        <div className="flex flex-wrap justify-center gap-6">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-3 w-64 p-6 rounded-xl shadow-md border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 hover:from-blue-100 hover:to-blue-200 transition-transform hover:-translate-y-1"
            >
              <div className="p-3 rounded-full bg-blue-200 text-blue-700 shadow-sm flex items-center justify-center">
                {link.icon}
              </div>
              <span className="font-medium text-lg text-center">
                {link.title}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickLinks;