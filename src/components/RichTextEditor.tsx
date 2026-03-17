import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, rows = 3, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    handleInput();
  };

  const isActive = (command: string) => {
    return document.queryCommandState(command);
  };

  const minHeight = Math.max(80, rows * 24);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 p-1 border border-input rounded-t-md bg-muted/50">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }}
          className={cn(
            "p-1.5 rounded hover:bg-accent transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }}
          className={cn(
            "p-1.5 rounded hover:bg-accent transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          "w-full rounded-b-md border border-t-0 border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "overflow-y-auto whitespace-pre-wrap",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none",
          className
        )}
        style={{ minHeight }}
      />
    </div>
  );
};

export default RichTextEditor;
