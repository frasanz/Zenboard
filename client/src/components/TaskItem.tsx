import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, Clock, ChevronDown, ChevronRight, Play, Pause, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubtaskItem } from "./SubtaskItem";
import { Task, useUpdateTask, useDeleteTask, useCreateSubtask, useUpdateSubtask } from "@/hooks/useApi";
import { RichTextEditor, RichTextViewer } from "./RichTextEditor";

interface TaskItemProps {
  task: Task;
  projectColor: string;
  projectType?: string;
  projectName?: string;
  isSelected?: boolean;
  onTaskClick?: (task: Task) => void;
  onAddToCalendar?: (taskId: number) => void;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDateTime(dateStr: string): { date: string; time: string } {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return {
    date: `${day}/${month}`,
    time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function TaskItem({ task, projectColor, projectType, projectName, isSelected, onTaskClick, onAddToCalendar }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [description, setDescription] = useState(task.description || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [currentTrackedTime, setCurrentTrackedTime] = useState(task.time_tracked_minutes);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const updateTask = useUpdateTask();

  // Handler para doble click: agregar tarea sin fecha al calendario
  const handleDoubleClick = () => {
    // Solo si la tarea no tiene fecha
    if (!task.start_date && onAddToCalendar) {
      onAddToCalendar(task.id);
    }
  };
  const deleteTask = useDeleteTask();
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();

  // Update tracked time every second when tracking is active
  useEffect(() => {
    if (task.tracking_state !== 'started' || !task.tracking_started_at) {
      setCurrentTrackedTime(task.time_tracked_minutes);
      return;
    }

    const interval = setInterval(() => {
      const startedAt = new Date(task.tracking_started_at!);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - startedAt.getTime()) / 60000;
      setCurrentTrackedTime(task.time_tracked_minutes + elapsedMinutes);
    }, 100); // Update every 100ms for smooth seconds display

    return () => clearInterval(interval);
  }, [task.tracking_state, task.tracking_started_at, task.time_tracked_minutes]);

  // Listen for collapse all event
  useEffect(() => {
    const handleCollapseAll = () => {
      setIsExpanded(false);
    };

    window.addEventListener('collapseAllTasks', handleCollapseAll);
    return () => window.removeEventListener('collapseAllTasks', handleCollapseAll);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleComplete = () => {
    const isCompleting = !task.completed;
    
    // If completing the task and it's being tracked, stop tracking
    if (isCompleting && task.tracking_state === 'started') {
      handleStopTracking();
    }
    
    updateTask.mutate({
      id: task.id,
      completed: task.completed ? 0 : 1,
    });
  };

  const handleSaveTitle = () => {
    if (title.trim() && title !== task.title) {
      updateTask.mutate({ id: task.id, title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id);
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      createSubtask.mutate({ task_id: task.id, title: newSubtask.trim() });
      setNewSubtask("");
    }
  };

  const handleSaveDescription = () => {
    if (description !== task.description) {
      updateTask.mutate({ 
        id: task.id, 
        description: description.trim() || null 
      });
    }
    setIsEditingDescription(false);
  };

  const handleStartTracking = () => {
    // Don't allow starting if task is completed
    if (task.completed) return;
    
    updateTask.mutate({
      id: task.id,
      tracking_state: 'started',
      tracking_started_at: new Date().toISOString(),
    });
    
    setShowTrackingDialog(true);
  };

  const handlePauseTracking = () => {
    if (!task.tracking_started_at) return;
    
    const startedAt = new Date(task.tracking_started_at);
    const now = new Date();
    const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
    
    updateTask.mutate({
      id: task.id,
      tracking_state: 'paused',
      time_tracked_minutes: task.time_tracked_minutes + elapsedMinutes,
      tracking_started_at: null,
    });
  };

  const handleStopTracking = () => {
    if (task.tracking_state === 'started' && task.tracking_started_at) {
      const startedAt = new Date(task.tracking_started_at);
      const now = new Date();
      const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
      
      updateTask.mutate({
        id: task.id,
        tracking_state: 'stopped',
        time_tracked_minutes: task.time_tracked_minutes + elapsedMinutes,
        tracking_started_at: null,
      });
    } else {
      updateTask.mutate({
        id: task.id,
        tracking_state: 'stopped',
        time_tracked_minutes: task.time_tracked_minutes,
        tracking_started_at: null,
      });
    }
    
    setShowTrackingDialog(false);
  };

  // Calculate remaining time
  const remainingMinutes = Math.max(0, task.duration_minutes - currentTrackedTime);
  const totalSeconds = Math.floor(remainingMinutes * 60);
  const remainingHours = Math.floor(totalSeconds / 3600);
  const remainingMins = Math.floor((totalSeconds % 3600) / 60);
  const remainingSecs = totalSeconds % 60;
  const progress = task.duration_minutes > 0 ? (currentTrackedTime / task.duration_minutes) * 100 : 0;

  const subtaskIds = task.subtasks.map((s) => `subtask-${s.id}`);

  const handleTaskClick = () => {
    if (task.start_date && onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div 
        onClick={handleDoubleClick}
        className={`grid grid-cols-[auto_auto_auto_auto_1fr_auto_auto_auto_auto_auto_auto_auto] items-center gap-2 py-2 px-2 rounded hover:bg-muted/50 group ${
        task.tracking_state === 'started' 
          ? 'bg-green-50 ring-2 ring-green-500/50 dark:bg-green-950/20 dark:ring-green-500/30' 
          : isSelected 
          ? 'bg-primary/10 ring-1 ring-primary' 
          : ''
      }`}>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <Checkbox
          checked={!!task.completed}
          onCheckedChange={handleToggleComplete}
        />

        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: projectColor,
            ...(projectType === "Personal" && {
              backgroundImage: `repeating-linear-gradient(
                45deg,
                ${projectColor},
                ${projectColor} 2px,
                white 2px,
                white 4px
              )`
            })
          }}
        />

        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") {
                setTitle(task.title);
                setIsEditing(false);
              }
            }}
            className="h-7 text-sm"
            autoFocus
          />
        ) : (
          <span
            onClick={handleTaskClick}
            onDoubleClick={() => setIsEditing(true)}
            className={`text-sm flex-1 cursor-pointer ${
              task.completed ? "line-through text-muted-foreground" : ""
            } ${task.start_date ? "hover:text-primary" : ""}`}
            title={task.start_date ? "Click to view in calendar" : "No date assigned"}
          >
            {projectName && <span className="text-muted-foreground">[{projectName}] - </span>}
            {task.title}
            {task.subtasks.length > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({task.subtasks.length})
              </span>
            )}
          </span>
        )}

        <div className="w-12 text-xs bg-muted text-muted-foreground px-1 py-0.5 rounded text-center">
          {formatDuration(task.duration_minutes)}
        </div>

        <div className="w-24">
          {task.start_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              <span className="truncate">{formatDateTime(task.start_date).date}, {formatDateTime(task.start_date).time}</span>
            </span>
          )}
        </div>

        {/* Time tracking display - Always show, even if 0 */}
        <div className="w-12">
          <span 
            className={`text-xs px-1 py-0.5 rounded font-medium block text-center cursor-pointer ${
              currentTrackedTime > 0 
                ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => task.tracking_state === 'started' && setShowTrackingDialog(true)}
            title={task.tracking_state === 'started' ? 'Ver seguimiento' : ''}
          >
            {currentTrackedTime > 0 ? '⏱' : ''}{formatDuration(Math.floor(currentTrackedTime))}
          </span>
        </div>

        {/* Time tracking controls - Only show if not completed */}
        <div className="w-7 flex justify-center">
          {!task.completed && (
            <>
              {task.tracking_state === 'stopped' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleStartTracking}
                  title="Start tracking"
                >
                  <Play className="h-3 w-3 text-green-600" />
                </Button>
              )}

              {task.tracking_state === 'started' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handlePauseTracking}
                  title="Pause tracking"
                >
                  <Pause className="h-3 w-3 text-orange-600" />
                </Button>
              )}

              {task.tracking_state === 'paused' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleStartTracking}
                  title="Resume tracking"
                >
                  <Play className="h-3 w-3 text-green-600" />
                </Button>
              )}
            </>
          )}
        </div>

        <div className="w-7 flex justify-center">
          {!task.completed && task.tracking_state === 'paused' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleStopTracking}
              title="Stop tracking"
            >
              <Square className="h-3 w-3 text-red-600" />
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {
            setIsExpanded(true);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {isExpanded && (
        <div className="ml-10 mt-1 space-y-2">
          {/* Description section */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Notas</span>
              {!isEditingDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {task.description ? 'Editar' : 'Agregar'}
                </Button>
              )}
            </div>
            {isEditingDescription ? (
              <RichTextEditor
                content={description}
                onChange={setDescription}
                onBlur={handleSaveDescription}
                placeholder="Notas, enlaces, detalles..."
                autoFocus
              />
            ) : (
              <RichTextViewer
                content={task.description || ""}
                onDoubleClick={() => setIsEditingDescription(true)}
                placeholder="Doble click para agregar notas..."
              />
            )}
          </div>

          {/* Subtasks section */}
          <div>
            <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
              {task.subtasks.map((subtask) => (
                <SubtaskItem key={subtask.id} subtask={subtask} />
              ))}
            </SortableContext>

            <div className="flex items-center gap-2 py-1 px-2">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add subtask..."
              className="h-6 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubtask();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleAddSubtask}
              disabled={!newSubtask.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          </div>
        </div>
      )}

      {/* Tracking Dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-slate-50 to-stone-50 dark:from-slate-900 dark:to-stone-900">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <DialogTitle className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-wide">{task.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 mt-6">
            {/* Time Gauge */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-64 h-64">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="85"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - Math.min(progress, 100) / 100)}`}
                    className={`transition-all duration-300 ${
                      progress >= 100 ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Time Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-sm font-light text-slate-500 dark:text-slate-400 mb-2 tracking-wider uppercase text-xs">
                    Tiempo restante
                  </div>
                  <div className={`text-5xl font-extralight tracking-tight ${
                    totalSeconds <= 0 ? 'text-rose-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {remainingHours > 0 && `${remainingHours}:`}
                    {remainingMins.toString().padStart(2, '0')}:{remainingSecs.toString().padStart(2, '0')}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-light">
                    {formatDuration(Math.floor(currentTrackedTime))} / {formatDuration(task.duration_minutes)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-3 px-2">
              <h3 className="text-sm font-light text-slate-600 dark:text-slate-400 uppercase tracking-wider">Notas</h3>
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <RichTextEditor
                  content={description}
                  onChange={(newDesc) => {
                    setDescription(newDesc);
                    updateTask.mutate({ id: task.id, description: newDesc });
                  }}
                  placeholder="Agregar notas de la tarea..."
                />
              </div>
            </div>

            {/* Subtasks Section */}
            {task.subtasks.length > 0 && (
              <div className="space-y-3 px-2">
                <h3 className="text-sm font-light text-slate-600 dark:text-slate-400 uppercase tracking-wider">Subtareas</h3>
                <div className="space-y-3">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!subtask.completed}
                          onCheckedChange={(checked) => {
                            updateSubtask.mutate({
                              id: subtask.id,
                              completed: checked ? 1 : 0,
                            });
                          }}
                        />
                        <span className={`flex-1 text-sm font-light ${
                          subtask.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {subtask.title}
                        </span>
                      </div>
                      <div className="ml-8">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-light">Notas</div>
                        <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                          <RichTextEditor
                            content={subtask.notes || ""}
                            onChange={(newNotes) => {
                              updateSubtask.mutate({ id: subtask.id, notes: newNotes });
                            }}
                            placeholder="Agregar notas..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stop Button */}
            <div className="flex justify-center pt-4 px-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleStopTracking}
                className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-light"
              >
                <Square className="h-4 w-4 mr-2" />
                Detener seguimiento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
