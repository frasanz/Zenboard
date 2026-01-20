import { useMemo } from "react";
import { CalendarDays, Clock, Timer, EyeOff, Eye, CalendarX, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskItem } from "./TaskItem";
import { Project, Task, GoogleCalendarEvent } from "@/hooks/useApi";
import jsPDF from "jspdf";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

interface DayViewProps {
  projects: Project[];
  googleEvents?: GoogleCalendarEvent[];
  selectedTaskId?: number | null;
  onTaskClick?: (task: Task) => void;
  hideCompleted?: boolean;
  onToggleHideCompleted?: () => void;
  hidePastDays?: boolean;
  onToggleHidePastDays?: () => void;
}

interface TaskWithProject {
  task: Task;
  project: Project;
}

function formatDateHeader(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return "Hoy";
  }
  if (targetDate.getTime() === tomorrow.getTime()) {
    return "Mañana";
  }

  // Check if it's within this week
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

  if (targetDate <= endOfWeek && targetDate > tomorrow) {
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return days[targetDate.getDay()];
  }

  // Format as dd month
  const day = targetDate.getDate().toString().padStart(2, '0');
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${day} ${months[targetDate.getMonth()]}`;
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Convert HTML to plain text for PDF
function htmlToText(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

export function DayView({ projects, googleEvents = [], selectedTaskId, onTaskClick, hideCompleted = false, onToggleHideCompleted, hidePastDays = false, onToggleHidePastDays }: DayViewProps) {
  
  const exportDayToPDF = (date: Date, tasks: { task: Task; project: Project }[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Title
    const dateStr = date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.setFontSize(16);
    doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`, margin, yPos);
    yPos += 15;

    // Tasks
    tasks.forEach(({ task, project }, index) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Project name and task title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const taskTitle = `${task.completed ? '✓ ' : ''}[${project.name}] - ${task.title}`;
      const lines = doc.splitTextToSize(taskTitle, pageWidth - 2 * margin);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 7;

      // Duration and time tracked
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Duración: ${formatDuration(task.duration_minutes)} | Tiempo registrado: ${formatDuration(task.time_tracked_minutes)}`, margin + 5, yPos);
      yPos += 7;
      doc.setTextColor(0);

      // Description
      if (task.description) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        const descText = htmlToText(task.description);
        const descLines = doc.splitTextToSize(`Descripción: ${descText}`, pageWidth - 2 * margin - 5);
        doc.text(descLines, margin + 5, yPos);
        yPos += descLines.length * 5 + 3;
        doc.setFont('helvetica', 'normal');
      }

      // Subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        doc.setFontSize(9);
        doc.text('Subtareas:', margin + 5, yPos);
        yPos += 6;

        task.subtasks.forEach((subtask) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          const subtaskText = `  ${subtask.completed ? '☑' : '☐'} ${subtask.title}`;
          const subtaskLines = doc.splitTextToSize(subtaskText, pageWidth - 2 * margin - 10);
          doc.text(subtaskLines, margin + 10, yPos);
          yPos += subtaskLines.length * 5 + 2;

          // Subtask notes
          if (subtask.notes) {
            doc.setTextColor(100);
            doc.setFontSize(8);
            doc.text('Notas:', margin + 15, yPos);
            yPos += 4;
            doc.setFont('helvetica', 'italic');
            const notesText = htmlToText(subtask.notes);
            const notesLines = doc.splitTextToSize(notesText, pageWidth - 2 * margin - 15);
            doc.text(notesLines, margin + 15, yPos);
            yPos += notesLines.length * 4 + 2;
            doc.setTextColor(0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
          }
        });
        yPos += 3;
      }

      yPos += 8;
    });

    // Save PDF
    const filename = `zenboard_${date.toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const { groupedTasks, unscheduledTasks } = useMemo(() => {
    const tasksWithProject: TaskWithProject[] = [];
    const unscheduled: TaskWithProject[] = [];

    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    projects.forEach((project) => {
      project.tasks.forEach((task) => {
        // Filter out completed tasks if hideCompleted is true
        if (hideCompleted && task.completed) return;
        
        // Filter out past days if hidePastDays is true
        if (hidePastDays && task.start_date) {
          const taskDate = new Date(task.start_date);
          taskDate.setHours(0, 0, 0, 0);
          if (taskDate < today) return;
        }
        
        if (task.start_date) {
          tasksWithProject.push({ task, project });
        } else {
          unscheduled.push({ task, project });
        }
      });
    });

    // Sort by start_date
    tasksWithProject.sort((a, b) => {
      const dateA = new Date(a.task.start_date!).getTime();
      const dateB = new Date(b.task.start_date!).getTime();
      return dateA - dateB;
    });

    // Group by date
    const grouped = new Map<string, { date: Date; tasks: TaskWithProject[] }>();

    tasksWithProject.forEach((item) => {
      const dateKey = getDateKey(item.task.start_date!);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: new Date(item.task.start_date!),
          tasks: [],
        });
      }
      grouped.get(dateKey)!.tasks.push(item);
    });

    return {
      groupedTasks: Array.from(grouped.values()),
      unscheduledTasks: unscheduled,
    };
  }, [projects, hideCompleted, hidePastDays]);

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
  const scheduledCount = totalTasks - unscheduledTasks.length;

  return (
    <div className="space-y-4">
      {/* Summary with hide completed button */}
      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{scheduledCount} programadas</span>
          <span className="opacity-50">·</span>
          <span>{unscheduledTasks.length} sin fecha</span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleHidePastDays && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={onToggleHidePastDays}
              title={hidePastDays ? "Mostrar días pasados" : "Ocultar días pasados"}
            >
              {hidePastDays ? (
                <CalendarDays className="h-3 w-3" />
              ) : (
                <CalendarX className="h-3 w-3" />
              )}
            </Button>
          )}
          {onToggleHideCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={onToggleHideCompleted}
              title={hideCompleted ? "Mostrar completadas" : "Ocultar completadas"}
            >
              {hideCompleted ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Grouped by date */}
      {groupedTasks.map(({ date, tasks }) => {
        // Calculate work, personal, and meeting time separately
        const workMinutes = tasks.reduce((sum, { task, project }) => 
          project.type === 'Trabajo' ? sum + task.duration_minutes : sum, 0);
        const personalMinutes = tasks.reduce((sum, { task, project }) => 
          project.type === 'Personal' ? sum + task.duration_minutes : sum, 0);
        
        // Calculate meeting minutes for this day (only accepted events)
        const dateKey = getDateKey(date.toISOString());
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        let meetingMinutes = 0;
        for (const event of googleEvents) {
          if (event.status !== 'accepted') continue;
          
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          
          // Check if event overlaps with this day
          if (eventStart <= dayEnd && eventEnd >= dayStart) {
            const overlapStart = eventStart > dayStart ? eventStart : dayStart;
            const overlapEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
            const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
            meetingMinutes += overlapMinutes;
          }
        }
        
        const workTrackedMinutes = tasks.reduce((sum, { task, project }) => 
          project.type === 'Trabajo' ? sum + task.time_tracked_minutes : sum, 0);
        const personalTrackedMinutes = tasks.reduce((sum, { task, project }) => 
          project.type === 'Personal' ? sum + task.time_tracked_minutes : sum, 0);
        
        const formatTimeWithTypes = (work: number, meetings: number, personal: number) => {
          const workStr = formatDuration(work);
          const meetingStr = formatDuration(meetings);
          const personalStr = formatDuration(personal);
          
          const parts = [];
          if (workStr && work > 0) parts.push(workStr);
          else if (meetings > 0 || personal > 0) parts.push('0h');
          
          if (meetingStr && meetings > 0) parts.push(meetingStr);
          else if (work > 0 || personal > 0) parts.push('0h');
          
          if (personalStr && personal > 0) parts.push(personalStr);
          else if (work > 0 || meetings > 0) parts.push('0h');
          
          return parts.length > 0 ? parts.join(' / ') : '';
        };
        
        const totalTimeStr = formatTimeWithTypes(workMinutes, meetingMinutes, personalMinutes);
        const totalTrackedStr = workTrackedMinutes > 0 || personalTrackedMinutes > 0 
          ? formatTimeWithTypes(workTrackedMinutes, 0, personalTrackedMinutes)
          : '';
        
        return (
        <div key={getDateKey(date.toISOString())} className="space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h3 className="text-sm font-medium text-foreground/80">
              {formatDateHeader(date)}
            </h3>
            <span className="text-xs text-muted-foreground">
              {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
            </span>
            {totalTimeStr && (
              <>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {totalTimeStr}
                </span>
              </>
            )}
            {totalTrackedStr && (
              <>
                <span className="text-xs text-muted-foreground/60">·</span>
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                  {totalTrackedStr} trabajado
                </span>
              </>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => exportDayToPDF(date, tasks)}
              title="Exportar día a PDF"
            >
              <FileDown className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {tasks.map(({ task, project }) => (
              <TaskItem
                key={task.id}
                task={task}
                projectColor={project.color}
                projectType={project.type}
                projectName={project.name}
                isSelected={selectedTaskId === task.id}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </div>
      );
      })}

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="space-y-1 mt-6">
          <div className="flex items-center gap-2 px-2 py-1.5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Sin programar
            </h3>
            <span className="text-xs text-muted-foreground/60">
              {unscheduledTasks.length} tarea{unscheduledTasks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-0.5 opacity-75">
            {unscheduledTasks.map(({ task, project }) => (
              <TaskItem
                key={task.id}
                task={task}
                projectColor={project.color}
                projectType={project.type}
                projectName={project.name}
                isSelected={selectedTaskId === task.id}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalTasks === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
            <CalendarDays className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Sin tareas</p>
          <p className="text-sm mt-1 opacity-70">Crea tareas en tus proyectos</p>
        </div>
      )}
    </div>
  );
}
