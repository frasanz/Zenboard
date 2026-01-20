import { useCallback, useRef, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { EventDropArg, EventResizeDoneArg, EventClickArg } from "@fullcalendar/core";
import { useDroppable } from "@dnd-kit/core";
import { Project, Task, useUpdateTask, useWeeklyPlan, useUpdateWeeklyPlan, useGoogleCalendarEvents } from "@/hooks/useApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { RichTextEditor, RichTextViewer } from "./RichTextEditor";

interface CalendarProps {
  projects: Project[];
  onTaskClick?: (task: Task) => void;
  dragPosition?: { x: number; y: number } | null;
  isDraggingTask?: boolean;
  onHoverTimeChange?: (time: Date | null) => void;
  selectedTaskId?: number | null;
}

// Helper to get Monday of the week for a given date
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

// Helper to format week range
function formatWeekRange(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  
  const formatDate = (d: Date) => {
    const day = d.getDate();
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${day} ${months[d.getMonth()]}`;
  };
  
  return `${formatDate(monday)} - ${formatDate(sunday)}`;
}

export function Calendar({
  projects,
  onTaskClick,
  dragPosition,
  isDraggingTask,
  onHoverTimeChange,
  selectedTaskId
}: CalendarProps) {
  const updateTask = useUpdateTask();
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewEvent, setPreviewEvent] = useState<{
    date: Date;
    x: number;
    y: number;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ task: Task; project: Project } | null>(null);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<{
    title: string;
    start: string;
    end: string;
    description: string;
    location: string;
    status: string;
  } | null>(null);
  const [description, setDescription] = useState("");
  const [isWeeklyPlanExpanded, setIsWeeklyPlanExpanded] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [weeklyPlanContent, setWeeklyPlanContent] = useState("");
  const [isEditingWeeklyPlan, setIsEditingWeeklyPlan] = useState(false);
  
  const { data: weeklyPlan } = useWeeklyPlan(currentWeekStart);
  const updateWeeklyPlan = useUpdateWeeklyPlan();
  const { data: googleEvents = [] } = useGoogleCalendarEvents();

  // Update local content when plan is loaded
  useEffect(() => {
    if (weeklyPlan) {
      setWeeklyPlanContent(weeklyPlan.content);
    }
  }, [weeklyPlan]);

  // Update current week when calendar view changes
  useEffect(() => {
    if (!calendarRef.current) return;
    
    const calendarApi = calendarRef.current.getApi();
    
    const handleDatesSet = () => {
      const viewStart = calendarApi.view.currentStart;
      const newWeekStart = getMonday(viewStart);
      setCurrentWeekStart(prev => {
        // Only update if different to avoid unnecessary renders
        return prev !== newWeekStart ? newWeekStart : prev;
      });
    };
    
    // Use setTimeout to avoid flushSync warning
    const timeoutId = setTimeout(handleDatesSet, 0);
    
    // Listen for view changes
    calendarApi.on('datesSet', handleDatesSet);
    
    return () => {
      clearTimeout(timeoutId);
      calendarApi.off('datesSet', handleDatesSet);
    };
  }, []);

  const handleSaveWeeklyPlan = useCallback(() => {
    updateWeeklyPlan.mutate({ weekStart: currentWeekStart, content: weeklyPlanContent });
    setIsEditingWeeklyPlan(false);
  }, [currentWeekStart, weeklyPlanContent, updateWeeklyPlan]);

  const { setNodeRef, isOver } = useDroppable({
    id: "calendar-drop",
  });

  // Combine refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  // Convert tasks to calendar events
  const events = [
    // Task events
    ...projects.flatMap((project) =>
      project.tasks
        .filter((task) => task.start_date)
        .map((task) => {
          const classNames: string[] = [];
          if (selectedTaskId === task.id) classNames.push('fc-event-selected');
          if (task.completed) classNames.push('fc-event-completed');
          if (project.type === 'Personal') classNames.push('fc-event-personal');
          
          const taskTitle = task.completed ? `✓ ${task.title}` : task.title;
          
          return {
            id: `task-${task.id}`,
            title: `${taskTitle} [${project.name}]`,
            start: task.start_date!,
            end: new Date(
              new Date(task.start_date!).getTime() + task.duration_minutes * 60000
            ).toISOString(),
            backgroundColor: project.color,
            borderColor: project.color,
            classNames,
            extendedProps: { task, project },
          };
        })
    ),
    // Google Calendar events
    ...googleEvents.map((event) => {
      const classNames = ['fc-event-google'];
      if (event.status === 'declined') classNames.push('fc-event-google-declined');
      if (event.status === 'tentative') classNames.push('fc-event-google-tentative');
      
      return {
        id: `google-${event.id}`,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: '#9ca3af',
        borderColor: '#6b7280',
        classNames,
        extendedProps: { 
          isGoogleEvent: true,
          status: event.status,
          description: event.description,
          location: event.location
        },
      };
    })
  ];

  // Calculate hours per day
  const getHoursForDay = useCallback((dateStr: string) => {
    const dayStart = new Date(dateStr);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);

    let workMinutes = 0;
    let personalMinutes = 0;
    let meetingMinutes = 0;

    // Calculate task hours
    for (const project of projects) {
      for (const task of project.tasks) {
        if (!task.start_date) continue;
        
        const taskStart = new Date(task.start_date);
        const taskEnd = new Date(taskStart.getTime() + task.duration_minutes * 60000);
        
        // Check if task overlaps with this day
        if (taskStart <= dayEnd && taskEnd >= dayStart) {
          // Calculate overlap
          const overlapStart = taskStart > dayStart ? taskStart : dayStart;
          const overlapEnd = taskEnd < dayEnd ? taskEnd : dayEnd;
          const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
          
          if (project.type === 'Trabajo') {
            workMinutes += overlapMinutes;
          } else {
            personalMinutes += overlapMinutes;
          }
        }
      }
    }

    // Calculate meeting hours (only accepted Google Calendar events)
    for (const event of googleEvents) {
      if (event.status !== 'accepted') continue;
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if event overlaps with this day
      if (eventStart <= dayEnd && eventEnd >= dayStart) {
        // Calculate overlap
        const overlapStart = eventStart > dayStart ? eventStart : dayStart;
        const overlapEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
        
        meetingMinutes += overlapMinutes;
      }
    }

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours === 0 && mins === 0) return '';
      if (mins === 0) return `${hours}h`;
      return `${hours}h:${String(mins).padStart(2, '0')}m`;
    };

    const workStr = formatTime(workMinutes);
    const meetingStr = formatTime(meetingMinutes);
    const personalStr = formatTime(personalMinutes);
    
    // Format: work / meetings / personal
    const parts = [];
    if (workStr) parts.push(workStr);
    else parts.push('0h');
    
    if (meetingStr) parts.push(meetingStr);
    else parts.push('0h');
    
    if (personalStr) parts.push(personalStr);
    else parts.push('0h');
    
    // Only show if there's any activity
    if (workMinutes === 0 && meetingMinutes === 0 && personalMinutes === 0) return '';
    
    return parts.join(' / ');
  }, [projects, googleEvents]);

  // Custom day header content
  const dayHeaderContent = useCallback((arg: any) => {
    // Use local date string to avoid timezone issues
    const year = arg.date.getFullYear();
    const month = String(arg.date.getMonth() + 1).padStart(2, '0');
    const day = String(arg.date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hours = getHoursForDay(dateStr);
    
    return (
      <div className="flex flex-col items-center py-1">
        <div className="text-sm font-medium">
          {arg.text}
        </div>
        {hours && (
          <div className="text-xs text-muted-foreground font-normal mt-0.5">
            {hours}
          </div>
        )}
      </div>
    );
  }, [getHoursForDay]);

  // Navigate to selected task
  useEffect(() => {
    if (!selectedTaskId || !calendarRef.current) return;

    // Find the task
    let selectedTask: Task | undefined;
    for (const project of projects) {
      selectedTask = project.tasks.find((t) => t.id === selectedTaskId);
      if (selectedTask) break;
    }

    if (selectedTask?.start_date) {
      const calendarApi = calendarRef.current.getApi();
      const taskDate = new Date(selectedTask.start_date);

      // Navigate to the task's date
      calendarApi.gotoDate(taskDate);

      // Switch to appropriate view based on current view
      const currentView = calendarApi.view.type;
      if (currentView === 'dayGridMonth') {
        // In month view, switch to week view to show the time
        calendarApi.changeView('timeGridWeek', taskDate);
      }
    }
  }, [selectedTaskId, projects]);

  // Handle drop from external source using FullCalendar's native drop API
  const handleDrop = useCallback((info: { date: Date; allDay: boolean; jsEvent: MouseEvent; view: any }) => {
    console.log("📅 FullCalendar handleDrop llamado:", { date: info.date, allDay: info.allDay, viewType: info.view.type });
    const dropDate = new Date(info.date);
    
    // Round to nearest 15 minutes for time grid views
    if (!info.allDay) {
      dropDate.setMinutes(Math.round(dropDate.getMinutes() / 15) * 15);
      dropDate.setSeconds(0);
      dropDate.setMilliseconds(0);
      console.log("⏰ Tiempo redondeado (time grid):", dropDate);
    } else {
      // For all-day or day grid, set to 9 AM
      dropDate.setHours(9, 0, 0, 0);
      console.log("⏰ Tiempo por defecto (day grid):", dropDate);
    }
    
    setPreviewEvent({
      date: dropDate,
      x: info.jsEvent.clientX,
      y: info.jsEvent.clientY,
    });
    onHoverTimeChange?.(dropDate);
  }, [onHoverTimeChange]);

  // Calculate time slot from drag position (for preview while dragging)
  useEffect(() => {
    if (!isDraggingTask || !dragPosition) {
      setPreviewEvent(null);
      onHoverTimeChange?.(null);
      return;
    }
    
    // Don't try to detect calendar elements during drag - just show we're dragging
    // The actual drop detection will be handled by FullCalendar's drop event
    console.log("👆 Dragging over calendar area");
  }, [isDraggingTask, dragPosition, onHoverTimeChange]);

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      const taskId = parseInt(info.event.id.replace("task-", ""));
      updateTask.mutate(
        {
          id: taskId,
          start_date: info.event.start?.toISOString(),
        },
        {
          onError: () => {
            // Revert the change if the update fails
            info.revert();
          },
        }
      );
    },
    [updateTask]
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      const taskId = parseInt(info.event.id.replace("task-", ""));
      const start = info.event.start;
      const end = info.event.end;
      if (start && end) {
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        updateTask.mutate(
          {
            id: taskId,
            duration_minutes: durationMinutes,
          },
          {
            onError: () => {
              // Revert the change if the update fails
              info.revert();
            },
          }
        );
      }
    },
    [updateTask]
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      // Handle Google Calendar events
      if (info.event.extendedProps.isGoogleEvent) {
        setSelectedGoogleEvent({
          title: info.event.title,
          start: info.event.start?.toISOString() || '',
          end: info.event.end?.toISOString() || '',
          description: info.event.extendedProps.description || '',
          location: info.event.extendedProps.location || '',
          status: info.event.extendedProps.status || 'accepted',
        });
        return;
      }
      
      const task = info.event.extendedProps.task as Task;
      const project = info.event.extendedProps.project as Project;
      setSelectedTask({ task, project });
      setDescription(task.description || "");
      onTaskClick?.(task);
    },
    [onTaskClick]
  );

  const handleSaveDescription = () => {
    if (selectedTask && description !== selectedTask.task.description) {
      updateTask.mutate({
        id: selectedTask.task.id,
        description: description.trim() || null,
      });
    }
  };

  const handleCloseDialog = () => {
    handleSaveDescription();
    setSelectedTask(null);
  };

  const handleDateClick = useCallback((info: DateClickArg) => {
    console.log("Date clicked:", info.dateStr);
  }, []);

  return (
    <div
      ref={setRefs}
      className={`h-full flex flex-col relative ${isOver && isDraggingTask ? "bg-primary/5" : ""}`}
    >
      {/* Weekly Plan Panel */}
      <div className="flex-shrink-0">
        <div className="p-4 pb-0">
          <button
            onClick={() => setIsWeeklyPlanExpanded(!isWeeklyPlanExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Plan Semanal: {formatWeekRange(currentWeekStart)}</span>
            </div>
            {isWeeklyPlanExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        
        {isWeeklyPlanExpanded && (
          <div className="px-4 pt-3 pb-2">
            {isEditingWeeklyPlan ? (
              <RichTextEditor
                content={weeklyPlanContent}
                onChange={setWeeklyPlanContent}
                onBlur={handleSaveWeeklyPlan}
                placeholder="¿Cuáles son tus prioridades esta semana? Escribe aquí tu objetivo semanal..."
                autoFocus
              />
            ) : (
              <RichTextViewer
                content={weeklyPlanContent}
                onDoubleClick={() => setIsEditingWeeklyPlan(true)}
                placeholder="Doble click para agregar tu plan semanal..."
              />
            )}
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4 pt-2 overflow-auto">
        <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale="es"
        firstDay={1}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
        }}
        editable={true}
        droppable={true}
        drop={handleDrop}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        events={events}
        height="100%"
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        allDaySlot={false}
        nowIndicator={true}
        slotDuration="00:30:00"
        snapDuration="00:15:00"
        dayHeaderContent={dayHeaderContent}
      />
      </div>

      {/* Time preview indicator */}
      {isDraggingTask && previewEvent && (
        <div
          className="fixed pointer-events-none bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg z-[9999]"
          style={{
            top: previewEvent.y - 30,
            left: previewEvent.x + 10,
          }}
        >
          {previewEvent.date.toLocaleString('es-ES', { 
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      )}

      {/* Task details dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedTask?.project.color }}
              />
              {selectedTask?.task.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Descripción
              </label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                onBlur={handleSaveDescription}
                placeholder="Notas, enlaces, detalles sobre esta tarea..."
                autoFocus
              />
            </div>
            {selectedTask && (
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>Proyecto: {selectedTask.project.name}</span>
                <span>Duración: {Math.floor(selectedTask.task.duration_minutes / 60)}h {selectedTask.task.duration_minutes % 60}m</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Calendar event dialog */}
      <Dialog open={!!selectedGoogleEvent} onOpenChange={(open) => !open && setSelectedGoogleEvent(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              {selectedGoogleEvent?.title}
              {selectedGoogleEvent?.status === 'declined' && (
                <span className="text-xs text-red-500 font-normal">(Rechazado)</span>
              )}
              {selectedGoogleEvent?.status === 'tentative' && (
                <span className="text-xs text-yellow-600 font-normal">(En espera)</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto">
            {selectedGoogleEvent && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">Inicio:</span>
                    <span>{new Date(selectedGoogleEvent.start).toLocaleString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">Fin:</span>
                    <span>{new Date(selectedGoogleEvent.end).toLocaleString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
                {selectedGoogleEvent.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Ubicación
                    </label>
                    <p className="text-sm">{selectedGoogleEvent.location}</p>
                  </div>
                )}
                {selectedGoogleEvent.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Descripción
                    </label>
                    <p className="text-sm whitespace-pre-wrap">{selectedGoogleEvent.description}</p>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    Evento de Google Calendar (solo lectura)
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
