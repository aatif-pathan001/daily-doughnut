import React, { useEffect, useState } from "react";
import { User } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  writeBatch,
  DocumentData,
  getFirestore,
} from "firebase/firestore";
import { initAuth, db, testFirestoreConnection, auth, googleSignIn } from "./firebase";
import { TaskItem, OngoingWork, Subtask } from "./types";
import { Header } from "./components/Header";
import { Planner } from "./components/Planner";
import { OngoingWorkTracker } from "./components/OngoingWorkTracker";
import { MentalNoise } from "./components/MentalNoise";
import { DailyCheckOut } from "./components/DailyCheckOut";
import { DataHub } from "./components/DataHub";
import { Sparkles, Calendar, Heart, Shield, Terminal, ArrowRight, RefreshCw } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [ongoingWorks, setOngoingWorks] = useState<OngoingWork[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to today YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dateVal = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${dateVal}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // Test Firestore Connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Sync auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
        // Clear collections, let local storage load instead
        loadLocalStorageData();
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Firestore data once user is logged in
  useEffect(() => {
    if (user) {
      fetchFirestoreData(user.uid);
    }
  }, [user]);

  const loadLocalStorageData = () => {
    try {
      const localTasks = localStorage.getItem("planner_tasks");
      const localWorks = localStorage.getItem("planner_works");
      if (localTasks) setTasks(JSON.parse(localTasks));
      if (localWorks) setOngoingWorks(JSON.parse(localWorks));
      setLoading(false);
    } catch (e) {
      console.error("Failed to load local storage fallback data", e);
      setLoading(false);
    }
  };

  const fetchFirestoreData = async (uid: string) => {
    setLoading(true);
    try {
      // 1. Fetch tasks
      const qTasks = query(collection(db, "tasks"), where("uid", "==", uid));
      const resTasks = await getDocs(qTasks);
      const loadedTasks: TaskItem[] = [];
      resTasks.forEach((docSnap) => {
        const data = docSnap.data();
        loadedTasks.push({
          id: docSnap.id,
          uid: data.uid,
          title: data.title,
          type: data.type || "day",
          date: data.date,
          completed: !!data.completed,
          order: data.order ?? 0,
          calendarEventId: data.calendarEventId || null,
          createdAt: data.createdAt || new Date().toISOString(),
          duration: data.duration ?? 30,
          deferralCount: data.deferralCount ?? 0,
        });
      });
      setTasks(loadedTasks);

      // 2. Fetch ongoing work
      const qWorks = query(collection(db, "ongoingWork"), where("uid", "==", uid));
      const resWorks = await getDocs(qWorks);
      const loadedWorks: OngoingWork[] = [];
      resWorks.forEach((docSnap) => {
        const data = docSnap.data();
        loadedWorks.push({
          id: docSnap.id,
          uid: data.uid,
          title: data.title,
          reason: data.reason || "",
          status: data.status || "active",
          createdAt: data.createdAt || new Date().toISOString(),
          completedAt: data.completedAt || null,
          targetCompletionDate: data.targetCompletionDate || "",
          subtasks: data.subtasks || [],
        });
      });
      setOngoingWorks(loadedWorks);
    } catch (err) {
      console.error("Firestore read error. Falling back to local storage.", err);
      loadLocalStorageData();
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLoginSuccess = async (currentUser: User) => {
    setUser(currentUser);
    // Move any existing local items to firestore (migration helper!)
    const migratedTasksCount = await migrateLocalDataToCloud(currentUser.uid);
    await fetchFirestoreData(currentUser.uid);
  };

  const handleLogoutSuccess = () => {
    setUser(null);
    setTasks([]);
    setOngoingWorks([]);
    // Restore default loading
    loadLocalStorageData();
  };

  const migrateLocalDataToCloud = async (uid: string) => {
    try {
      const localTasks = localStorage.getItem("planner_tasks");
      const localWorks = localStorage.getItem("planner_works");
      let count = 0;

      if (localTasks) {
        const parsed: TaskItem[] = JSON.parse(localTasks);
        for (const t of parsed) {
          await addDoc(collection(db, "tasks"), {
            uid,
            title: t.title,
            type: t.type,
            date: t.date,
            completed: t.completed,
            order: t.order,
            createdAt: t.createdAt,
            duration: t.duration || 30,
          });
          count++;
        }
        localStorage.removeItem("planner_tasks");
      }

      if (localWorks) {
        const parsed: OngoingWork[] = JSON.parse(localWorks);
        for (const w of parsed) {
          await addDoc(collection(db, "ongoingWork"), {
            uid,
            title: w.title,
            reason: w.reason,
            status: w.status,
            createdAt: w.createdAt,
            completedAt: w.completedAt || null,
          });
          count++;
        }
        localStorage.removeItem("planner_works");
      }
      return count;
    } catch (err) {
      console.error("Error migrating local data on sign in:", err);
      return 0;
    }
  };

  // Task Mutators
  const handleAddTask = async (
    title: string,
    dateValue: string,
    type: "day" | "week",
    durationVal = 30
  ) => {
    const defaultOrder = tasks.filter((t) => t.date === dateValue).length;

    const newTaskData = {
      uid: user ? user.uid : "local",
      title,
      type,
      date: dateValue,
      completed: false,
      order: defaultOrder,
      calendarEventId: null,
      createdAt: new Date().toISOString(),
      duration: durationVal,
    };

    if (user) {
      try {
        const docRef = await addDoc(collection(db, "tasks"), newTaskData);
        const taskObj: TaskItem = {
          id: docRef.id,
          ...newTaskData,
        };
        setTasks((prev) => [...prev, taskObj]);
      } catch (err) {
         console.error("Firestore add doc failed", err);
      }
    } else {
      // Local fallback
      const taskObj: TaskItem = {
        id: crypto.randomUUID(),
        ...newTaskData,
      };
      const updated = [...tasks, taskObj];
      setTasks(updated);
      localStorage.setItem("planner_tasks", JSON.stringify(updated));
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    if (user) {
      try {
        const taskRef = doc(db, "tasks", id);
        await updateDoc(taskRef, { completed });
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
      } catch (e) {
        console.error("Failed to update completed state", e);
      }
    } else {
      const updated = tasks.map((t) => (t.id === id ? { ...t, completed } : t));
      setTasks(updated);
      localStorage.setItem("planner_tasks", JSON.stringify(updated));
    }
  };

  const handleUpdateTaskDuration = async (id: string, duration: number) => {
    if (user) {
      try {
        const taskRef = doc(db, "tasks", id);
        await updateDoc(taskRef, { duration });
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, duration } : t)));
      } catch (e) {
        console.error("Failed to update task duration", e);
      }
    } else {
      const updated = tasks.map((t) => (t.id === id ? { ...t, duration } : t));
      setTasks(updated);
      localStorage.setItem("planner_tasks", JSON.stringify(updated));
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (user) {
      try {
        const taskRef = doc(db, "tasks", id);
        await deleteDoc(taskRef);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch (e) {
        console.error("Deletion failed in firestore", e);
      }
    } else {
      const updated = tasks.filter((t) => t.id !== id);
      setTasks(updated);
      localStorage.setItem("planner_tasks", JSON.stringify(updated));
    }
  };

  const handleReorderTasks = async (reorderedTasks: TaskItem[]) => {
    // Optimistic state update
    setTasks((prev) => {
      const filteredOut = prev.filter((t) => t.date !== selectedDate);
      return [...filteredOut, ...reorderedTasks];
    });

    if (user) {
      try {
        const batch = writeBatch(db);
        reorderedTasks.forEach((t) => {
          const taskRef = doc(db, "tasks", t.id);
          batch.update(taskRef, { order: t.order });
        });
        await batch.commit();
      } catch (e) {
        console.error("Reorder batch write error", e);
      }
    } else {
      // Local storage
      setTimeout(() => {
        setTasks((prev) => {
          localStorage.setItem("planner_tasks", JSON.stringify(prev));
          return prev;
        });
      }, 50);
    }
  };

  const handleRescheduleTask = async (id: string, newDateString: string) => {
    const originalTask = tasks.find((t) => t.id === id);
    if (!originalTask) return;

    // Check if the date actually changed
    const isChangingToWeekly = newDateString === "weekly";
    const isChangingFromWeekly = originalTask.type === "week";
    const isDifferentDate = originalTask.date !== newDateString;

    let newDeferralCount = originalTask.deferralCount || 0;
    if (isDifferentDate && !isChangingFromWeekly && !isChangingToWeekly) {
      newDeferralCount = (originalTask.deferralCount || 0) + 1;
    }

    const defaultOrder = tasks.filter((t) => t.date === newDateString).length;
    
    const taskUpdates: any = {
      date: newDateString,
      order: defaultOrder,
      deferralCount: newDeferralCount,
    };
    if (isChangingFromWeekly) {
      taskUpdates.type = "day";
    } else if (isChangingToWeekly) {
      taskUpdates.type = "week";
    }

    if (user) {
      try {
        const taskRef = doc(db, "tasks", id);
        await updateDoc(taskRef, taskUpdates);
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...taskUpdates } : t))
        );
      } catch (e) {
        console.error("Critical rescheduling update failed", e);
      }
    } else {
      const updated = tasks.map((t) =>
        t.id === id ? { ...t, ...taskUpdates } : t
      );
      setTasks(updated);
      localStorage.setItem("planner_tasks", JSON.stringify(updated));
    }
  };

  const handleImportData = async (importedTasks: any[], importedWorks: any[], importedReflections: any[]) => {
    const activeUid = user ? user.uid : "local";
    
    // 1. Process Tasks
    const cleanedTasks: TaskItem[] = [];
    for (const t of importedTasks) {
      const cleanTask = {
        uid: activeUid,
        title: String(t.title),
        type: (t.type === "week" ? "week" : "day") as "day" | "week",
        date: t.date ? String(t.date) : "weekly",
        completed: !!t.completed,
        order: typeof t.order === "number" ? t.order : 0,
        createdAt: t.createdAt ? String(t.createdAt) : new Date().toISOString(),
        duration: typeof t.duration === "number" ? t.duration : 30,
        deferralCount: typeof t.deferralCount === "number" ? t.deferralCount : 0,
      };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, "tasks"), cleanTask);
          cleanedTasks.push({ id: docRef.id, ...cleanTask });
        } catch (e) {
          console.error("Failed to import task to firestore:", e);
        }
      } else {
        cleanedTasks.push({ id: crypto.randomUUID(), ...cleanTask });
      }
    }

    // 2. Process Ongoing Works
    const cleanedWorks: OngoingWork[] = [];
    for (const w of importedWorks) {
      const cleanSubtasks = Array.isArray(w.subtasks) ? w.subtasks.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        title: String(s.title),
        completed: !!s.completed,
        assignedDate: s.assignedDate ? String(s.assignedDate) : undefined,
      })) : [];

      const cleanWork = {
        uid: activeUid,
        title: String(w.title),
        reason: String(w.reason || "Mindful priority"),
        status: (w.status === "completed" || w.status === "paused" ? w.status : "active") as "active" | "completed" | "paused",
        createdAt: w.createdAt ? String(w.createdAt) : new Date().toISOString(),
        completedAt: w.completedAt ? String(w.completedAt) : null,
        targetCompletionDate: w.targetCompletionDate ? String(w.targetCompletionDate) : undefined,
        subtasks: cleanSubtasks,
      };

      if (user) {
        try {
          const docRef = await addDoc(collection(db, "ongoingWork"), cleanWork);
          cleanedWorks.push({ id: docRef.id, ...cleanWork });
        } catch (e) {
          console.error("Failed to import ongoing work to firestore:", e);
        }
      } else {
        cleanedWorks.push({ id: crypto.randomUUID(), ...cleanWork });
      }
    }

    // 3. Process Daily Reflections / Checkouts
    const cleanedReflections: any[] = [];
    for (const r of importedReflections) {
      const cleanRef = {
        uid: activeUid,
        date: r.date ? String(r.date) : selectedDate,
        text: String(r.text),
        createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
      };

      if (user) {
        try {
          await addDoc(collection(db, "reflections"), cleanRef);
          cleanedReflections.push({ id: crypto.randomUUID(), ...cleanRef });
        } catch (e) {
          console.error("Failed to import daily reflection to firestore:", e);
        }
      } else {
        cleanedReflections.push({ id: crypto.randomUUID(), ...cleanRef });
      }
    }

    // Update state & local storage
    if (cleanedTasks.length > 0) {
      setTasks((prev) => [...prev, ...cleanedTasks]);
      if (!user) {
        const allLocalTasks = [...tasks, ...cleanedTasks];
        localStorage.setItem("planner_tasks", JSON.stringify(allLocalTasks));
      }
    }

    if (cleanedWorks.length > 0) {
      setOngoingWorks((prev) => [...prev, ...cleanedWorks]);
      if (!user) {
        const allLocalWorks = [...ongoingWorks, ...cleanedWorks];
        localStorage.setItem("planner_works", JSON.stringify(allLocalWorks));
      }
    }

    if (cleanedReflections.length > 0) {
      const localRefsStr = localStorage.getItem("daily_checkouts");
      const localRefs: any[] = localRefsStr ? JSON.parse(localRefsStr) : [];
      const updatedRefs = [...localRefs, ...cleanedReflections];
      localStorage.setItem("daily_checkouts", JSON.stringify(updatedRefs));
      
      cleanedReflections.forEach((ref) => {
        localStorage.setItem(`checked_out_${ref.date}`, "true");
      });
      
      // Notify components to update
      window.dispatchEvent(new Event("storage"));
    }
  };

  // Ongoing Work Tracker Operations
  const handleAddOngoingWork = async (
    title: string,
    reason: string,
    targetCompletionDate?: string,
    initialSubtasks: Subtask[] = []
  ) => {
    const activeWorkList = ongoingWorks.filter((w) => w.status === "active");
    const sortedActive = [...activeWorkList].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const mustPause = activeWorkList.length >= 3 ? sortedActive.slice(0, activeWorkList.length - 2) : [];
    const mustPauseIds = new Set(mustPause.map((w) => w.id));

    if (user) {
      try {
        const batch = writeBatch(db);
        mustPause.forEach((w) => {
          const wRef = doc(db, "ongoingWork", w.id);
          batch.update(wRef, { status: "paused" });
        });
        await batch.commit();

        const newWorkData = {
          uid: user.uid,
          title,
          reason,
          status: "active" as const,
          createdAt: new Date().toISOString(),
          targetCompletionDate: targetCompletionDate || "",
          subtasks: initialSubtasks,
        };

        const docRef = await addDoc(collection(db, "ongoingWork"), newWorkData);
        setOngoingWorks((prev) => [
          ...prev.map((w) => (mustPauseIds.has(w.id) ? { ...w, status: "paused" as const } : w)),
          { id: docRef.id, ...newWorkData },
        ]);
      } catch (err) {
        console.error("Firestore write failed for ongoing work", err);
      }
    } else {
      const newWork: OngoingWork = {
        id: crypto.randomUUID(),
        uid: "local",
        title,
        reason,
        status: "active",
        createdAt: new Date().toISOString(),
        targetCompletionDate: targetCompletionDate || "",
        subtasks: initialSubtasks,
      };
      const updated = [
        ...ongoingWorks.map((w) => (mustPauseIds.has(w.id) ? { ...w, status: "paused" as const } : w)),
        newWork,
      ];
      setOngoingWorks(updated);
      localStorage.setItem("planner_works", JSON.stringify(updated));
    }
  };

  const handleUpdateOngoingWorkStatus = async (
    id: string,
    status: "active" | "completed" | "paused"
  ) => {
    let mustPause: OngoingWork[] = [];
    let mustPauseIds = new Set<string>();

    if (status === "active") {
      const activeWorkList = ongoingWorks.filter((w) => w.status === "active" && w.id !== id);
      if (activeWorkList.length >= 3) {
        const sortedActive = [...activeWorkList].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        mustPause = sortedActive.slice(0, activeWorkList.length - 2);
        mustPauseIds = new Set(mustPause.map((w) => w.id));
      }
    }

    if (user) {
      try {
        const batch = writeBatch(db);
        if (status === "active" && mustPause.length > 0) {
          mustPause.forEach((w) => {
            const wRef = doc(db, "ongoingWork", w.id);
            batch.update(wRef, { status: "paused" });
          });
        }

        const workRef = doc(db, "ongoingWork", id);
        const completedAt = status === "completed" ? new Date().toISOString() : null;
        batch.update(workRef, { status, completedAt });
        await batch.commit();

        setOngoingWorks((prev) => {
          let list = prev.map((w) => {
            if (w.id === id) {
              return { ...w, status, completedAt };
            }
            if (status === "active" && mustPauseIds.has(w.id)) {
              return { ...w, status: "paused" as const };
            }
            return w;
          });
          return list;
        });
      } catch (e) {
        console.error("Failed to update status", e);
      }
    } else {
      let completedAt = status === "completed" ? new Date().toISOString() : null;
      const updated = ongoingWorks.map((w) => {
        if (w.id === id) {
          return { ...w, status, completedAt };
        }
        if (status === "active" && mustPauseIds.has(w.id)) {
          return { ...w, status: "paused" };
        }
        return w;
      }) as OngoingWork[];
      setOngoingWorks(updated);
      localStorage.setItem("planner_works", JSON.stringify(updated));
    }
  };

  const handleDeleteOngoingWork = async (id: string) => {
    if (user) {
      try {
        const wRef = doc(db, "ongoingWork", id);
        await deleteDoc(wRef);
        setOngoingWorks((prev) => prev.filter((w) => w.id !== id));
      } catch (e) {
        console.error("Firestore deletion failed", e);
      }
    } else {
      const updated = ongoingWorks.filter((w) => w.id !== id);
      setOngoingWorks(updated);
      localStorage.setItem("planner_works", JSON.stringify(updated));
    }
  };

  const handleUpdateOngoingWork = async (id: string, updates: Partial<OngoingWork>) => {
    if (user) {
      try {
        const wRef = doc(db, "ongoingWork", id);
        await updateDoc(wRef, updates);
        setOngoingWorks((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
        );
      } catch (err) {
        console.error("Firestore update failed for ongoing work", err);
      }
    } else {
      const updated = ongoingWorks.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ) as OngoingWork[];
      setOngoingWorks(updated);
      localStorage.setItem("planner_works", JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans select-none antialiased text-[#1A1A1A]">
      {/* 1. Styled Header with Clock, User integration */}
      <Header
        user={user}
        onLoginSuccess={handleLoginSuccess}
        onLogoutSuccess={handleLogoutSuccess}
      />

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-neutral-800" />
          <p className="text-xs font-medium text-neutral-400 font-mono tracking-widest uppercase animate-pulse">
            Connecting Space...
          </p>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:px-6 space-y-8">
          {/* Main layout splitting into a Bento Layout */}
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left and Center Bento Grid Pane (8/12 of columns): Planner space + Reflections & brain dumps */}
            <div className="lg:col-span-8 space-y-8">
              
              <Planner
                tasks={tasks}
                selectedDate={selectedDate}
                onSetSelectedDate={setSelectedDate}
                onAddTask={handleAddTask}
                onToggleComplete={handleToggleComplete}
                onDeleteTask={handleDeleteTask}
                onReorderTasks={handleReorderTasks}
                onRescheduleTask={handleRescheduleTask}
                onUpdateTaskDuration={handleUpdateTaskDuration}
              />

              {/* Side-by-side grid underneath the Planner (on md+ screens) to optimize spacing and height balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Quiet, 1-sentence checkout prompt unlocked at end of day */}
                <DailyCheckOut
                  user={user}
                  selectedDate={selectedDate}
                />

                {/* Clean mental noise brain dump memory */}
                <MentalNoise
                  user={user}
                />
              </div>

            </div>

            {/* Right Bento Grid Pane (4/12 of columns): Ongoing Focus Flow Tracks */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Dedicated track place for ongoing works with required reasoning */}
              <OngoingWorkTracker
                ongoingWorks={ongoingWorks}
                onAddOngoingWork={handleAddOngoingWork}
                onUpdateOngoingWorkStatus={handleUpdateOngoingWorkStatus}
                onDeleteOngoingWork={handleDeleteOngoingWork}
                onUpdateOngoingWork={handleUpdateOngoingWork}
                onAddTask={handleAddTask}
              />

              {/* Data Portability & Sync center */}
              <DataHub
                user={user}
                tasks={tasks}
                ongoingWorks={ongoingWorks}
                onImportData={handleImportData}
              />
            </div>

          </div>

          {/* Minimal footer explaining local vs. cloud state persistence */}
          <footer className="pt-8 pb-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-neutral-400 font-mono tracking-wide">
              {user ? (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" /> Synced with Firebase Cloud Storage for {user.email}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-neutral-400" /> Running offline local storage fallback. Sign in to back up data.
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-neutral-400">
              <span>Intentional Day Design Principle</span>
              <span>&bull;</span>
              <span>Less but Better</span>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}
