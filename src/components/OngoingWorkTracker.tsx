import React, { useState } from "react";
import { OngoingWork } from "../types";
import { Sparkles, Play, Pause, CheckCircle, Trash2, Heart, RefreshCw } from "lucide-react";

interface OngoingWorkTrackerProps {
  ongoingWorks: OngoingWork[];
  onAddOngoingWork: (title: string, reason: string) => Promise<void>;
  onUpdateOngoingWorkStatus: (id: string, status: "active" | "completed" | "paused") => Promise<void>;
  onDeleteOngoingWork: (id: string) => Promise<void>;
}

export const OngoingWorkTracker: React.FC<OngoingWorkTrackerProps> = ({
  ongoingWorks,
  onAddOngoingWork,
  onUpdateOngoingWorkStatus,
  onDeleteOngoingWork,
}) => {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeWork = ongoingWorks.find((w) => w.status === "active");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddOngoingWork(title.trim(), reason.trim());
      setTitle("");
      setReason("");
    } catch (err) {
      console.error("Failed to add intention", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Mindful Flow Hero Block */}
      {activeWork ? (
        <div className="bg-[#151515] text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col relative overflow-hidden transition duration-150">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-[#4ADE80]">
              <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Active Focus Flow</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateOngoingWorkStatus(activeWork.id, "paused")}
                className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition"
                title="Pause active work"
              >
                <Pause className="w-4 h-4" />
              </button>
              <button
                onClick={() => onUpdateOngoingWorkStatus(activeWork.id, "completed")}
                className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 hover:text-emerald-300 transition"
                title="Complete active work"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-2xl font-light text-white mb-2 tracking-tight">
            {activeWork.title}
          </h3>
          <p className="text-gray-500 text-xs italic mb-6">Active session started</p>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">The Purpose (Reasoning)</h4>
            <div className="bg-[#222] rounded-2xl p-4 border border-[#333]">
              <p className="text-xs text-gray-300 leading-relaxed font-light italic">
                &ldquo;{activeWork.reason}&rdquo;
              </p>
            </div>
          </div>

          {/* Calming interactive breath element */}
          <div className="mt-6 flex items-center gap-3 bg-[#222]/50 p-3.5 rounded-2xl border border-[#333]/40">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-full bg-[#4ADE80]/20 absolute animate-ping" />
              <div className="w-4 h-4 rounded-full bg-[#4ADE80] flex items-center justify-center">
                <Heart className="w-2 h-2 text-[#151515] fill-[#151515]" />
              </div>
            </div>
            <p className="text-[10.5px] text-gray-400 leading-snug">
              Take 3 conscious deep breaths to establish intentionality before continuing.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm">
          <Sparkles className="w-6 h-6 text-neutral-300 mx-auto mb-3 stroke-[1.5]" />
          <h4 className="text-sm font-semibold text-neutral-800">
            No Active Intention Flow
          </h4>
          <p className="text-xs text-neutral-400 max-w-[240px] mx-auto mt-1.5 leading-relaxed">
            Declare a mindful task below to start a protective, single-focus container.
          </p>
        </div>
      )}

      {/* 2. Declare New Intention Form */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm">
        <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight mb-4 flex items-center gap-2">
          Declare a Mindful Intention
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5">
              Specific Activity / Task
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Drafting the project proposal"
              className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition duration-150"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Cognitive Reasoning / Why?
              </label>
              <span className="text-[9px] text-neutral-500 italic">keep it deeply honest</span>
            </div>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Giving this my full attention now will free up my headspace to connect with my family error-free this evening."
              className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition duration-150 resize-none font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !reason.trim()}
            className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold tracking-tight transition duration-150 disabled:opacity-50 select-none flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Enter Focus Flow"
            )}
          </button>
        </form>
      </div>

      {/* 3. Intention Archive & Other Flows */}
      {ongoingWorks.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm">
          <h3 className="font-display font-semibold text-xs text-neutral-400 tracking-wider uppercase mb-3">
            Intention Log ({ongoingWorks.length})
          </h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {ongoingWorks.map((work) => (
              <div
                key={work.id}
                className={`p-3.5 rounded-2xl border transition duration-150 ${
                  work.status === "active"
                    ? "bg-neutral-50 border-neutral-300"
                    : "bg-white border-neutral-100"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <h4 className={`text-xs font-semibold tracking-tight ${
                      work.status === "completed" ? "line-through text-neutral-400" : "text-neutral-800"
                    }`}>
                      {work.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 italic max-w-[240px] leading-relaxed">
                      &ldquo;{work.reason}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {work.status === "paused" && (
                      <button
                        onClick={() => onUpdateOngoingWorkStatus(work.id, "active")}
                        className="p-1 hover:bg-neutral-50 rounded text-neutral-600 hover:text-neutral-900 transition"
                        title="Resume work"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}
                    {work.status === "active" && (
                      <button
                        onClick={() => onUpdateOngoingWorkStatus(work.id, "paused")}
                        className="p-1 hover:bg-neutral-50 rounded text-neutral-600 hover:text-neutral-950 transition"
                        title="Pause work"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    )}
                    {work.status !== "completed" && (
                      <button
                        onClick={() => onUpdateOngoingWorkStatus(work.id, "completed")}
                        className="p-1 hover:bg-neutral-50 rounded text-emerald-600 hover:text-emerald-700 transition"
                        title="Mark complete"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteOngoingWork(work.id)}
                      className="p-1 hover:bg-red-50 rounded text-neutral-400 hover:text-red-600 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-neutral-400">
                  <span>
                    Started {new Date(work.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full uppercase text-[8px] font-bold ${
                    work.status === "active"
                      ? "bg-neutral-950 text-white"
                      : work.status === "completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-600"
                  }`}>
                    {work.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
