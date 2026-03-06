import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link,
  Save,
  FileText,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

interface ObsidianNotesProps {
  lessonId: string;
  userId?: string;
  lessonTitle?: string;
}

/**
 * Obsidian-style Notes Component
 * 
 * Features:
 * - Markdown editing with toolbar
 * - Auto-generate bullets, headings, callouts
 * - Backlinks support
 * - Saves to Supabase lecture_notes table
 */
const ObsidianNotes: React.FC<ObsidianNotesProps> = ({
  lessonId,
  userId,
  lessonTitle = 'Untitled Lesson',
}) => {
  const [markdown, setMarkdown] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load existing notes
  useEffect(() => {
    const loadNotes = async () => {
      if (!userId || !lessonId) return;
      
      const { data, error } = await supabase
        .from('lecture_notes')
        .select('markdown')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setMarkdown(data.markdown);
      } else {
        // Initialize with template
        setMarkdown(generateTemplate(lessonTitle));
      }
    };

    loadNotes();
  }, [lessonId, userId, lessonTitle]);

  const generateTemplate = (title: string): string => {
    return `# ${title}

## 📋 Key Concepts
- 

## 📝 Notes
- 

## 💡 Important Points
> [!note] Remember
> 

## 🔗 Related Topics
- [[Topic 1]]
- [[Topic 2]]

## ❓ Questions
- 

---
*Last updated: ${new Date().toLocaleDateString()}*
`;
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('notes-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    
    setMarkdown(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const saveNotes = async () => {
    if (!userId) {
      toast({
        title: 'Login Required',
        description: 'Please login to save your notes',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    const { error } = await supabase
      .from('lecture_notes')
      .upsert({
        lesson_id: lessonId,
        user_id: userId,
        markdown: markdown,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'lesson_id,user_id',
      });

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error saving notes',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Notes saved!',
        description: 'Your notes have been saved successfully',
      });
    }
  };

  const autoGenerateNotes = () => {
    const template = `# ${lessonTitle}

## 📋 Summary
- Main topic covered in this lecture
- Key definitions and concepts

## 📝 Detailed Notes

### Section 1: Introduction
- Point 1
- Point 2

### Section 2: Core Concepts
- Concept A
  - Sub-point
  - Sub-point
- Concept B

### Section 3: Examples
1. Example 1
2. Example 2
3. Example 3

## 💡 Key Takeaways
> [!important]
> Remember these key points from the lecture

- Takeaway 1
- Takeaway 2
- Takeaway 3

## 🔗 Backlinks
- [[Previous Lesson]]
- [[Related Topic]]
- [[Next Lesson]]

## ❓ Review Questions
1. Question 1?
2. Question 2?
3. Question 3?

---
📅 Date: ${new Date().toLocaleDateString()}
⏱️ Duration: See video player
`;
    setMarkdown(template);
    toast({
      title: 'Template Generated',
      description: 'Obsidian-style notes template has been created',
    });
  };

  // Sanitized markdown to HTML renderer using DOMPurify
  const renderMarkdown = (text: string): string => {
    // First sanitize raw text to strip any HTML tags before markdown processing
    const sanitizedInput = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    
    // Then do markdown transformations on sanitized text
    let html = sanitizedInput
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Callouts
      .replace(/>\s*\[!(\w+)\]\s*(.*)/g, '<div class="p-3 my-2 rounded-lg bg-primary/10 border-l-4 border-primary"><span class="font-semibold text-primary">$1:</span> $2</div>')
      // Blockquotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-muted-foreground/30 pl-4 italic my-2">$1</blockquote>')
      // Unordered lists
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Backlinks [[link]]
      .replace(/\[\[(.*?)\]\]/g, '<span class="text-primary bg-primary/10 px-1 rounded cursor-pointer hover:underline">[[$1]]</span>')
      // Code blocks
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="my-4 border-border">')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Final sanitize pass to ensure no XSS
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'div', 'span', 'blockquote', 'li', 'code', 'hr', 'br'],
      ALLOWED_ATTR: ['class'],
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lecture Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoGenerateNotes}
              className="gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Auto-Generate
            </Button>
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={isSaving}
              className="gap-1"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap gap-1 mb-3 p-2 bg-muted/50 rounded-lg">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('**', '**')}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('*', '*')}>
              <Italic className="w-4 h-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('# ')}>
              <Heading1 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('## ')}>
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('### ')}>
              <Heading3 className="w-4 h-4" />
            </Button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- ')}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('1. ')}>
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('> ')}>
              <Quote className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('`', '`')}>
              <Code className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('[[', ']]')}>
              <Link className="w-4 h-4" />
            </Button>
          </div>

          {/* Toggle between Edit and Preview */}
          <div className="flex gap-2 mb-3">
            <Button 
              variant={isEditing ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button 
              variant={!isEditing ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Preview
            </Button>
          </div>

          {/* Editor or Preview */}
          {isEditing ? (
            <Textarea
              id="notes-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Start taking notes... Use Markdown formatting"
              className="min-h-[400px] font-mono text-sm resize-y"
            />
          ) : (
            <div 
              className="min-h-[400px] p-4 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ObsidianNotes;
