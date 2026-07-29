import React from "react";
import { GraduationCap, Award, Trophy, BookOpen, ShieldCheck, BrainCircuit, Sparkles, Zap, Moon, Sun } from "lucide-react";
import { BrandingSettings } from "../types";

interface NavbarProps {
  currentView: "participant" | "admin";
  onViewChange: (view: "participant" | "admin") => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
  branding?: BrandingSettings | null;
}

export function Navbar({
  currentView,
  onViewChange,
  darkMode,
  onToggleDarkMode,
  isAdminLoggedIn,
  onAdminLogout,
  branding
}: NavbarProps) {
  const rawPrefix = branding?.logoTextPrefix || "Tryout";
  const logoPrefix = rawPrefix.trim() + " ";
  const logoSuffix = (branding?.logoTextSuffix === "ICONTC" ? "ICON TC" : (branding?.logoTextSuffix || "ICON TC")).trim();
  const logoSub = branding?.logoSubtext || "ICON TC Exam Simulation System";
  const logoType = branding?.logoType || "icon";
  const logoUrl = branding?.logoUrl || "";

  const renderLogoIcon = () => {
    const iconName = branding?.logoIconName || "BookOpen";
    const iconProps = { className: "h-5.5 w-5.5 transition-transform duration-300 group-hover:scale-110" };
    switch (iconName) {
      case "Award": return <Award {...iconProps} />;
      case "Trophy": return <Trophy {...iconProps} />;
      case "BookOpen": return <BookOpen {...iconProps} />;
      case "ShieldCheck": return <ShieldCheck {...iconProps} />;
      case "BrainCircuit": return <BrainCircuit {...iconProps} />;
      case "Sparkles": return <Sparkles {...iconProps} />;
      case "Zap": return <Zap {...iconProps} />;
      case "GraduationCap":
      default:
        return <GraduationCap {...iconProps} />;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/85 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Brand Name */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-blue-500/20 group ring-2 ring-blue-500/20 dark:ring-blue-400/30 transition-all hover:shadow-lg hover:shadow-blue-500/30">
            {logoType === "url" && logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Brand"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white dark:from-blue-500 dark:via-indigo-500 dark:to-violet-500">
                {renderLogoIcon()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {logoPrefix}<span className="font-medium text-blue-600 dark:text-blue-400">{logoSuffix}</span>
            </h1>
            <p className="hidden text-[10px] font-medium tracking-wider text-gray-400 uppercase sm:block dark:text-slate-500">
              {logoSub}
            </p>
          </div>
        </div>

        {/* Navigation Action Area */}
        <div className="flex items-center gap-3">
          {/* View Toggle tabs */}
          <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => onViewChange("participant")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                currentView === "participant"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Portal Peserta
            </button>
            <button
              onClick={() => onViewChange("admin")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                currentView === "admin"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400"
                  : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Konsol Admin
            </button>
          </div>

          {/* Dark Mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* Admin Logout button if logged in */}
          {currentView === "admin" && isAdminLoggedIn && (
            <button
              onClick={onAdminLogout}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              Keluar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
