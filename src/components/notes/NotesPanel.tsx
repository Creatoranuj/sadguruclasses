import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Plus, FileUp, Trash2, FileText, ArrowLeft } from "lucide-react";
import { useStudentNotes, type StudentNote } from "../../hooks/useStudentNotes";
import { NoteEditor } from "./NoteEditor";
import { FileUploader } from "./FileUploader";
import { useAuth } from "../../contexts/AuthContext";

interface NotesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId?: string;
}

export const NotesPanel = ({ open, onOpenChange, lessonId }: NotesPanelProps) => {
  const { user } = useAuth();
  const { notes, isLoading, createNote, updateNote, deleteNote, uploadFile } = useStudentNotes();
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const handleNewNote = () => {
    setEditingNote({
      id: "",
      user_id: user?.id ?? "",
      title: "Untitled Note",
      content: "",
      lesson_id: lessonId ?? null,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsNew(true);
  };

  const handleSave = (title: string, content: string) => {
    if (isNew) {
      createNote.mutate({ title, content, lessonId });
    } else if (editingNote) {
      updateNote.mutate({ id: editingNote.id, title, content });
    }
    setEditingNote(null);
    setIsNew(false);
  };

  const handleDelete = (id: string) => {
    deleteNote.mutate(id);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            {editingNote ? (
              <Button variant="ghost" size="sm" onClick={() => { setEditingNote(null); setIsNew(false); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <SheetTitle className="text-lg">My Notes</SheetTitle>
            )}
            {!editingNote && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowUploader(true)}>
                  <FileUp className="h-4 w-4 mr-1" /> Upload
                </Button>
                <Button size="sm" onClick={handleNewNote}>
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        {editingNote ? (
          <NoteEditor
            initialTitle={editingNote.title}
            initialContent={editingNote.content ?? ""}
            onSave={handleSave}
            onCancel={() => { setEditingNote(null); setIsNew(false); }}
            isSaving={createNote.isPending || updateNote.isPending}
          />
        ) : (
          <ScrollArea className="flex-1 px-4 py-3">
            {isLoading ? (
              <p className="text-center text-muted-foreground text-sm py-8">Loading notes...</p>
            ) : notes.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">No notes yet. Create your first note!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => { setEditingNote(note); setIsNew(false); }}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate">{note.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {note.file_type ? `📎 ${note.file_type.toUpperCase()} file` : (note.content?.slice(0, 80) || "Empty note")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDate(note.updated_at)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {showUploader && (
          <FileUploader
            open={showUploader}
            onOpenChange={setShowUploader}
            onUpload={(file) => {
              uploadFile.mutate({ file, lessonId });
              setShowUploader(false);
            }}
            isUploading={uploadFile.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
