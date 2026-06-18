import React, { useState } from "react";
import { TaskItem } from "../types";
import {
  Calendar,
  Check,
  Plus,
  Trash2,
  Menu,
  Clock,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface PlannerProps {
  tasks: TaskItem[];
  selectedDate: string; // YYYY-MM-DD
  onSetSelectedDate: (date: string) => void;
  onAddTask: (title: string, date: string, type: "day" | "week", duration?: number) => Promise<void>;
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onReorderTasks: (reorderedTasks: TaskItem[]) => Promise<void>;
  onRescheduleTask: (id: string, newDate: string) => Promise<void>;
  onUpdateTaskDuration: (id: string, duration: number) => Promise<void>;
}

export const Planner: React.FC<PlannerProps> = ({
  tasks,
  selectedDate,
  onSetSelectedDate,
  onAddTask,
  onToggleComplete,
  onDeleteTask,
  onReorderTasks,
  onRescheduleTask,
  onUpdateTaskDuration,
}) => {
  const [newTitle, setNewTitle] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Generate the 7 days of the current week (Mon-Sun)
  const getWeekDays = () => {
    const current = new Date();
    // Get difference to Monday of current week
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(current.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dateVal = String(nextDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${dateVal}`;

      days.push({
        dateString,
        dayName: nextDate.toLocaleDateString("en-US", { weekday: "short" }),
        dateNum: nextDate.getDate(),
        monthName: nextDate.toLocaleDateString("en-US", { month: "short" }),
        isToday: new Date().toDateString() === nextDate.toDateString(),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Filter tasks for selected date
  const selectedDateTasks = tasks
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.order - b.order);

  // Filter tasks for type "week" (e.g. general weekly goals that are not assigned to a specific day)
  const weeklyGoals = tasks
    .filter((t) => t.type === "week")
    .sort((a, b) => a.order - b.order);

  const handleSubmit = async (e: React.FormEvent, type: "day" | "week" = "day") => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddTask(
        newTitle.trim(),
        type === "day" ? selectedDate : "weekly",
        type,
        duration
      );
      setNewTitle("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and drop task sorting
  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

  const handleDragOverTask = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedTaskId !== id) {
      setHoveredTaskId(id);
    }
  };

  const handleDropOnTask = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setHoveredTaskId(null);
    if (!draggedTaskId || draggedTaskId === targetId) return;

    // Find indices
    const dayTasks = selectedDateTasks;
    const dragIndex = dayTasks.findIndex((t) => t.id === draggedTaskId);
    const dropIndex = dayTasks.findIndex((t) => t.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const result = Array.from(dayTasks);
    const [removed] = result.splice(dragIndex, 1);
    result.splice(dropIndex, 0, removed);

    // Reassign serial order field
    const updated = (result as TaskItem[]).map((t: TaskItem, idx: number) => ({ ...t, order: idx }));
    await onReorderTasks(updated);
    setDraggedTaskId(null);
  };

  // Rescheduling tasks to other days of the week via drag-and-drop
  const handleDragOverDay = (e: React.DragEvent, dateString: string) => {
    e.preventDefault();
    setHoveredDay(dateString);
  };

  const handleDropOnDay = async (e: React.DragEvent, dateString: string) => {
    e.preventDefault();
    setHoveredDay(null);
    if (!draggedTaskId) return;

    // Reschedule the task to that date
    await onRescheduleTask(draggedTaskId, dateString);
    setDraggedTaskId(null);
  };

  // Manual priority buttons as accessible/mobile helper
  const shiftTaskPriority = async (index: number, direction: "up" | "down") => {
    const dayTasks = [...selectedDateTasks];
    if (direction === "up" && index > 0) {
      const temp = dayTasks[index];
      dayTasks[index] = dayTasks[index - 1];
      dayTasks[index - 1] = temp;
    } else if (direction === "down" && index < dayTasks.length - 1) {
      const temp = dayTasks[index];
      dayTasks[index] = dayTasks[index + 1];
      dayTasks[index + 1] = temp;
    } else {
      return;
    }

    const updated = (dayTasks as TaskItem[]).map((t: TaskItem, idx: number) => ({ ...t, order: idx }));
    await onReorderTasks(updated);
  };

  return (
    <div className="space-y-6">
      {/* 1. Date Ribbon (Current Week Horizontal Selector) */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 md:p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            Weekly Horizon Planner
          </h3>
          <span className="text-[10px] font-mono text-neutral-400 uppercase">
            tip: drag daily task to rescheduling date
          </span>
        </div>

        <div className={`grid grid-cols-7 gap-1.5 md:gap-3 transition-all duration-300 ${
          draggedTaskId ? "gap-2.5 md:gap-4.5 px-1.5 md:px-3 scale-[1.01]" : ""
        }`}>
          {weekDays.map((day) => {
            const isSelected = selectedDate === day.dateString;
            const dayTasks = tasks.filter((t) => t.date === day.dateString);
            const dayTasksCount = dayTasks.length;
            const completedCount = dayTasks.filter((t) => t.completed).length;

            const totalDurationMins = dayTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
            const totalDurationHrs = totalDurationMins / 60;
            const maxHrsPlannedGoal = 3;
            const plannedRatio = Math.min(totalDurationHrs / maxHrsPlannedGoal, 1);

            return (
              <div
                key={day.dateString}
                onClick={() => onSetSelectedDate(day.dateString)}
                onDragOver={(e) => handleDragOverDay(e, day.dateString)}
                onDragLeave={() => setHoveredDay(null)}
                onDrop={(e) => handleDropOnDay(e, day.dateString)}
                className={`cursor-pointer group flex flex-col items-center justify-between py-3 rounded-2xl border text-center transition-all duration-300 relative ${
                  draggedTaskId
                    ? hoveredDay === day.dateString
                      ? "bg-emerald-50 border-emerald-500 border-2 border-dashed scale-105 text-emerald-950 shadow-md"
                      : "bg-[#FDFDFD]/60 border-dashed border-2 border-neutral-300 text-neutral-400 scale-[0.98]"
                    : isSelected
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-md"
                    : hoveredDay === day.dateString
                    ? "bg-neutral-200 text-neutral-900 border-neutral-900 scale-105"
                    : day.isToday
                    ? "bg-white border-neutral-400 text-neutral-900 font-semibold"
                    : "bg-[#FDFDFD] hover:bg-neutral-50 text-neutral-700 border-gray-100"
                }`}
              >
                <span className={`text-[9px] font-semibold tracking-tight uppercase ${
                  isSelected ? "text-neutral-300" : "text-neutral-400 group-hover:text-neutral-600"
                }`}>
                  {day.dayName}
                </span>

                <div className="flex items-center gap-1.5 my-1" title={`${totalDurationHrs.toFixed(1)}/3 hrs planned`}>
                  <span className="text-sm font-semibold tracking-tight">
                    {day.dateNum}
                  </span>
                  {/* Miniature ring gauge showing planned hours ratio */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 transform -rotate-90" viewBox="0 0 20 20">
                      <circle
                        cx="10"
                        cy="10"
                        r="7.5"
                        className={isSelected ? "stroke-white/10" : "stroke-neutral-100"}
                        strokeWidth="2.5"
                        fill="transparent"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="7.5"
                        className={isSelected ? "stroke-emerald-400" : "stroke-emerald-500"}
                        strokeWidth="2.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 7.5}
                        strokeDashoffset={2 * Math.PI * 7.5 * (1 - plannedRatio)}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.3s ease" }}
                      />
                    </svg>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-0.5">
                  {/* Visual completion meter inside weekday item */}
                  {dayTasksCount > 0 ? (
                    <span className={`text-[9px] ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                      {completedCount}/{dayTasksCount}
                    </span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-neutral-300 my-0.5" />
                  )}
                  {/* Hour status subtitle */}
                  <span className={`text-[8.5px] font-mono leading-none ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                    {totalDurationHrs > 0 ? `${totalDurationHrs.toFixed(1)}h` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main planner body (Selected Date Focus List) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): Today's Tasks */}
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-50">
            <div>
              <h3 className="font-display font-semibold text-base text-neutral-800 tracking-tight">
                Focus Plan for {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </h3>
              <p className="text-[11px] text-neutral-400">
                Resort tasks below to mindfully structure your hours.
              </p>
            </div>
            <span className="text-xs bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full font-mono font-bold">
              {selectedDateTasks.filter(t => t.completed).length}/{selectedDateTasks.length} Completed
            </span>
          </div>

          {/* New Task Entry */}
          <form onSubmit={(e) => handleSubmit(e, "day")} className="space-y-3 mb-5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Declare an intentional task for this day..."
                className="flex-1 text-xs px-3.5 py-2.5 bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl focus:outline-none transition duration-150"
              />
              <div className="flex items-center gap-2">
                {/* Duration select */}
                <div className="flex items-center gap-1.5 px-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="text-xs bg-transparent py-2 px-1 focus:outline-none text-neutral-700 font-medium"
                  >
                    <option value={15}>15 m</option>
                    <option value={30}>30 m</option>
                    <option value={45}>45 m</option>
                    <option value={60}>1 hr</option>
                    <option value={120}>2 hr</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-150 shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            </div>
          </form>

          {/* Task prioritize list */}
          {selectedDateTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-neutral-50/50 rounded-2xl border border-neutral-100">
              <Sparkles className="w-7 h-7 text-neutral-300 mb-2 stroke-[1.5]" />
              <p className="text-xs font-medium text-neutral-500 max-w-[280px]">
                No target focus slots created for this date yet. Use input above to structure your day.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {selectedDateTasks.map((task, idx) => {
                const isHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragOver={(e) => handleDragOverTask(e, task.id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    onDragLeave={() => setHoveredTaskId(null)}
                    onDrop={(e) => handleDropOnTask(e, task.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition duration-150 hover:border-black group ${
                      task.completed
                        ? "bg-[#F8F9FA]/80 border-gray-100 text-neutral-400 opacity-60"
                        : "bg-[#FDFDFD] border-gray-100 text-neutral-800"
                    } ${isHovered ? "border-neutral-950 border-2" : ""}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Drag handle */}
                      <div className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing shrink-0 flex items-center pr-1">
                        <Menu className="w-4 h-4" />
                      </div>

                      {/* Custom Checkbox */}
                      <button
                        onClick={() => onToggleComplete(task.id, !task.completed)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition duration-150 ${
                          task.completed
                            ? "bg-neutral-950 border-neutral-950 text-white"
                            : "border-neutral-300 hover:border-neutral-400 bg-white"
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <span className={`text-xs font-semibold block truncate leading-tight ${
                          task.completed ? "line-through text-neutral-400" : "text-neutral-800"
                        }`}>
                          {task.title}
                        </span>
                        {task.duration !== undefined && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 hover:text-black border border-neutral-200/50 text-neutral-500 rounded-lg px-2 py-0.5 transition text-[10px] font-medium font-sans">
                              <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                              <select
                                value={task.duration}
                                onChange={(e) => onUpdateTaskDuration(task.id, Number(e.target.value))}
                                className="bg-transparent border-none p-0 text-[10px] font-semibold text-neutral-700 focus:outline-none cursor-pointer"
                              >
                                <option value={15}>15 m</option>
                                <option value={30}>30 m</option>
                                <option value={45}>45 m</option>
                                <option value={60}>1h</option>
                                <option value={90}>1.5h</option>
                                <option value={120}>2h</option>
                                <option value={180}>3h</option>
                                <option value={240}>4h</option>
                              </select>
                            </div>
                            {task.deferralCount && task.deferralCount >= 2 ? (
                              <div className="relative inline-block group/deferral">
                                <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-400 hover:bg-amber-500 cursor-pointer animate-pulse shrink-0" />
                                <div className="absolute left-0 top-full mt-2 hidden group-hover/deferral:block w-64 bg-zinc-950 text-white text-[10px] p-3 rounded-2xl shadow-xl leading-relaxed font-normal tracking-wide z-[99] text-left border border-zinc-800 animate-in fade-in slide-in-from-top-1">
                                  <p className="font-bold text-amber-300 mb-1 text-[9.5px] tracking-wider uppercase">Mindful Check</p>
                                  <p className="text-zinc-200 text-[10.5px] leading-relaxed">This task has been deferred twice. Do you want to split it into smaller, more approachable actions?</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {/* Desktop manual priority reordering helpers */}
                      <div className="hidden sm:flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => shiftTaskPriority(idx, "up")}
                          disabled={idx === 0}
                          className="p-0.5 hover:bg-neutral-50 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => shiftTaskPriority(idx, "down")}
                          disabled={idx === selectedDateTasks.length - 1}
                          className="p-0.5 hover:bg-neutral-50 rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-20"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 hover:bg-red-50 text-neutral-300 hover:text-red-500 rounded-lg transition"
                        title="Remove work"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Weekly goals */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col h-[480px]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight flex items-center gap-2">
              General Weekly Priorities
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Major milestones representing intent for the current calendar week.
            </p>
          </div>

          <form onSubmit={(e) => handleSubmit(e, "week")} className="flex gap-2 mb-3">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Code database rules..."
              className="flex-1 text-xs px-3 py-2 bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-950 rounded-xl focus:outline-none transition duration-150"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="p-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl transition duration-150 flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {weeklyGoals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-neutral-50/50 rounded-xl border border-neutral-100">
              <span className="text-neutral-300 text-xs font-mono">No general goals</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {weeklyGoals.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-2 hover:border-black ${
                    task.completed
                      ? "bg-[#F8F9FA]/80 border-gray-100 text-neutral-400 opacity-60"
                      : "bg-[#FDFDFD] border-gray-100 text-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleComplete(task.id, !task.completed)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition duration-150 ${
                        task.completed
                          ? "bg-neutral-950 border-neutral-950 text-white"
                          : "border-neutral-300 hover:border-neutral-400 bg-white"
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span className={`text-xs font-semibold truncate ${task.completed ? "line-through" : ""}`}>
                      {task.title}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1 hover:bg-red-50 text-neutral-300 hover:text-red-500 rounded transition shrink-0"
                    title="Remove goal"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
