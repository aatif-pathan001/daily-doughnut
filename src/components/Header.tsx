import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { LogOut, Calendar, CheckCircle, Sparkles, AlertCircle } from "lucide-react";
import { googleSignIn, logout } from "../firebase";

interface HeaderProps {
  user: User | null;
  onLoginSuccess: (user: User, token: string) => void;
  onLogoutSuccess: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLoginSuccess,
  onLogoutSuccess,
}) => {
  const [time, setTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greetings = ["Pause and reflect.", "What holds your focus today?", "Be intentional, not busy.", "One task at a time."];
  useEffect(() => {
    // Pick a prompt once a minute
    const msg = greetings[Math.floor((time.getMinutes() + time.getHours()) % greetings.length)];
    setStatusMsg(msg);
  }, [time.getMinutes()]);

  const handleSignIn = async () => {
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onLoginSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      console.warn("Sign in issue encountered:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled.");
      } else if (err?.code === "auth/cancelled-popup-request") {
        setError("Sign-in window already open.");
      } else {
        setError(err?.message || "Sign-in failed. Please try again.");
      }
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onLogoutSuccess();
    setShowProfileMenu(false);
  };

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <header className="border-b border-gray-100 bg-white/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left Section: Branding & Clock */}
        <div className="flex items-center gap-3">
          <div className="bg-neutral-950 text-white p-2 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-neutral-100" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-neutral-900">
              Intentional
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              daily & weekly planner
            </p>
          </div>
          <div className="hidden sm:block h-6 w-px bg-neutral-200 mx-1"></div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-mono font-medium text-neutral-600">{formattedTime}</span>
            <span className="text-[11px] text-neutral-400">{formattedDate}</span>
          </div>
        </div>

        {/* Center Section: Mindfulness prompt */}
        <div className="flex-1 max-w-md bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5 hidden lg:flex items-center justify-center gap-2 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="text-xs text-neutral-600 font-medium tracking-wide italic">
            &ldquo;{statusMsg || greetings[0]}&rdquo;
          </span>
        </div>

        {/* Right Section: Auth with Google styled GSI button */}
        <div className="flex items-center justify-between md:justify-end gap-3 relative" id="header-right-auth-container">
          {error && (
            <div 
              id="google-auth-error-banner"
              className="absolute right-0 -bottom-8 bg-red-50 border border-red-100 text-red-600 text-[10px] rounded-full px-3 py-1 font-mono tracking-tight shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-top-1 z-50 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {/* Mobile Date/Time view */}
          <div className="sm:hidden flex flex-col">
            <span className="text-xs font-mono text-neutral-500">{formattedTime}</span>
            <span className="text-[10px] text-neutral-400">{formattedDate}</span>
          </div>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-full py-1 pl-2 pr-3 transition duration-150 text-left focus:outline-none"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User Avatar"}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover border border-neutral-200"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-950 text-white text-xs flex items-center justify-center font-bold uppercase">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-neutral-800 truncate max-w-[120px]">
                    {user.displayName || "User"}
                  </p>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-neutral-800 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center justify-center gap-2 bg-white text-neutral-700 hover:text-neutral-900 border border-gray-200 hover:border-gray-300 rounded-full px-4 py-2 text-xs font-semibold hover:bg-gray-50 transition"
              id="google-signin-btn"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.7 0 3.23.59 4.43 1.73l3.32-3.32C17.75 1.58 15.03 1 12 1 7.24 1 3.19 3.73 1.25 7.73l3.96 3.07C6.15 7.42 12 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.82-.07-1.6-.22-2.36H12v4.47h6.46c-.28 1.48-1.11 2.73-2.37 3.58l3.68 2.85c2.15-1.98 3.72-4.9 3.72-8.54z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.21 10.8a7.2 7.2 0 010 4.4l-3.96 3.07A11.96 11.96 0 011.25 7.73l3.96 3.07z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.96-1.08 7.95-2.91l-3.68-2.85c-1.02.68-2.33 1.09-4.27 1.09-5.85 0-11.75-2.38-12.79-5.76L1.25 15.64c1.94 4 5.99 7.36 10.75 7.36z"
                />
              </svg>
              <span>Connect with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
