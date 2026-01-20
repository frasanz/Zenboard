import { useCallback, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Calendar } from "./components/Calendar";
import { Sidebar } from "./components/Sidebar";
import { useProjects, useUpdateTask, useReorder, Task, Project } from "./hooks/useApi";
import { useState } from "react";

const queryClient = new QueryClient();

function AppContent() {
  const { data: projects = [], isLoading, error } = useProjects();
  const updateTask = useUpdateTask();
  const reorder = useReorder();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [calendarHoverTime, setCalendarHoverTime] = useState<Date | null>(null);
  const calendarHoverTimeRef = useRef<Date | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Handle adding task to calendar - always use next Sunday at 6 AM
  const handleAddToCalendar = useCallback((taskId: number) => {
    const now = new Date();
    const targetDate = new Date(now);
    
    // Calculate next Sunday
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    targetDate.setDate(now.getDate() + daysUntilSunday);
    
    // Set to 6:00 AM
    targetDate.setHours(6, 0, 0, 0);
    
    updateTask.mutate({
      id: taskId,
      start_date: targetDate.toISOString(),
    });
  }, [updateTask]);

  // Handle task click - highlight in both calendar and sidebar
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    // Clear selection after 3 seconds
    setTimeout(() => setSelectedTaskId(null), 3000);
  }, []);

  // Update both state and ref when hover time changes
  const handleHoverTimeChange = useCallback((time: Date | null) => {
    setCalendarHoverTime(time);
    calendarHoverTimeRef.current = time;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "task") {
      setActiveTask(active.data.current.task);
    }
    if (active.data.current?.type === "project") {
      setActiveProject(active.data.current.project);
    }
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (event.active.data.current?.type === "task") {
      // Get the pointer position from the activator event
      const { activatorEvent, delta } = event;
      if (activatorEvent instanceof PointerEvent) {
        setDragPosition({
          x: activatorEvent.clientX + delta.x,
          y: activatorEvent.clientY + delta.y,
        });
      }
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      console.log("🔚 DRAG END:", { activeId: event.active.id, overId: event.over?.id, activeType: event.active.data.current?.type });
      const { active, over } = event;
      setActiveTask(null);
      setActiveProject(null);
      setDragPosition(null);

      if (!over) {
        console.log("⚠️ No hay 'over' - drag cancelado");
        setCalendarHoverTime(null);
        calendarHoverTimeRef.current = null;
        return;
      }

      // Check if dropping a task from list onto calendar area or onto another task in calendar
      if (active.data.current?.type === "task") {
        const activeTask = active.data.current.task as Task;
        const overIsCalendar = over.id === "calendar-drop";
        const overIsTaskInCalendar = typeof over.id === "string" && over.id.startsWith("task-") && over.data.current?.type === "task";
        
        console.log("📋 Task drop info:", {
          activeId: active.id,
          overId: over.id,
          overIsCalendar,
          overIsTaskInCalendar,
          activeTaskHasDate: !!activeTask.start_date,
          overTaskHasDate: over.data.current?.task?.start_date
        });
        
        // Ignore if dropping on itself
        if (active.id === over.id) {
          console.log("⚠️ Soltado sobre sí mismo, ignorando");
          setCalendarHoverTime(null);
          calendarHoverTimeRef.current = null;
          return;
        }
        
        // If dropping on calendar or on a task that's in the calendar
        if (overIsCalendar || (overIsTaskInCalendar && over.data.current?.task?.start_date)) {
          console.log("🎯 DROP EN CALENDARIO DETECTADO", { overIsCalendar, overIsTaskInCalendar });
          
          let dropTime: Date;
          
          // If we have a hover time from the preview, use it
          if (calendarHoverTimeRef.current) {
            dropTime = calendarHoverTimeRef.current;
            console.log("✅ Usando tiempo del hover:", dropTime);
          }
          // If dropping on another task in calendar, use that task's time
          else if (overIsTaskInCalendar && over.data.current?.task?.start_date) {
            const targetTask = over.data.current.task as Task;
            dropTime = new Date(targetTask.start_date);
            console.log("✅ Usando tiempo de tarea destino:", dropTime);
          }
          // Otherwise use current time
          else {
            dropTime = new Date();
            dropTime.setMinutes(Math.round(dropTime.getMinutes() / 15) * 15);
            dropTime.setSeconds(0);
            dropTime.setMilliseconds(0);
            console.log("⚠️ Usando tiempo por defecto:", dropTime);
          }
          
          // Only update if the task doesn't already have this start date
          if (!activeTask.start_date || new Date(activeTask.start_date).getTime() !== dropTime.getTime()) {
            updateTask.mutate({
              id: activeTask.id,
              start_date: dropTime.toISOString(),
            });
          }
          
          setCalendarHoverTime(null);
          calendarHoverTimeRef.current = null;
          return;
        }
      }

      // Clear calendar hover state for other drop types
      setCalendarHoverTime(null);
      calendarHoverTimeRef.current = null;

      // Handle reordering within lists
      if (active.id !== over.id) {
        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        // Handle project reordering
        if (activeType === "project" && overType === "project") {
          const activeProject = active.data.current.project as Project;
          const overProject = over.data.current.project as Project;

          const projectsCopy = [...projects];
          const oldIndex = projectsCopy.findIndex((p) => p.id === activeProject.id);
          const newIndex = projectsCopy.findIndex((p) => p.id === overProject.id);

          if (oldIndex !== -1) {
            projectsCopy.splice(oldIndex, 1);
          }
          projectsCopy.splice(newIndex, 0, activeProject);

          const reorderItems = projectsCopy.map((p, index) => ({
            type: "project",
            id: p.id,
            order: index,
          }));

          reorder.mutate(reorderItems);
        }

        if (activeType === "task" && overType === "task") {
          const activeTask = active.data.current.task as Task;
          const overTask = over.data.current.task as Task;

          // Find all tasks in the target project and calculate new order
          const targetProject = projects.find(
            (p) => p.id === overTask.project_id
          );
          if (!targetProject) return;

          const tasks = [...targetProject.tasks];
          const oldIndex = tasks.findIndex((t) => t.id === activeTask.id);
          const newIndex = tasks.findIndex((t) => t.id === overTask.id);

          if (oldIndex !== -1) {
            tasks.splice(oldIndex, 1);
          }
          tasks.splice(newIndex, 0, activeTask);

          const reorderItems = tasks.map((t, index) => ({
            type: "task",
            id: t.id,
            order: index,
            parent_id: overTask.project_id,
          }));

          reorder.mutate(reorderItems);
        }

        if (activeType === "subtask" && overType === "subtask") {
          const activeSubtask = active.data.current.subtask;
          const overSubtask = over.data.current.subtask;

          // Find the task containing these subtasks
          let targetTask: Task | undefined;
          for (const project of projects) {
            targetTask = project.tasks.find((t) =>
              t.subtasks.some((s) => s.id === overSubtask.id)
            );
            if (targetTask) break;
          }

          if (!targetTask) return;

          const subtasks = [...targetTask.subtasks];
          const oldIndex = subtasks.findIndex((s) => s.id === activeSubtask.id);
          const newIndex = subtasks.findIndex((s) => s.id === overSubtask.id);

          if (oldIndex !== -1) {
            subtasks.splice(oldIndex, 1);
          }
          subtasks.splice(newIndex, 0, activeSubtask);

          const reorderItems = subtasks.map((s, index) => ({
            type: "subtask",
            id: s.id,
            order: index,
            parent_id: targetTask!.id,
          }));

          reorder.mutate(reorderItems);
        }
      }
    },
    [projects, updateTask, reorder, calendarHoverTime]
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load projects</p>
          <p className="text-sm text-muted-foreground">
            Make sure the server is running on port 3001
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gradient-to-br from-background to-secondary/30">
        <header className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-lg">禅</span>
            </div>
            <h1 className="text-xl font-medium tracking-tight text-foreground/90">ZenBoard</h1>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">Focus on what matters</p>
        </header>
        <main className="flex-1 overflow-hidden px-4 pb-4">
          <PanelGroup direction="horizontal" className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <Panel defaultSize={60} minSize={30}>
              <Calendar
                projects={projects}
                onHoverTimeChange={handleHoverTimeChange}
                dragPosition={dragPosition}
                isDraggingTask={!!activeTask}
                selectedTaskId={selectedTaskId}
                onTaskClick={handleTaskClick}
              />
            </Panel>
            <PanelResizeHandle className="w-2 relative" />
            <Panel defaultSize={40} minSize={25} className="bg-card/80">
              <Sidebar
                projects={projects}
                selectedTaskId={selectedTaskId}
                onTaskClick={handleTaskClick}
                onAddToCalendar={handleAddToCalendar}
              />
            </Panel>
          </PanelGroup>
        </main>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2 shadow-xl pointer-events-none">
            <span className="text-sm font-medium">{activeTask.title}</span>
          </div>
        )}
        {activeProject && (
          <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2 shadow-xl flex items-center gap-2 pointer-events-none">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activeProject.color }}
            />
            <span className="text-sm font-medium">{activeProject.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
