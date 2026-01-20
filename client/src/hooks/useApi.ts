import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

// Types
export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  notes: string | null;
  completed: number;
  order: number;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  start_date: string | null;
  duration_minutes: number;
  order: number;
  completed: number;
  time_tracked_minutes: number;
  tracking_state: 'stopped' | 'started' | 'paused';
  tracking_started_at: string | null;
  created_at: string;
  subtasks: Subtask[];
}

export interface Project {
  id: number;
  name: string;
  type: string;
  color: string;
  order: number;
  created_at: string;
  tasks: Task[];
}

export interface WeeklyPlan {
  id: number;
  week_start_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleCalendarConfig {
  icalUrl: string;
  showEvents: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
  status: 'accepted' | 'declined' | 'tentative';
  isGoogleEvent: boolean;
}

// API functions
async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error("Failed to fetch projects");
  return response.json();
}

async function createProject(data: { name: string; type?: string; color?: string }): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create project");
  return response.json();
}

async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update project");
  return response.json();
}

async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete project");
}

async function createTask(data: {
  project_id: number;
  title: string;
  description?: string;
  start_date?: string;
  duration_minutes?: number;
}): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
}

async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update task");
  return response.json();
}

async function deleteTask(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete task");
}

async function createSubtask(data: { task_id: number; title: string }): Promise<Subtask> {
  const response = await fetch(`${API_BASE}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create subtask");
  return response.json();
}

async function updateSubtask(id: number, data: Partial<Subtask>): Promise<Subtask> {
  const response = await fetch(`${API_BASE}/subtasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update subtask");
  return response.json();
}

async function deleteSubtask(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/subtasks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete subtask");
}

async function reorderItems(items: { type: string; id: number; order: number; parent_id?: number }[]): Promise<void> {
  const response = await fetch(`${API_BASE}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error("Failed to reorder items");
}

async function fetchWeeklyPlan(weekStart: string): Promise<WeeklyPlan> {
  const response = await fetch(`${API_BASE}/weekly-plans/${weekStart}`);
  if (!response.ok) throw new Error("Failed to fetch weekly plan");
  return response.json();
}

async function updateWeeklyPlan(weekStart: string, content: string): Promise<WeeklyPlan> {
  const response = await fetch(`${API_BASE}/weekly-plans/${weekStart}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to update weekly plan");
  return response.json();
}

async function fetchGoogleCalendarConfig(): Promise<GoogleCalendarConfig> {
  const response = await fetch(`${API_BASE}/google-calendar/config`);
  if (!response.ok) throw new Error("Failed to fetch Google Calendar config");
  return response.json();
}

async function updateGoogleCalendarConfig(config: GoogleCalendarConfig): Promise<void> {
  const response = await fetch(`${API_BASE}/google-calendar/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error("Failed to update Google Calendar config");
}

async function fetchGoogleCalendarEvents(): Promise<GoogleCalendarEvent[]> {
  const response = await fetch(`${API_BASE}/google-calendar/events`);
  if (!response.ok) throw new Error("Failed to fetch Google Calendar events");
  return response.json();
}

// Hooks
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Project>) =>
      updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Task>) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Subtask>) =>
      updateSubtask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubtask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useReorder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useWeeklyPlan(weekStart: string) {
  return useQuery({
    queryKey: ["weekly-plan", weekStart],
    queryFn: () => fetchWeeklyPlan(weekStart),
  });
}

export function useUpdateWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weekStart, content }: { weekStart: string; content: string }) =>
      updateWeeklyPlan(weekStart, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", variables.weekStart] });
    },
  });
}

export function useGoogleCalendarConfig() {
  return useQuery({
    queryKey: ["google-calendar-config"],
    queryFn: fetchGoogleCalendarConfig,
  });
}

export function useUpdateGoogleCalendarConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGoogleCalendarConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-config"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
    },
  });
}

export function useGoogleCalendarEvents() {
  return useQuery({
    queryKey: ["google-calendar-events"],
    queryFn: fetchGoogleCalendarEvents,
    refetchInterval: 60 * 1000, // Refetch every 1 minute
  });
}
