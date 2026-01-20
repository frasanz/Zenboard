import { useState } from "react";
import { Plus, FolderPlus, FolderKanban, CalendarDays, Briefcase, Home, Settings, ChevronsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProjectAccordion } from "./ProjectAccordion";
import { DayView } from "./DayView";
import { Project, Task, useCreateProject, useGoogleCalendarConfig, useUpdateGoogleCalendarConfig, useGoogleCalendarEvents } from "@/hooks/useApi";
import { Checkbox } from "@/components/ui/checkbox";

type ViewMode = "projects" | "day";

interface SidebarProps {
  projects: Project[];
  selectedTaskId?: number | null;
  onTaskClick?: (task: Task) => void;
  onAddToCalendar?: (taskId: number) => void;
}

// Zen-inspired muted color palette
const PROJECT_COLORS = [
  "#64748b", // slate
  "#71717a", // zinc
  "#78716c", // stone
  "#6b7280", // gray
  "#059669", // emerald (muted)
  "#0891b2", // cyan (muted)
  "#7c3aed", // violet (muted)
  "#be185d", // pink (muted)
  "#dc2626", // red
  "#ea580c", // orange
  "#d97706", // amber
  "#65a30d", // lime
  "#16a34a", // green
  "#0d9488", // teal
  "#0284c7", // sky
  "#2563eb", // blue
  "#4f46e5", // indigo
  "#9333ea", // purple
  "#c026d3", // fuchsia
  "#e11d48", // rose
];

export function Sidebar({ projects, selectedTaskId, onTaskClick, onAddToCalendar }: SidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("projects");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGoogleConfigOpen, setIsGoogleConfigOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedType, setSelectedType] = useState("Personal");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [hideCompletedInAgenda, setHideCompletedInAgenda] = useState(false);
  const [hidePastDays, setHidePastDays] = useState(false);
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'Trabajo' | 'Personal'>('all');
  const createProject = useCreateProject();
  
  const { data: googleConfig } = useGoogleCalendarConfig();
  const { data: googleEvents = [] } = useGoogleCalendarEvents();
  const updateGoogleConfig = useUpdateGoogleCalendarConfig();
  const [tempIcalUrl, setTempIcalUrl] = useState("");
  const [tempShowEvents, setTempShowEvents] = useState(true);

  const handleOpenGoogleConfig = () => {
    setTempIcalUrl(googleConfig?.icalUrl || "");
    setTempShowEvents(googleConfig?.showEvents ?? true);
    setIsGoogleConfigOpen(true);
  };

  const handleSaveGoogleConfig = () => {
    updateGoogleConfig.mutate({
      icalUrl: tempIcalUrl,
      showEvents: tempShowEvents,
    });
    setIsGoogleConfigOpen(false);
  };

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject.mutate({
        name: newProjectName.trim(),
        type: selectedType,
        color: selectedColor,
      });
      setNewProjectName("");
      setSelectedType("Personal");
      setSelectedColor(PROJECT_COLORS[0]);
      setIsDialogOpen(false);
    }
  };

  const filteredProjects = projectTypeFilter === 'all' 
    ? projects 
    : projects.filter(p => p.type === projectTypeFilter);

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);

  const handleCollapseAll = () => {
    window.dispatchEvent(new CustomEvent('collapseAllTasks'));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with view toggle */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg tracking-tight">
            {viewMode === "projects" ? "Proyectos" : "Agenda"}
          </h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-primary/10 hover:text-primary"
              onClick={handleOpenGoogleConfig}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nuevo
            </Button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
          <button
            onClick={() => setViewMode("projects")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "projects"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderKanban className="h-3.5 w-3.5" />
            Proyectos
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "day"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Agenda
          </button>
        </div>

        {/* Project type filter - only show in projects view */}
        {viewMode === "projects" && (
          <div className="flex gap-1">
            <Button
              variant={projectTypeFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setProjectTypeFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={projectTypeFilter === 'Trabajo' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setProjectTypeFilter('Trabajo')}
            >
              <Briefcase className="h-3.5 w-3.5 mr-1" />
              Trabajo
            </Button>
            <Button
              variant={projectTypeFilter === 'Personal' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setProjectTypeFilter('Personal')}
            >
              <Home className="h-3.5 w-3.5 mr-1" />
              Personal
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {viewMode === "projects"
              ? `${filteredProjects.length} proyecto${filteredProjects.length !== 1 ? 's' : ''}`
              : `${totalTasks} tarea${totalTasks !== 1 ? 's' : ''}`
            }
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            className="h-6 px-2 text-xs"
            title="Colapsar todas las tareas"
          >
            <ChevronsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {viewMode === "projects" ? (
          filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                <FolderPlus className="h-8 w-8 opacity-40" />
              </div>
              <p className="font-medium">Sin proyectos</p>
              <p className="text-sm mt-1 opacity-70">Crea tu primer proyecto</p>
            </div>
          ) : (
            <ProjectAccordion
              projects={filteredProjects}
              selectedTaskId={selectedTaskId}
              onTaskClick={onTaskClick}
              onAddToCalendar={onAddToCalendar}
            />
          )
        ) : (
          <DayView
            projects={projects}
            googleEvents={googleEvents}
            selectedTaskId={selectedTaskId}
            onTaskClick={onTaskClick}
            hideCompleted={hideCompletedInAgenda}
            onToggleHideCompleted={() => setHideCompletedInAgenda(!hideCompletedInAgenda)}
            hidePastDays={hidePastDays}
            onToggleHidePastDays={() => setHidePastDays(!hidePastDays)}
          />
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">Nuevo Proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Nombre</label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="¿En qué estás trabajando?"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject();
                }}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Tipo</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedType === "Personal" ? "default" : "outline"}
                  className="flex-1 rounded-xl"
                  onClick={() => setSelectedType("Personal")}
                >
                  Personal
                </Button>
                <Button
                  type="button"
                  variant={selectedType === "Trabajo" ? "default" : "outline"}
                  className="flex-1 rounded-xl"
                  onClick={() => setSelectedType("Trabajo")}
                >
                  Trabajo
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm text-muted-foreground">Color</label>
              <div className="flex gap-3 flex-wrap">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-9 h-9 rounded-xl transition-all ${
                      selectedColor === color
                        ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-md"
                        : "hover:scale-105 opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="rounded-xl"
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Calendar Configuration Dialog */}
      <Dialog open={isGoogleConfigOpen} onOpenChange={setIsGoogleConfigOpen}>
        <DialogContent className="sm:rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">Configuración Google Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">URL iCal</label>
              <Input
                value={tempIcalUrl}
                onChange={(e) => setTempIcalUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/..."
                className="rounded-xl font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Obtén la URL desde Google Calendar → Configuración → Integrar calendario → Dirección secreta en formato iCal
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-events"
                checked={tempShowEvents}
                onCheckedChange={(checked) => setTempShowEvents(checked as boolean)}
              />
              <label
                htmlFor="show-events"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mostrar eventos en el calendario
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsGoogleConfigOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveGoogleConfig}
              className="rounded-xl"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
