import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Layout/Header";
import Sidebar from "@/components/Layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, Clock, RefreshCw, Shield, Trash2, Activity,
} from "lucide-react";

interface ErrorLog {
  id: string;
  error_type: string;
  message: string;
  stack_trace: string | null;
  url: string | null;
  resolved: boolean;
  resolution: string | null;
  created_at: string;
}

interface AgentAction {
  id: string;
  action_type: string;
  description: string;
  status: string;
  result: string | null;
  executed_by: string;
  created_at: string;
}

const AdminMonitor = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { navigate("/login"); return; }

    const fetchData = async () => {
      setLoading(true);
      const [errRes, actRes, cfgRes] = await Promise.all([
        supabase.from("error_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("agent_actions").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("agent_config").select("*").eq("id", 1).single(),
      ]);
      setErrors(errRes.data || []);
      setActions(actRes.data || []);
      if (cfgRes.data) setAgentEnabled(cfgRes.data.enabled);
      setLoading(false);
    };
    fetchData();
  }, [authLoading, isAdmin, navigate]);

  const stats = useMemo(() => {
    const total = errors.length;
    const unresolved = errors.filter((e) => !e.resolved).length;
    const last24h = errors.filter((e) => new Date(e.created_at) > new Date(Date.now() - 86400000)).length;
    return { total, unresolved, last24h };
  }, [errors]);

  const handleToggleAgent = async (enabled: boolean) => {
    setAgentEnabled(enabled);
    await supabase.from("agent_config").update({ enabled, updated_at: new Date().toISOString() }).eq("id", 1);
    toast.success(`Monitor agent ${enabled ? "enabled" : "disabled"}`);
  };

  const handleResolve = async (id: string) => {
    await supabase.from("error_logs").update({ resolved: true, resolution: "Manually resolved by admin" }).eq("id", id);
    setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true, resolution: "Manually resolved" } : e)));
    toast.success("Error marked as resolved");
  };

  const handleClearResolved = async () => {
    await supabase.from("error_logs").delete().eq("resolved", true);
    setErrors((prev) => prev.filter((e) => !e.resolved));
    toast.success("Cleared resolved errors");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} userName="Admin" />

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            System Monitor
          </h1>
          <div className="flex items-center gap-3">
            <Label htmlFor="agent-toggle" className="text-sm text-muted-foreground">
              Agent {agentEnabled ? "ON" : "OFF"}
            </Label>
            <Switch id="agent-toggle" checked={agentEnabled} onCheckedChange={handleToggleAgent} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">{stats.unresolved}</p>
              <p className="text-xs text-muted-foreground">Unresolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.last24h}</p>
              <p className="text-xs text-muted-foreground">Last 24h</p>
            </CardContent>
          </Card>
        </div>

        {/* Error Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Error Logs
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleClearResolved}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear Resolved
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {errors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <p>No errors logged. System is healthy! 🎉</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {errors.map((err) => (
                    <div key={err.id} className="px-4 py-3 flex items-start gap-3">
                      <div className={`mt-1 p-1 rounded-full ${err.resolved ? "bg-green-100 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                        {err.resolved ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{err.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{err.error_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(err.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {err.url && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{err.url}</span>}
                        </div>
                      </div>
                      {!err.resolved && (
                        <Button variant="ghost" size="sm" onClick={() => handleResolve(err.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Agent Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Agent Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px]">
              {actions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No agent actions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {actions.map((act) => (
                    <div key={act.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={act.status === "executed" ? "default" : "secondary"} className="text-xs">
                          {act.action_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{act.status}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(act.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">{act.description}</p>
                      {act.result && <p className="text-xs text-muted-foreground mt-0.5">{act.result}</p>}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminMonitor;
