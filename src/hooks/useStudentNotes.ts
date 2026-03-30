import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export interface StudentNote {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  lesson_id: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useStudentNotes = (lessonId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["student-notes", user?.id, lessonId];

  const notesQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<StudentNote[]> => {
      if (!user) return [];
      let query = db
        .from("student_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (lessonId) {
        query = query.eq("lesson_id", lessonId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StudentNote[];
    },
    enabled: !!user,
  });

  const createNote = useMutation({
    mutationFn: async (note: { title: string; content: string; lessonId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db
        .from("student_notes")
        .insert({
          user_id: user.id,
          title: note.title,
          content: note.content,
          lesson_id: note.lessonId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as StudentNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-notes"] });
      toast.success("Note saved!");
    },
    onError: () => toast.error("Failed to save note"),
  });

  const updateNote = useMutation({
    mutationFn: async (note: { id: string; title?: string; content?: string }) => {
      const updates: Record<string, string> = {};
      if (note.title !== undefined) updates.title = note.title;
      if (note.content !== undefined) updates.content = note.content;

      const { data, error } = await db
        .from("student_notes")
        .update(updates)
        .eq("id", note.id)
        .select()
        .single();
      if (error) throw error;
      return data as StudentNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-notes"] });
    },
    onError: () => toast.error("Failed to update note"),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await db
        .from("student_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-notes"] });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Failed to delete note"),
  });

  const uploadFile = useMutation({
    mutationFn: async (params: { file: File; lessonId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const ext = params.file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-notes")
        .upload(path, params.file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("student-notes")
        .getPublicUrl(path);

      const { data, error } = await db
        .from("student_notes")
        .insert({
          user_id: user.id,
          title: params.file.name,
          content: "",
          lesson_id: params.lessonId ?? null,
          file_url: urlData.publicUrl,
          file_type: ext,
        })
        .select()
        .single();
      if (error) throw error;
      return data as StudentNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-notes"] });
      toast.success("File uploaded!");
    },
    onError: () => toast.error("Failed to upload file"),
  });

  return {
    notes: notesQuery.data ?? [],
    isLoading: notesQuery.isLoading,
    createNote,
    updateNote,
    deleteNote,
    uploadFile,
  };
};
