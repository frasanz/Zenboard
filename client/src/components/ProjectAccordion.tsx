import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Pencil, GripVertical, EyeOff, Eye } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskItem } from "./TaskItem";
import {
  Project,
  Task,
  useUpdateProject,
  useDeleteProject,
  useCreateTask,
} from "@/hooks/useApi";

interface SortableProjectItemProps {
  project: Project;
  isEditing: boolean;
  editingName: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onDelete: () => void;
  newTaskInput: string;
  onNewTaskInputChange: (value: string) => void;
  onAddTask: () => void;
  selectedTaskId?: number | null;
  onTaskClick?: (task: Task) => void;
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
  onAddToCalendar?: (taskId: number) => void;
}

function SortableProjectItem({
  project,
  isEditing,
  editingName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onDelete,
  newTaskInput,
  onNewTaskInputChange,
  onAddTask,
  selectedTaskId,
  onTaskClick,
  hideCompleted,
  onToggleHideCompleted,
  onAddToCalendar,
}: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `project-${project.id}`,
    data: { type: "project", project },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const visibleTasks = hideCompleted 
    ? project.tasks.filter(t => !t.completed)
    : project.tasks;
  const taskIds = visibleTasks.map((t) => `task-${t.id}`);

  // Calculate total tracked time and total estimated time
  const totalTrackedMinutes = project.tasks.reduce((sum, task) => sum + task.time_tracked_minutes, 0);
  const totalEstimatedMinutes = project.tasks.reduce((sum, task) => sum + task.duration_minutes, 0);
  
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={`project-${project.id}`}>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-muted rounded p-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: project.color,
              ...(project.type === "Personal" && {
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  ${project.color},
                  ${project.color} 2px,
                  white 2px,
                  white 4px
                )`
              })
            }}
          />
          {isEditing ? (
            <Input
              value={editingName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="h-8 flex-1"
              autoFocus
            />
          ) : (
            <AccordionTrigger className="flex-1 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">
                  {project.tasks.filter(t => t.completed).length}/{project.tasks.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(totalTrackedMinutes)} / {formatTime(totalEstimatedMinutes)}
                </span>
              </div>
            </AccordionTrigger>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHideCompleted();
            }}
            title={hideCompleted ? "Mostrar completadas" : "Ocultar completadas"}
          >
            {hideCompleted ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
        </div>
        <AccordionContent>
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {visibleTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projectColor={project.color}
                projectType={project.type}
                isSelected={selectedTaskId === task.id}
                onTaskClick={onTaskClick}                onAddToCalendar={onAddToCalendar}              />
            ))}
          </SortableContext>

          <div className="flex items-center gap-2 mt-2 px-2">
            <Input
              value={newTaskInput}
              onChange={(e) => onNewTaskInputChange(e.target.value)}
              placeholder="Add task..."
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddTask();
              }}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onAddTask}
              disabled={!newTaskInput.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

interface ProjectAccordionProps {
  projects: Project[];
  selectedTaskId?: number | null;
  onTaskClick?: (task: Task) => void;
  onAddToCalendar?: (taskId: number) => void;
}

export function ProjectAccordion({ projects, selectedTaskId, onTaskClick, onAddToCalendar }: ProjectAccordionProps) {
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newTaskInputs, setNewTaskInputs] = useState<Record<number, string>>({});
  const [hideCompletedMap, setHideCompletedMap] = useState<Record<number, boolean>>({});
  const [openProjects, setOpenProjects] = useState<string[]>(projects.map(p => `project-${p.id}`));
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();

  // Listen for collapse all event
  useEffect(() => {
    const handleCollapseAll = () => {
      setOpenProjects([]);
    };

    window.addEventListener('collapseAllTasks', handleCollapseAll);
    return () => window.removeEventListener('collapseAllTasks', handleCollapseAll);
  }, []);

  const handleStartEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleSaveEdit = (projectId: number) => {
    if (editingName.trim()) {
      updateProject.mutate({ id: projectId, name: editingName.trim() });
    }
    setEditingProjectId(null);
    setEditingName("");
  };

  const handleDeleteProject = (projectId: number) => {
    if (confirm("Delete this project and all its tasks?")) {
      deleteProject.mutate(projectId);
    }
  };

  const handleAddTask = (projectId: number) => {
    const title = newTaskInputs[projectId]?.trim();
    if (title) {
      createTask.mutate({ project_id: projectId, title });
      setNewTaskInputs({ ...newTaskInputs, [projectId]: "" });
    }
  };

  const handleToggleHideCompleted = (projectId: number) => {
    setHideCompletedMap({
      ...hideCompletedMap,
      [projectId]: !hideCompletedMap[projectId],
    });
  };

  const projectIds = projects.map((p) => `project-${p.id}`);

  return (
    <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
      <Accordion type="multiple" value={openProjects} onValueChange={setOpenProjects}>
        {projects.map((project) => (
          <SortableProjectItem
            key={project.id}
            project={project}
            isEditing={editingProjectId === project.id}
            editingName={editingName}
            onStartEdit={() => handleStartEdit(project)}
            onSaveEdit={() => handleSaveEdit(project.id)}
            onCancelEdit={() => setEditingProjectId(null)}
            onEditNameChange={setEditingName}
            onDelete={() => handleDeleteProject(project.id)}
            newTaskInput={newTaskInputs[project.id] || ""}
            onNewTaskInputChange={(value) =>
              setNewTaskInputs({ ...newTaskInputs, [project.id]: value })
            }
            onAddTask={() => handleAddTask(project.id)}
            selectedTaskId={selectedTaskId}
            onTaskClick={onTaskClick}
            hideCompleted={!!hideCompletedMap[project.id]}
            onToggleHideCompleted={() => handleToggleHideCompleted(project.id)}
            onAddToCalendar={onAddToCalendar}
          />
        ))}
      </Accordion>
    </SortableContext>
  );
}
