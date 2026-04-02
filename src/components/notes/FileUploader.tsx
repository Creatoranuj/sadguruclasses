import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Upload } from "lucide-react";

interface FileUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => void;
  isUploading: boolean;
}

const ACCEPTED_TYPES = ".md,.pdf,.docx,.pptx,.ppt,.doc,.txt";

export const FileUploader = ({ open, onOpenChange, onUpload, isUploading }: FileUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a File</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <div
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to select a file
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MD, PDF, DOCX, PPTX, TXT
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          {isUploading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
