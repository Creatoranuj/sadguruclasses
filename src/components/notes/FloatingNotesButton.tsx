import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Button } from "../ui/button";
import { NotesPanel } from "./NotesPanel";

interface FloatingNotesButtonProps {
  lessonId?: string;
}

const FloatingNotesButton = ({ lessonId }: FloatingNotesButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-6"
        onClick={() => setOpen(true)}
        aria-label="Open Notes"
      >
        <StickyNote className="h-6 w-6" />
      </Button>
      <NotesPanel open={open} onOpenChange={setOpen} lessonId={lessonId} />
    </>
  );
};

export { FloatingNotesButton };
export default FloatingNotesButton;
