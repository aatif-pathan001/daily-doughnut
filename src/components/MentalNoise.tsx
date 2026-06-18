import React, { useState, useEffect } from "react";
import { Trash2, Sparkles } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";

interface MentalNoiseProps {
  user: User | null;
}

export function MentalNoise({ user }: MentalNoiseProps) {
  const [noiseText, setNoiseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<"Saved" | "Saving..." | "">("");

  // 1. Initial Load
  useEffect(() => {
    const loadNoise = async () => {
      setLoading(true);
      // Try local storage first as the most instant offline state
      const local = localStorage.getItem("mental_noise_transient");
      if (local) {
        setNoiseText(local);
      }

      if (user) {
        try {
          const docRef = doc(db, "mentalNoise", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.text !== undefined) {
              setNoiseText(data.text);
              localStorage.setItem("mental_noise_transient", data.text);
            }
          }
        } catch (err) {
          console.error("Failed to fetch cloud mental noise memory", err);
        }
      }
      setLoading(false);
    };

    loadNoise();
  }, [user]);

  // 2. Autosave with debounce
  useEffect(() => {
    if (loading) return;

    setSavingStatus("Saving...");
    const delayDebounce = setTimeout(async () => {
      // Save locally first
      localStorage.setItem("mental_noise_transient", noiseText);

      if (user) {
        try {
          const docRef = doc(db, "mentalNoise", user.uid);
          await setDoc(docRef, {
            uid: user.uid,
            text: noiseText,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (err) {
          console.error("Autosave cloud mental noise error", err);
        }
      }
      setSavingStatus("Saved");
      const clearSavedStatus = setTimeout(() => setSavingStatus(""), 2000);
      return () => clearTimeout(clearSavedStatus);
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [noiseText, user, loading]);

  const handleClear = async () => {
    setNoiseText("");
    localStorage.removeItem("mental_noise_transient");
    if (user) {
      try {
        const docRef = doc(db, "mentalNoise", user.uid);
        await setDoc(docRef, { text: "" }, { merge: true });
      } catch (err) {
        console.error("Failed to clear cloud mental noise", err);
      }
    }
  };

  return (
    <div id="mental-noise-card" className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-1.5 bg-neutral-900 rounded-full" />
          <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight">
            Mental Noise
          </h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 tracking-wide transition-all duration-150">
          {savingStatus}
        </span>
      </div>

      <p className="text-[11px] text-neutral-400 mb-4 leading-normal font-light">
        Park transient thoughts or stray ideas here to instantly restore single-task mind focus.
      </p>

      <div className="relative flex-1">
        <textarea
          id="mental-noise-textarea"
          value={noiseText}
          onChange={(e) => setNoiseText(e.target.value)}
          placeholder="Jot down distracting flashes (e.g. 'buy coffee beans', 'reply to check-in email', 'idea for side flow')..."
          className="w-full h-28 p-4 bg-gray-50/50 hover:bg-gray-50/80 focus:bg-white border border-gray-100 focus:border-neutral-900 rounded-2xl text-xs font-light text-neutral-700 placeholder-neutral-400 focus:outline-none transition duration-150 resize-none leading-relaxed"
        />
      </div>

      <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1 text-[10px] text-neutral-400 tracking-wider uppercase font-semibold">
          <Sparkles className="w-3 h-3 text-neutral-300" />
          <span>Transient Memory bank</span>
        </div>
        {noiseText && (
          <button
            onClick={handleClear}
            id="clear-mental-noise-btn"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 text-[10.5px] uppercase tracking-wider font-semibold text-neutral-400 hover:text-red-500 rounded-xl transition duration-150"
            title="Clear memory"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
