import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Bot, Plus, Trash2, Save, Settings, MessageSquare, ToggleLeft, ToggleRight, Loader2,
  BookOpen, RefreshCw, Eye
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface ChatbotSettings {
  id: number;
  system_prompt: string;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  enable_mock_help: boolean;
}

interface ChatLog {
  id: string;
  user_id: string | null;
  message: string;
  response: string;
  created_at: string;
}

const ChatbotSettings = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "general" });
  const [addingFaq, setAddingFaq] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); return; }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: settingsData }, { data: faqData }, { data: logsData }] = await Promise.all([
        supabase.from("chatbot_settings").select("*").eq("id", 1).single(),
        supabase.from("chatbot_faq").select("*").order("created_at", { ascending: false }),
        supabase.from("chatbot_logs").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      if (settingsData) setSettings(settingsData as ChatbotSettings);
      setFaqs((faqData || []) as FAQ[]);
      setLogs((logsData || []) as ChatLog[]);
    } catch (e) {
      toast.error("Failed to load chatbot data");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("chatbot_settings")
        .update({
          system_prompt: settings.system_prompt,
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          enable_mock_help: settings.enable_mock_help,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
      toast.success("Chatbot settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setAddingFaq(true);
    try {
      const { data, error } = await supabase
        .from("chatbot_faq")
        .insert(newFaq)
        .select()
        .single();
      if (error) throw error;
      setFaqs(prev => [data as FAQ, ...prev]);
      setNewFaq({ question: "", answer: "", category: "general" });
      toast.success("FAQ added!");
    } catch {
      toast.error("Failed to add FAQ");
    } finally {
      setAddingFaq(false);
    }
  };

  const toggleFaq = async (faq: FAQ) => {
    const { error } = await supabase
      .from("chatbot_faq")
      .update({ is_active: !faq.is_active })
      .eq("id", faq.id);
    if (!error) {
      setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, is_active: !f.is_active } : f));
    }
  };

  const deleteFaq = async (id: string) => {
    const { error } = await supabase.from("chatbot_faq").delete().eq("id", id);
    if (!error) {
      setFaqs(prev => prev.filter(f => f.id !== id));
      toast.success("FAQ deleted");
    }
  };

  const MODEL_OPTIONS = [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "google/gemini-3-flash-preview",
    "openai/gpt-5-mini",
    "openai/gpt-5",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sadguru Sarthi Settings</h1>
            <p className="text-sm text-muted-foreground">सीखने का सच्चा साथी – Configure your AI learning companion</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Settings</TabsTrigger>
            <TabsTrigger value="faq"><BookOpen className="h-4 w-4 mr-2" />FAQ ({faqs.filter(f => f.is_active).length} active)</TabsTrigger>
            <TabsTrigger value="logs"><MessageSquare className="h-4 w-4 mr-2" />Logs ({logs.length})</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            {settings && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Model & Behavior</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <select
                      value={settings.model}
                      onChange={e => setSettings({ ...settings, model: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    >
                      {MODEL_OPTIONS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Uses Lovable AI Gateway — no additional API key needed.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Temperature (0–1)</Label>
                      <Input
                        type="number" min="0" max="1" step="0.1"
                        value={settings.temperature}
                        onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Tokens</Label>
                      <Input
                        type="number" min="100" max="2000" step="50"
                        value={settings.max_tokens}
                        onChange={e => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Mock Test Help</p>
                      <p className="text-xs text-muted-foreground">Allow students to ask for quiz/test help</p>
                    </div>
                    <button onClick={() => setSettings({ ...settings, enable_mock_help: !settings.enable_mock_help })}>
                      {settings.enable_mock_help
                        ? <ToggleRight className="h-8 w-8 text-primary" />
                        : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label>System Prompt (Core Instructions)</Label>
                    <Textarea
                      value={settings.system_prompt}
                      onChange={e => setSettings({ ...settings, system_prompt: e.target.value })}
                      rows={8}
                      className="font-mono text-xs"
                    placeholder="e.g. You are Sadguru Sarthi, a friendly learning companion for Sadguru Coaching Classes. Help students with courses, mock tests, and platform features..."
                    />
                    <p className="text-xs text-muted-foreground">This is the core identity and rules for the chatbot. FAQs and course data are appended automatically.</p>
                  </div>

                  <Button className="w-full" onClick={saveSettings} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input
                    value={newFaq.question}
                    onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                    placeholder="e.g. How do I reset my password?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea
                    value={newFaq.answer}
                    onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                    rows={3}
                    placeholder="Provide a helpful answer..."
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newFaq.category}
                    onChange={e => setNewFaq({ ...newFaq, category: e.target.value })}
                    placeholder="Category (e.g. courses, payment)"
                    className="flex-1"
                  />
                  <Button onClick={addFaq} disabled={addingFaq}>
                    {addingFaq ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add FAQ
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FAQ Entries ({faqs.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {faqs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No FAQs yet. Add some above!
                    </div>
                  ) : (
                    <div className="divide-y">
                      {faqs.map(faq => (
                        <div key={faq.id} className="p-4 flex gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{faq.question}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{faq.category}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleFaq(faq)} title="Toggle active">
                              {faq.is_active
                                ? <ToggleRight className="h-6 w-6 text-primary" />
                                : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                            </button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFaq(faq.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Conversation Logs (Last 50)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {logs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No conversations logged yet.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {logs.map(log => (
                        <div key={log.id} className="p-4 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('en-IN')}
                            {log.user_id && <span className="ml-2 text-primary">· User logged in</span>}
                          </p>
                          <div className="bg-primary/5 rounded-lg px-3 py-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Student:</p>
                            <p className="text-sm">{log.message}</p>
                          </div>
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Chatbot:</p>
                            <p className="text-sm">{log.response}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatbotSettings;
