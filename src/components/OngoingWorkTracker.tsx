import React, { useState } from "react";
import { OngoingWork, Subtask } from "../types";
import {
  Sparkles,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  Heart,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Plus,
  ListTodo,
  CheckSquare,
  Square,
  CalendarPlus,
  Check,
  X
} from "lucide-react";

interface OngoingWorkTrackerProps {
  ongoingWorks: OngoingWork[];
  onAddOngoingWork: (
    title: string,
    reason: string,
    targetCompletionDate?: string,
    initialSubtasks?: Subtask[]
  ) => Promise<void>;
  onUpdateOngoingWorkStatus: (id: string, status: "active" | "completed" | "paused") => Promise<void>;
  onDeleteOngoingWork: (id: string) => Promise<void>;
  onUpdateOngoingWork: (id: string, updates: Partial<OngoingWork>) => Promise<void>;
  onAddTask: (title: string, date: string, type: "day" | "week", duration?: number) => Promise<void>;
}

export const OngoingWorkTracker: React.FC<OngoingWorkTrackerProps> = ({
  ongoingWorks,
  onAddOngoingWork,
  onUpdateOngoingWorkStatus,
  onDeleteOngoingWork,
  onUpdateOngoingWork,
  onAddTask,
}) => {
  // Main item creation states
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Creation-time Planning States
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState("");
  const [tempSubtasks, setTempSubtasks] = useState<{ title: string; assignedDate: string }[]>([]);
  const [tempSubtaskTitle, setTempSubtaskTitle] = useState("");
  const [tempSubtaskDate, setTempSubtaskDate] = useState("");

  // Editing existing plan States
  const [expandedWorkId, setExpandedWorkId] = useState<string | null>(null);
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState("");
  const [inlineSubtaskDate, setInlineSubtaskDate] = useState("");

  const activeWorks = ongoingWorks.filter((w) => w.status === "active");

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  const calculateProgress = (work: OngoingWork) => {
    const subs = work.subtasks || [];
    if (subs.length === 0) return null;
    const completed = subs.filter((s) => s.completed).length;
    return {
      completed,
      total: subs.length,
      pct: Math.round((completed / subs.length) * 100),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const initialSubtasksList: Subtask[] = tempSubtasks.map((st) => ({
        id: crypto.randomUUID(),
        title: st.title.trim(),
        completed: false,
        assignedDate: st.assignedDate || undefined,
        syncedTaskId: null,
      }));

      await onAddOngoingWork(
        title.trim(),
        reason.trim(),
        targetDateInput || undefined,
        initialSubtasksList
      );

      // Clean inputs
      setTitle("");
      setReason("");
      setTargetDateInput("");
      setTempSubtasks([]);
      setShowPlanForm(false);
    } catch (err) {
      console.error("Failed to add intention", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subtask Interaction Helpers
  const handleToggleSubtask = async (work: OngoingWork, subtaskId: string) => {
    const updatedSubtasks = (work.subtasks || []).map((sub) => {
      if (sub.id === subtaskId) {
        return { ...sub, completed: !sub.completed };
      }
      return sub;
    });
    await onUpdateOngoingWork(work.id, { subtasks: updatedSubtasks });
  };

  const handleUpdateSubtaskDate = async (work: OngoingWork, subtaskId: string, newDate: string) => {
    const updatedSubtasks = (work.subtasks || []).map((sub) => {
      if (sub.id === subtaskId) {
        return { ...sub, assignedDate: newDate };
      }
      return sub;
    });
    await onUpdateOngoingWork(work.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = async (work: OngoingWork, subtaskId: string) => {
    const updatedSubtasks = (work.subtasks || []).filter((sub) => sub.id !== subtaskId);
    await onUpdateOngoingWork(work.id, { subtasks: updatedSubtasks });
  };

  const handleAddInlineSubtask = async (work: OngoingWork) => {
    if (!inlineSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: inlineSubtaskTitle.trim(),
      completed: false,
      assignedDate: inlineSubtaskDate || undefined,
      syncedTaskId: null,
    };
    const updatedSubtasks = [...(work.subtasks || []), newSub];
    await onUpdateOngoingWork(work.id, { subtasks: updatedSubtasks });
    setInlineSubtaskTitle("");
    setInlineSubtaskDate("");
  };

  const handleSyncToPlanner = async (work: OngoingWork, subtask: Subtask) => {
    const dateValue = subtask.assignedDate;
    if (!dateValue) return;

    try {
      const tempId = crypto.randomUUID();
      await onAddTask(
        `Focus Subtask: ${subtask.title}`,
        dateValue,
        "day",
        30
      );

      const updatedSubtasks = (work.subtasks || []).map((sub) => {
        if (sub.id === subtask.id) {
          return { ...sub, syncedTaskId: tempId };
        }
        return sub;
      });
      await onUpdateOngoingWork(work.id, { subtasks: updatedSubtasks });
    } catch (err) {
      console.error("Failed to sync subtask to daily planner", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Mindful Flow Hero Block - Stack up to 3 Active Focus Containers */}
      {activeWorks.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
              Active Focus Containers ({activeWorks.length}/3)
            </span>
          </div>
          {activeWorks.map((work) => {
            const progress = calculateProgress(work);
            const isExpanded = expandedWorkId === work.id;

            return (
              <div
                key={work.id}
                className="bg-[#151515] text-white rounded-3xl p-6 shadow-sm flex flex-col relative overflow-hidden transition duration-150 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[#4ADE80]">
                    <div className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Active Flow</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUpdateOngoingWorkStatus(work.id, "paused")}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition"
                      title="Pause active work"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onUpdateOngoingWorkStatus(work.id, "completed")}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 hover:text-emerald-300 transition"
                      title="Complete active work"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-light text-white mb-2 tracking-tight">
                  {work.title}
                </h3>

                {work.targetCompletionDate && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Target Date: <strong className="text-white">{formatDateShort(work.targetCompletionDate)}</strong></span>
                  </div>
                )}

                {progress && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono uppercase mb-1">
                      <span>Planning Progress</span>
                      <span>{progress.completed}/{progress.total} Tasks ({progress.pct}%)</span>
                    </div>
                    <div className="w-full bg-[#2b2b2b] rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-[#4ADE80] h-full transition-all duration-350"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 font-mono">The Purpose</h4>
                  <div className="bg-[#222] rounded-xl p-3 border border-[#333]/40">
                    <p className="text-[11px] text-gray-300 leading-relaxed font-light italic">
                      &ldquo;{work.reason}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Subtask / Planning Accordion Trigger */}
                <div className="mt-4 pt-4 border-t border-[#333]/50">
                  <button
                    onClick={() => {
                      setExpandedWorkId(isExpanded ? null : work.id);
                    }}
                    className="flex items-center justify-between w-full text-xs text-neutral-300 hover:text-white transition"
                  >
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ListTodo className="w-4 h-4 text-[#4ADE80]" />
                      Plan &amp; Subtasks Progress
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Overall target completion date change */}
                      <div className="flex items-center justify-between gap-3 bg-[#222]/50 border border-[#333]/30 rounded-xl p-3">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Edit Target Date
                        </span>
                        <input
                          type="date"
                          value={work.targetCompletionDate || ""}
                          onChange={(e) => onUpdateOngoingWork(work.id, { targetCompletionDate: e.target.value })}
                          className="bg-neutral-950 border border-neutral-700 text-xs px-2.5 py-1 rounded-lg text-white focus:outline-none focus:border-[#4ADE80] h-8 w-34"
                        />
                      </div>

                      {/* Display subtasks list */}
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {(work.subtasks || []).length === 0 ? (
                          <p className="text-[10px] text-neutral-500 italic text-center py-2">
                            No planned subtasks yet. Let's add one below.
                          </p>
                        ) : (
                          (work.subtasks || []).map((sub) => (
                            <div key={sub.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-900 border border-[#2d2d2d] transition hover:border-neutral-700">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => handleToggleSubtask(work, sub.id)}
                                  className="flex items-start gap-2 text-left group"
                                >
                                  {sub.completed ? (
                                    <CheckSquare className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-500 hover:text-white transition shrink-0 mt-0.5" />
                                  )}
                                  <span className={`text-[11px] font-sans transition ${sub.completed ? "line-through text-neutral-500" : "text-gray-200"}`}>
                                    {sub.title}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSubtask(work, sub.id)}
                                  className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded transition shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Assign date & Planner schedule */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2d2d2d]/50 text-[9px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-neutral-500 font-mono uppercase">Day:</span>
                                  <input
                                    type="date"
                                    value={sub.assignedDate || ""}
                                    onChange={(e) => handleUpdateSubtaskDate(work, sub.id, e.target.value)}
                                    className="bg-neutral-950 border border-neutral-700 text-[10px] px-1.5 py-0.5 rounded text-gray-300 focus:outline-none focus:border-[#4ADE80]"
                                  />
                                </div>

                                {sub.assignedDate ? (
                                  sub.syncedTaskId ? (
                                    <span className="text-neutral-400 font-mono tracking-tight flex items-center gap-0.5">
                                      <Check className="w-3 h-3 text-[#4ADE80]" /> Synced
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleSyncToPlanner(work, sub)}
                                      className="text-[#4ADE80] border border-[#4ADE80]/30 hover:bg-[#4ADE80]/10 px-2 py-0.5 rounded-md font-bold tracking-tight transition flex items-center gap-0.5"
                                    >
                                      <CalendarPlus className="w-3 h-3" /> Sync to Planner
                                    </button>
                                  )
                                ) : (
                                  <span className="text-neutral-500 italic">No date</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Inline Subtask addition */}
                      <div className="bg-[#222]/30 border border-[#333]/30 rounded-xl p-3 space-y-2.5">
                        <div>
                          <input
                            type="text"
                            placeholder="Divide focus activity..."
                            value={inlineSubtaskTitle}
                            onChange={(e) => setInlineSubtaskTitle(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-700 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none focus:border-[#4ADE80]"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-neutral-400">Date:</span>
                            <input
                              type="date"
                              value={inlineSubtaskDate}
                              onChange={(e) => setInlineSubtaskDate(e.target.value)}
                              className="bg-neutral-950 border border-neutral-700 text-[10px] px-2 py-1 rounded-lg text-white focus:outline-none h-6"
                            />
                          </div>
                          <button
                            onClick={() => handleAddInlineSubtask(work)}
                            disabled={!inlineSubtaskTitle.trim()}
                            className="px-3 py-1 bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-[10px] tracking-tight rounded-lg transition disabled:opacity-40"
                          >
                            Add Block
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Calming interactive breath element */}
                <div className="mt-4 flex items-center gap-2.5 bg-[#222]/30 p-3 rounded-xl border border-[#333]/30">
                  <div className="relative flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-[#4ADE80]/30 absolute animate-ping" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#4ADE80] flex items-center justify-center">
                      <Heart className="w-2.5 h-2.5 text-[#151515] fill-[#151515]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-snug font-light">
                    Take 3 deep breaths to ground your focus on this task.
                  </p>
                </div>
              </div>
            );
          })}
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
              <span className="text-[9px] text-neutral-500 italic font-mono">deep honesty</span>
            </div>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Giving this my full attention now will free up my headspace to connect with my family."
              className="w-full text-xs px-3.5 py-2.5 bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition duration-150 resize-none font-sans"
            />
          </div>

          {/* Optional Add Plan & Subtasks Accordion Section */}
          <div className="border border-neutral-100 rounded-2xl p-4 bg-neutral-50/50">
            <button
              type="button"
              onClick={() => setShowPlanForm(!showPlanForm)}
              className="flex items-center justify-between w-full text-xs font-semibold text-neutral-700 tracking-tight"
            >
              <span className="flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-neutral-500" />
                Plan Out Completion (Optional)
              </span>
              {showPlanForm ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {showPlanForm && (
              <div className="mt-3.5 space-y-4 pt-3.5 border-t border-neutral-100">
                {/* 1. Target completion date */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={targetDateInput}
                    onChange={(e) => setTargetDateInput(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl focus:outline-none transition duration-150 text-neutral-700"
                  />
                </div>

                {/* 2. Interactive subtasks initial adding */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                    Divide into Subtasks
                  </label>

                  {tempSubtasks.length > 0 && (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto bg-white border border-neutral-150 p-2.5 rounded-xl">
                      {tempSubtasks.map((sub, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-neutral-50 rounded-lg">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-neutral-700">{sub.title}</span>
                            {sub.assignedDate && (
                              <span className="text-[9px] text-neutral-500 font-mono">Assigned: {formatDateShort(sub.assignedDate)}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setTempSubtasks(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-red-600 transition animate-out fade-out"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 bg-white border border-neutral-155 p-2 rounded-xl">
                    <input
                      type="text"
                      value={tempSubtaskTitle}
                      onChange={(e) => setTempSubtaskTitle(e.target.value)}
                      placeholder="Divide activity..."
                      className="w-full text-xs px-2.5 py-1.5 bg-neutral-50 focus:bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900"
                    />
                    <div className="flex items-center gap-2 justify-between shrink-0">
                      <input
                        type="date"
                        value={tempSubtaskDate}
                        onChange={(e) => setTempSubtaskDate(e.target.value)}
                        className="text-xs px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 h-8"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempSubtaskTitle.trim()) {
                            setTempSubtasks(prev => [...prev, { title: tempSubtaskTitle.trim(), assignedDate: tempSubtaskDate }]);
                            setTempSubtaskTitle("");
                            setTempSubtaskDate("");
                          }
                        }}
                        disabled={!tempSubtaskTitle.trim()}
                        className="p-1.5 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-lg transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !reason.trim()}
            className="w-full py-2.5 bg-neutral-955 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold tracking-tight transition duration-150 disabled:opacity-50 select-none flex items-center justify-center gap-1.5"
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
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {ongoingWorks.map((work) => {
              const progress = calculateProgress(work);
              const isExpanded = expandedWorkId === work.id;

              return (
                <div
                  key={work.id}
                  className={`p-4 rounded-2xl border transition duration-150 ${
                    work.status === "active"
                      ? "bg-neutral-50 border-neutral-300"
                      : "bg-white border-neutral-100"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-semibold tracking-tight ${
                          work.status === "completed" ? "line-through text-neutral-400" : "text-neutral-800"
                        }`}>
                          {work.title}
                        </h4>
                        {work.targetCompletionDate && (
                          <span className="text-[9px] font-mono text-neutral-400 flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 text-neutral-400" /> {formatDateShort(work.targetCompletionDate)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 italic max-w-[240px] leading-relaxed">
                        &ldquo;{work.reason}&rdquo;
                      </p>

                      {progress && (
                        <div className="w-full max-w-[200px] mt-2">
                          <div className="flex justify-between items-center text-[9px] text-neutral-400 font-mono mb-0.5">
                            <span>Subtasks</span>
                            <span>{progress.completed}/{progress.total}</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-neutral-800 h-full transition-all duration-300"
                              style={{ width: `${progress.pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {work.status === "paused" && (
                        <button
                          onClick={() => onUpdateOngoingWorkStatus(work.id, "active")}
                          className="p-1 hover:bg-neutral-50 rounded text-neutral-600 hover:text-neutral-950 transition"
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

                  {/* Subtask / Planning Accordion Trigger in Log list */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedWorkId(isExpanded ? null : work.id)}
                      className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-950 transition underline underline-offset-2 decoration-dashed"
                    >
                      <ListTodo className="w-3 h-3" />
                      {isExpanded ? "Close Planning Board" : "Plan & Subtasks"}
                    </button>
                    <span className={`px-1.5 py-0.5 rounded-full uppercase text-[8px] font-bold font-mono ${
                      work.status === "active"
                        ? "bg-neutral-950 text-white"
                        : work.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {work.status}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 space-y-3.5 animate-in fade-in slide-in-from-top-1">
                      {/* Overall target completion date change */}
                      <div className="flex items-center justify-between gap-3 bg-neutral-50 border border-neutral-200/80 rounded-xl p-3">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Edit Target Date
                        </span>
                        <input
                          type="date"
                          value={work.targetCompletionDate || ""}
                          onChange={(e) => onUpdateOngoingWork(work.id, { targetCompletionDate: e.target.value })}
                          className="bg-white border border-neutral-200 text-xs px-2 py-1 rounded-lg text-neutral-800 focus:outline-none focus:border-neutral-900 h-7 w-32"
                        />
                      </div>

                      {/* Display subtasks list */}
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                        {(work.subtasks || []).length === 0 ? (
                          <p className="text-[10px] text-neutral-400 italic text-center py-1">
                            No planned subtasks yet. Let's add one below.
                          </p>
                        ) : (
                          (work.subtasks || []).map((sub) => (
                            <div key={sub.id} className="flex flex-col gap-1.5 p-3 rounded-lg bg-neutral-50 border border-neutral-200/80">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => handleToggleSubtask(work, sub.id)}
                                  className="flex items-start gap-2 text-left group"
                                >
                                  {sub.completed ? (
                                    <CheckSquare className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-400 hover:text-neutral-950 transition shrink-0 mt-0.5" />
                                  )}
                                  <span className={`text-[11px] font-sans transition ${sub.completed ? "line-through text-neutral-400" : "text-neutral-700"}`}>
                                    {sub.title}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSubtask(work, sub.id)}
                                  className="p-1 hover:bg-neutral-200 text-neutral-400 hover:text-red-600 rounded transition shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Assign date & Planner schedule */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-200/50 text-[9px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-neutral-400 font-mono uppercase">Day:</span>
                                  <input
                                    type="date"
                                    value={sub.assignedDate || ""}
                                    onChange={(e) => handleUpdateSubtaskDate(work, sub.id, e.target.value)}
                                    className="bg-white border border-neutral-200 text-[10px] px-1.5 py-0.5 rounded text-neutral-700 focus:outline-none focus:border-neutral-900"
                                  />
                                </div>

                                {sub.assignedDate ? (
                                  sub.syncedTaskId ? (
                                    <span className="text-emerald-600 font-medium tracking-tight flex items-center gap-0.5">
                                      <Check className="w-3 h-3 text-emerald-600" /> Synced
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleSyncToPlanner(work, sub)}
                                      className="text-neutral-800 border border-neutral-300 hover:bg-neutral-100 px-2 py-0.5 rounded-md font-bold tracking-tight transition flex items-center gap-0.5"
                                    >
                                      <CalendarPlus className="w-3 h-3" /> Sync to Planner
                                    </button>
                                  )
                                ) : (
                                  <span className="text-neutral-400 italic">No date</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Inline Subtask addition */}
                      <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 space-y-2">
                        <div>
                          <input
                            type="text"
                            placeholder="Divide focus activity..."
                            value={inlineSubtaskTitle}
                            onChange={(e) => setInlineSubtaskTitle(e.target.value)}
                            className="w-full bg-white border border-neutral-200 text-xs px-2.5 py-1.5 rounded-lg text-neutral-800 focus:outline-none focus:border-neutral-900"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-neutral-400">Date:</span>
                            <input
                              type="date"
                              value={inlineSubtaskDate}
                              onChange={(e) => setInlineSubtaskDate(e.target.value)}
                              className="bg-white border border-neutral-200 text-[10px] px-2 py-1 rounded-lg text-neutral-800 focus:outline-none h-6"
                            />
                          </div>
                          <button
                            onClick={() => handleAddInlineSubtask(work)}
                            disabled={!inlineSubtaskTitle.trim()}
                            className="px-3 py-1 bg-neutral-950 hover:bg-neutral-800 text-white font-semibold text-[10px] tracking-tight rounded-lg transition disabled:opacity-40"
                          >
                            Add Block
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-[9px] font-mono text-neutral-400 flex items-center justify-between">
                    <span>
                      Started {new Date(work.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
