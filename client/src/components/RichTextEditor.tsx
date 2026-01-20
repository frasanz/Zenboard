import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function RichTextEditor({ content, onChange, onBlur, placeholder, autoFocus }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:underline cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Escribe algo...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] max-h-[300px] overflow-y-auto px-3 py-2 text-sm leading-relaxed',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="border rounded-lg bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 w-7 p-0 ${editor.isActive('link') ? 'bg-muted' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            addLink();
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

interface RichTextViewerProps {
  content: string;
  onDoubleClick?: () => void;
  placeholder?: string;
}

export function RichTextViewer({ content, onDoubleClick, placeholder }: RichTextViewerProps) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      className="w-full min-h-[100px] px-3 py-2 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors text-sm leading-relaxed"
    >
      {content ? (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <div className="text-muted-foreground italic text-sm">
          {placeholder || 'Doble click para editar...'}
        </div>
      )}
    </div>
  );
}
