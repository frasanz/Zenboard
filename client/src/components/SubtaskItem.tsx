import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Subtask, useUpdateSubtask, useDeleteSubtask } from "@/hooks/useApi";
import { RichTextEditor, RichTextViewer } from "./RichTextEditor";

interface SubtaskItemProps {
  subtask: Subtask;
}

export function SubtaskItem({ subtask }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [notes, setNotes] = useState(subtask.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync notes with subtask.notes
  useEffect(() => {
    setNotes(subtask.notes || "");
  }, [subtask.notes]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `subtask-${subtask.id}`,
    data: { type: "subtask", subtask },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleToggleComplete = () => {
    updateSubtask.mutate({
      id: subtask.id,
      completed: subtask.completed ? 0 : 1,
    });
  };

  const handleSaveTitle = () => {
    if (title.trim() && title !== subtask.title) {
      updateSubtask.mutate({ id: subtask.id, title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    if (notes !== subtask.notes) {
      updateSubtask.mutate({ id: subtask.id, notes });
    }
    setIsEditingNotes(false);
  };

  const handleDelete = () => {
    deleteSubtask.mutate(subtask.id);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 group">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>
        
        <button onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        
        <Checkbox
          checked={!!subtask.completed}
          onCheckedChange={handleToggleComplete}
        />
        {isEditing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") {
                setTitle(subtask.title);
                setIsEditing(false);
              }
            }}
            className="h-6 text-xs"
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            className={`text-xs flex-1 cursor-pointer ${
              subtask.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {subtask.title}
          </span>
        )}
        {subtask.notes && (
          <FileText className="h-3 w-3 text-muted-foreground" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      
      {isExpanded && (
        <div className="ml-10 mt-2 mb-2 space-y-2">
          <div className="text-xs text-muted-foreground font-medium mb-1">Notas</div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <RichTextEditor
                content={notes}
                onChange={(newNotes) => {
                  setNotes(newNotes);
                  // Debounce save
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                  }
                  saveTimeoutRef.current = setTimeout(() => {
                    updateSubtask.mutate({ id: subtask.id, notes: newNotes });
                  }, 1000);
                }}
                placeholder="Agregar notas..."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                  }
                  if (notes !== subtask.notes) {
                    updateSubtask.mutate({ id: subtask.id, notes });
                  }
                  setIsEditingNotes(false);
                }}
                className="h-6 text-xs"
              >
                Cerrar
              </Button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              className="text-xs cursor-pointer hover:bg-muted/50 p-2 rounded border min-h-[60px]"
            >
              {notes ? (
                <RichTextViewer content={notes} />
              ) : (
                <span className="text-muted-foreground italic">
                  Click para agregar notas...
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
