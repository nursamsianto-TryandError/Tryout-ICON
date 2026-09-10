import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { ParticipantPortal } from "./components/ParticipantPortal";
import { AdminPanel } from "./components/AdminPanel";
import { validateAdminLogin, seedInitialDataIfEmpty, getBrandingSettings } from "./services/dbService";
import { BrandingSettings } from "./types";
import { ShieldAlert, Key, User, CheckCircle, AlertCircle, RefreshCw, Sparkles, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [currentView, setCurrentView] = useState<"participant" | "admin">("participant");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [loggedInAdmin, setLoggedInAdmin] = useState<string>(() => {
    return localStorage.getItem("admin_username") || "admin";
  });
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  
  // Admin Login Form States
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Toast / Notification states
  interface Notification {
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Seed data on startup
  useEffect(() => {
    // Load dynamic branding options
    getBrandingSettings()
      .then((settings) => {
        setBranding(settings);
      })
      .catch((e) => {
        console.error("Error loading branding config:", e);
      });

    seedInitialDataIfEmpty()
      .then(() => {
        console.log("Seed verification executed successfully.");
      })
      .catch((e) => {
        addNotification("Seeder alert: " + e.message, "info");
      });

    // Check if admin is currently logged in via session
    const adminSessionActive = localStorage.getItem("admin_session_active") === "true";
    if (adminSessionActive) {
      setIsAdminLoggedIn(true);
    }

    // Check dark mode preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const localDark = localStorage.getItem("theme_dark") === "true";
    if (localDark || (!localStorage.getItem("theme_dark") && prefersDark)) {
      setDarkMode(true);
    }
  }, []);

  // Update browser tab document.title based on branding & currentView
  useEffect(() => {
    const rawPrefix = branding?.logoTextPrefix || "Tryout";
    const rawSuffix = branding?.logoTextSuffix === "ICONTC" ? "ICON TC" : (branding?.logoTextSuffix || "ICON TC");
    const brandName = `${rawPrefix.trim()} ${rawSuffix.trim()}`.trim();
    if (currentView === "admin") {
      document.title = `${brandName} - Konsol Admin`;
    } else {
      document.title = `${brandName} - Portal Peserta`;
    }
  }, [branding, currentView]);

  // Update DOM classes for Dark Mode support
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Handle dark mode toggle
  const handleToggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme_dark", String(next));
      return next;
    });
  };

  // Toast notifier constructor
  const addNotification = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss in 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  // Admin login submit
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPin.trim()) {
      addNotification("Harap masukkan nama pengguna dan PIN.", "error");
      return;
    }

    setAuthLoading(true);
    try {
      const isValid = await validateAdminLogin(adminUsername, adminPin);
      if (isValid) {
        setIsAdminLoggedIn(true);
        const activeUser = adminUsername.trim();
        localStorage.setItem("admin_session_active", "true");
        localStorage.setItem("admin_username", activeUser);
        setLoggedInAdmin(activeUser);
        addNotification("Validasi Admin berhasil!", "success");
      } else {
        addNotification("Nama pengguna atau kode PIN akses salah.", "error");
      }
    } catch (err: any) {
      addNotification("Koneksi otentikasi gagal: " + err.message, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem("admin_session_active");
    localStorage.removeItem("admin_username");
    setAdminUsername("");
    setAdminPin("");
    addNotification("Berhasil keluar dari Admin.", "info");
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937] transition-colors duration-200 dark:bg-[#0F172A] dark:text-slate-100 flex flex-col font-sans">
      
      {/* Dynamic Header / Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={handleAdminLogout}
        branding={branding}
      />

      {/* Main active container sheet */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          {currentView === "participant" ? (
            <motion.div
              key="participant"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <ParticipantPortal onNotify={addNotification} branding={branding} />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full h-full"
            >
              {isAdminLoggedIn ? (
                <AdminPanel 
                  onNotify={addNotification} 
                  branding={branding} 
                  onBrandingUpdate={setBranding} 
                  currentAdminUsername={loggedInAdmin}
                  onAdminUsernameChange={setLoggedInAdmin}
                />
              ) : (
                /* Elegant Admin Sign-In Panel */
                <div className="max-w-md mx-auto my-12">
                  <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-xl dark:border-slate-850 dark:bg-slate-900 overflow-hidden relative">
                    
                    {/* Security theme aesthetics */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mx-auto mb-4">
                      <ShieldAlert className="h-6 w-6" />
                    </div>

                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Kredensial Admin Diperlukan</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                        Otorisasi akses ke parameter konsol Tryout, pembuatan soal, dan database hasil peserta.
                      </p>
                    </div>

                    <form onSubmit={handleAdminLoginSubmit} className="mt-6 space-y-4 text-xs">
                      <div>
                        <label className="block text-xs font-bold text-gray-650 dark:text-slate-350 mb-1">Username Admin</label>
                        <div className="relative">
                          <User className="absolute top-2.5 left-3 h-4.5 w-4.5 text-gray-400" />
                          <input
                            type="text"
                            required
                            placeholder="username"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-750 outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-650 dark:text-slate-350 mb-1">Kode Akses PIN</label>
                        <div className="relative">
                          <Key className="absolute top-2.5 left-3 h-4.5 w-4.5 text-gray-400" />
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={adminPin}
                            onChange={(e) => setAdminPin(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-750 outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/15 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
                      >
                        {authLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Mengautentikasi...
                          </>
                        ) : (
                          "Otorisasi Masuk"
                        )}
                      </button>
                    </form>

                    <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-400 mt-5 border-t border-gray-100 dark:border-slate-800 pt-3 dark:text-slate-500 font-medium">
                      <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                      <span>Area Terproteksi • Akses Khusus Instruktur & Admin ICON TC</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Notifications Toaster UI */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`rounded-xl border p-4 shadow-lg flex items-start gap-3 text-xs ${
                n.type === "success"
                  ? "bg-emerald-50 border-emerald-100/70 text-emerald-950 dark:bg-emerald-950/90 dark:border-emerald-900/60 dark:text-emerald-300"
                  : n.type === "error"
                  ? "bg-red-50 border-red-150 text-red-950 dark:bg-red-950/90 dark:border-red-900/65 dark:text-red-300"
                  : "bg-blue-50 border-blue-100 text-blue-950 dark:bg-blue-950/90 dark:border-blue-900/60 dark:text-blue-300"
              }`}
            >
              {n.type === "success" ? (
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
              )}
              <span className="font-semibold leading-relaxed grow">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
