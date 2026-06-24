import React, { useState, useRef } from "react";
import { User } from "firebase/auth";
import { TaskItem, OngoingWork, DailyReflection } from "../types";
import { 
  Database, 
  Download, 
  Upload, 
  FileCode, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Info
} from "lucide-react";

interface DataHubProps {
  user: User | null;
  tasks: TaskItem[];
  ongoingWorks: OngoingWork[];
  onImportData: (tasks: any[], ongoingWorks: any[], reflections: any[]) => Promise<void>;
}

export function DataHub({ user, tasks, ongoingWorks, onImportData }: DataHubProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    try {
      const localRefsStr = localStorage.getItem("daily_checkouts");
      const reflections = localRefsStr ? JSON.parse(localRefsStr) : [];
      
      const backupData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        tasks,
        ongoingWorks,
        reflections,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `intentional_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showStatus("success", "JSON Backup successfully generated and downloaded!");
    } catch (err) {
      console.error("Export output failed:", err);
      showStatus("error", "Failed to generate JSON backup.");
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ["Title", "Type", "Date", "Completed", "DurationMinutes", "DeferralCount", "CreatedAt"];
      const rows = tasks.map((t) => [
        `"${(t.title || "").replace(/"/g, '""')}"`,
        t.type,
        t.date,
        t.completed ? "true" : "false",
        t.duration || 30,
        t.deferralCount || 0,
        t.createdAt || "",
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `intentional_tasks_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus("success", "Tasks exported into CSV format successfully!");
    } catch (err) {
      console.error("Export CSV failed:", err);
      showStatus("error", "Failed to export tasks into CSV.");
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const isJson = file.name.endsWith(".json");
      const isCsv = file.name.endsWith(".csv");

      if (!isJson && !isCsv) {
        showStatus("error", "Invalid file format. Please upload a .json backup or a .csv list of tasks.");
        setIsProcessing(false);
        return;
      }

      const text = await file.text();

      if (isJson) {
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          showStatus("error", "Malformed JSON file. Could not parse content.");
          setIsProcessing(false);
          return;
        }

        const tasksToImport = Array.isArray(data.tasks) ? data.tasks : [];
        const worksToImport = Array.isArray(data.ongoingWorks) ? data.ongoingWorks : [];
        const reflectionsToImport = Array.isArray(data.reflections) ? data.reflections : [];

        if (tasksToImport.length === 0 && worksToImport.length === 0 && reflectionsToImport.length === 0) {
          showStatus("error", "No valid dashboard data found inside the backup JSON.");
          setIsProcessing(false);
          return;
        }

        await onImportData(tasksToImport, worksToImport, reflectionsToImport);
        showStatus(
          "success",
          `Successfully parsed and restored backup: ${tasksToImport.length} tasks, ${worksToImport.length} tracks, and ${reflectionsToImport.length} reflection records.`
        );
      } else if (isCsv) {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          showStatus("error", "No rows found inside the CSV file.");
          setIsProcessing(false);
          return;
        }

        // Map CSV rows to task shapes
        const mappedTasks = rows.map((r: any) => ({
          title: r.title || r.task || r.activity || r.name || "",
          type: r.type === "week" ? "week" : "day",
          date: r.date || "",
          completed: r.completed === "true" || r.completed === "1",
          duration: Number(r.durationminutes) || Number(r.duration) || 30,
          deferralCount: Number(r.deferralcount) || 0,
        })).filter(t => t.title.length > 0);

        if (mappedTasks.length === 0) {
          showStatus("error", "Could not identify any valid tasks inside the CSV header keys.");
          setIsProcessing(false);
          return;
        }

        await onImportData(mappedTasks, [], []);
        showStatus("success", `Successfully imported ${mappedTasks.length} tasks directly from CSV!`);
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An internal error occurred during import processing.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];

    // Normalizing headers
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
    
    const results: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const rowRaw = lines[i];
      const cells: string[] = [];
      let insideQuote = false;
      let currentCell = "";
      
      for (let j = 0; j < rowRaw.length; j++) {
        const char = rowRaw[j];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          cells.push(currentCell.trim());
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());

      const rowObj: any = {};
      headers.forEach((header, index) => {
        let val = cells[index] || "";
        val = val.replace(/^["']|["']$/g, "");
        rowObj[header] = val;
      });

      results.push(rowObj);
    }
    return results;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col space-y-4">
      <div>
        <h3 className="font-display font-semibold text-sm text-neutral-800 tracking-tight flex items-center gap-2">
          <Database className="w-4 h-4 text-neutral-500" />
          Data Portability & Backup
        </h3>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          Safeguard your daily plans and active intentions. Export backups or restore any saved data file instantly.
        </p>
      </div>

      {/* Primary Export Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportJSON}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-100 hover:border-neutral-200 bg-neutral-50 hover:bg-neutral-100/70 text-neutral-700 hover:text-black font-semibold text-[11px] rounded-xl transition duration-150"
          title="Backup all planner data, projects, and reflections"
        >
          <FileCode className="w-3.5 h-3.5 text-neutral-400" />
          Export JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-neutral-100 hover:border-neutral-200 bg-neutral-50 hover:bg-neutral-100/70 text-neutral-700 hover:text-black font-semibold text-[11px] rounded-xl transition duration-150"
          title="Export daily tasks into plain CSV format"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
          Export CSV ({tasks.length})
        </button>
      </div>

      {/* Styled Interactive Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-200 hover:border-neutral-400 bg-gray-50/30 hover:bg-gray-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center space-y-1.5 py-2">
            <RefreshCw className="w-5 h-5 text-neutral-400 animate-spin" />
            <span className="text-[10px] font-mono font-medium text-neutral-500">Restoring data...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1 py-1">
            <Upload className={`w-5 h-5 transition-colors duration-150 ${dragActive ? "text-neutral-900" : "text-neutral-400"}`} />
            <p className="text-[11px] font-semibold text-neutral-700">
              Drag & drop backup format file
            </p>
            <p className="text-[10px] text-neutral-400">
              or <span className="text-neutral-900 underline font-medium">choose file</span> (.csv or .json)
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Status / Error Messages */}
      {message && (
        <div
          className={`flex items-start gap-2 p-2.5 rounded-xl border text-[10.5px] leading-relaxed transition duration-200 ${
            message.type === "success"
              ? "bg-emerald-50/60 border-emerald-100 text-emerald-800"
              : "bg-red-50/60 border-red-100 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Helpful Hint banner */}
      <div className="bg-neutral-50/50 border border-neutral-100 p-3 rounded-xl flex gap-2">
        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
        <p className="text-[10px] leading-relaxed text-neutral-500">
          <strong>Tip:</strong> JSON files restore all tasks, subtasks, projects and reflections seamlessly. CSV profiles append directly into your tasks list.
        </p>
      </div>
    </div>
  );
}
