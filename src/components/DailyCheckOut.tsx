import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, doc, query, where, getDocs, addDoc, doc as firestoreDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DailyReflection } from "../types";
import { Moon, Send, CheckSquare, Trash2, Calendar, Sparkles } from "lucide-react";

interface DailyCheckOutProps {
  user: User | null;
  selectedDate: string; // "YYYY-MM-DD"
}

export function DailyCheckOut({ user, selectedDate }: DailyCheckOutProps) {
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [inputText, setInputText] = useState("");
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load ref history and check state for selectedDate
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Try local storage load first
      const localRefs = localStorage.getItem("daily_checkouts");
      let activeRefs: DailyReflection[] = localRefs ? JSON.parse(localRefs) : [];
      setReflections(activeRefs);

      // Check if already checked out today locally
      const localCheckState = localStorage.getItem(`checked_out_${selectedDate}`);
      setIsCheckedOut(localCheckState === "true");

      if (user) {
        try {
          const q = query(collection(db, "reflections"), where("uid", "==", user.uid));
          const querySnap = await getDocs(q);
          const loaded: DailyReflection[] = [];
          querySnap.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              uid: data.uid,
              date: data.date,
              text: data.text,
              createdAt: data.createdAt,
            });
          });
          
          // Sort descending by date
          loaded.sort((a, b) => b.date.localeCompare(a.date));
          setReflections(loaded);
          
          // Sync with local storage
          localStorage.setItem("daily_checkouts", JSON.stringify(loaded));

          // Check if this date has a reflection
          const hasTodayReflection = loaded.some((r) => r.date === selectedDate);
          setIsCheckedOut(hasTodayReflection);
        } catch (err) {
          console.error("Failed to query database reflections", err);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSubmitting(true);
    const newRefData = {
      uid: user ? user.uid : "local",
      date: selectedDate,
      text: inputText.trim(),
      createdAt: new Date().toISOString(),
    };

    if (user) {
      try {
        const docRef = await addDoc(collection(db, "reflections"), newRefData);
        const refItem: DailyReflection = {
          id: docRef.id,
          ...newRefData,
        };
        setReflections((prev) => {
          const filtered = prev.filter((r) => r.date !== selectedDate);
          const updated = [refItem, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
          localStorage.setItem("daily_checkouts", JSON.stringify(updated));
          return updated;
        });
        setIsCheckedOut(true);
        localStorage.setItem(`checked_out_${selectedDate}`, "true");
        setInputText("");
      } catch (err) {
        console.error("Failed to save cloud reflection", err);
      }
    } else {
      const refItem: DailyReflection = {
        id: crypto.randomUUID(),
        ...newRefData,
      };
      setReflections((prev) => {
        const filtered = prev.filter((r) => r.date !== selectedDate);
        const updated = [refItem, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
        localStorage.setItem("daily_checkouts", JSON.stringify(updated));
        return updated;
      });
      setIsCheckedOut(true);
      localStorage.setItem(`checked_out_${selectedDate}`, "true");
      setInputText("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, date: string) => {
    if (user) {
      try {
        await deleteDoc(firestoreDoc(db, "reflections", id));
      } catch (err) {
        console.error("Failed to delete reflection", err);
      }
    }

    setReflections((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      localStorage.setItem("daily_checkouts", JSON.stringify(updated));
      return updated;
    });

    if (date === selectedDate) {
      setIsCheckedOut(false);
      localStorage.removeItem(`checked_out_${selectedDate}`);
    }
  };

  const todayReflection = reflections.find((r) => r.date === selectedDate);

  // Helper to format date string to human-friendly format
  const formatHumanDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="check-out-panel" className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-1.5 bg-[#1A1A1A] rounded-full" />
          <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight">
            Daily Check-Out
          </h3>
        </div>
        <span className="text-[10px] bg-neutral-900 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest leading-none scale-90">
          Unlocks Evening
        </span>
      </div>

      <p className="text-[11px] text-neutral-400 mb-4 leading-normal font-light">
        A quiet, 1-sentence space unlocked at the end of the day. Consolidate your accomplishments and gracefully sign off the current session.
      </p>

      {!isCheckedOut ? (
        <form onSubmit={handleSubmit} id="checkout-reflection-form" className="space-y-3">
          <div className="relative">
            <input
              type="text"
              id="checkout-reflection-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="How was my focus today, and what am I setting down?"
              maxLength={200}
              required
              className="w-full text-xs font-light text-neutral-700 bg-gray-50/50 hover:bg-gray-50 focus:bg-white border border-gray-100 focus:border-neutral-900 rounded-2xl px-4 py-3 placeholder-neutral-400 focus:outline-none transition-colors duration-150 leading-relaxed pr-8"
            />
            <span className="absolute right-3 top-3.5 text-[9px] text-neutral-300 font-mono">
              {inputText.length}/200
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting || !inputText.trim()}
            id="checkout-submit-btn"
            className="w-full py-2.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Moon className="w-3.5 h-3.5 text-neutral-300" />
            <span>{submitting ? "Signing Off..." : "Save Daily Check-Out"}</span>
          </button>
        </form>
      ) : (
        <div id="checkout-completed-summary" className="bg-[#4ADE80]/5 rounded-2xl p-4 border border-[#4ADE80]/20 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-[#22c55e]">
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">Checked out for today</span>
          </div>
          {todayReflection && (
            <p className="text-xs text-neutral-700 italic leading-relaxed font-light pl-1">
              &ldquo;{todayReflection.text}&rdquo;
            </p>
          )}
          <div className="text-[10px] text-neutral-400 pl-1 flex items-center justify-between">
            <span>Signed off securely. Have a peaceful evening!</span>
            {todayReflection && (
              <button
                onClick={() => handleDelete(todayReflection.id, todayReflection.date)}
                id="delete-today-reflection-btn"
                className="text-neutral-400 hover:text-red-500 font-medium tracking-wide flex items-center gap-1 transition"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Legacy/History stack log */}
      {reflections.length > 0 && (
        <div id="checkout-history-container" className="mt-5 pt-4 border-t border-gray-100">
          <h4 className="font-display font-semibold text-[10px] text-neutral-400 tracking-wider uppercase mb-3 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-neutral-300" />
            <span>Reflection Legacy ({reflections.length})</span>
          </h4>
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {reflections.map((ref) => (
              <div
                key={ref.id}
                className="group flex gap-2.5 items-start p-2.5 bg-[#FDFDFD] border border-gray-50 hover:bg-gray-50/40 rounded-xl transition duration-150"
              >
                <div className="w-1.5 h-1.5 bg-neutral-200 rounded-full mt-2 shrink-0 group-hover:bg-neutral-400 transition" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-neutral-400 font-mono">
                      {formatHumanDate(ref.date)}
                    </span>
                    <button
                      onClick={() => handleDelete(ref.id, ref.date)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-300 hover:text-red-500 transition duration-150"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-600 font-light leading-relaxed truncate group-hover:whitespace-normal">
                    {ref.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
