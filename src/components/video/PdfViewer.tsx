import { memo, useMemo, useState, useEffect } from "react";
import { FileText, Maximize, Minimize, Download, Loader2 } from "lucide-react";
import { useDownloads } from "@/hooks/useDownloads";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/utils/fileUtils";
import { toast } from "sonner";
import sadguruLogo from "@/assets/branding/logo_primary_web.png";
import { supabase } from "@/integrations/supabase/client";

interface PdfViewerProps {
  url: string;
  title?: string;
  onDownloaded?: (info: { title: string; url: string; filename: string }) => void;
}

const PdfViewer = memo(({ url, title, onDownloaded }: PdfViewerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { addDownload } = useDownloads();
  const [telegramBlobUrl, setTelegramBlobUrl] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const isTelegramUrl = url?.startsWith('telegram://');

  // Fetch telegram file if needed
  useEffect(() => {
    if (!isTelegramUrl) return;
    const fileId = url.replace('telegram://', '');
    let cancelled = false;

    const fetchTelegramFile = async () => {
      setTelegramLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wegamscqtvqhxowlskfm.supabase.co";

        const res = await fetch(`${supabaseUrl}/functions/v1/telegram-download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id: fileId }),
        });

        if (!res.ok) throw new Error('Failed to fetch PDF from Telegram');
        const blob = await res.blob();
        if (!cancelled) {
          setTelegramBlobUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.error('Telegram PDF fetch error:', err);
        if (!cancelled) toast.error('Failed to load PDF from Telegram storage');
      } finally {
        if (!cancelled) setTelegramLoading(false);
      }
    };

    fetchTelegramFile();
    return () => { cancelled = true; };
  }, [url, isTelegramUrl]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (telegramBlobUrl) URL.revokeObjectURL(telegramBlobUrl);
    };
  }, [telegramBlobUrl]);

  const resolvedUrl = isTelegramUrl ? (telegramBlobUrl || '') : url;

  const { embedUrl, openUrl } = useMemo(() => {
    if (!resolvedUrl) return { embedUrl: '', openUrl: '' };

    const driveMatch = resolvedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveIdParam = resolvedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = driveMatch?.[1] || driveIdParam?.[1];

    if (fileId || /drive\.google\.com/.test(resolvedUrl)) {
      return {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        openUrl: `https://drive.google.com/file/d/${fileId}/view`,
      };
    }

    if (/\.pdf($|\?)/i.test(resolvedUrl) || resolvedUrl.startsWith('blob:')) {
      return {
        embedUrl: resolvedUrl.includes("#") ? resolvedUrl : `${resolvedUrl}#toolbar=0&navpanes=0`,
        openUrl: resolvedUrl,
      };
    }

    return { embedUrl: resolvedUrl, openUrl: resolvedUrl };
  }, [resolvedUrl]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const filename = title ? `${title}.pdf` : "document.pdf";
      await downloadFile(url, filename);
      await addDownload(title || "Document", url, filename, "PDF");
      toast.success("Download started");
      onDownloaded?.({ title: title || "Document", url, filename });
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-background flex flex-col"
          : "relative w-full rounded-xl overflow-hidden border border-border bg-card flex flex-col"
      }
      style={isFullscreen ? undefined : { height: "calc(100dvh - 44px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border shrink-0">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {title || "Document"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            disabled={downloading}
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline text-xs">
              {downloading ? "…" : "Download"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* PDF iframe — fills remaining space */}
      <div className="relative flex-1 min-h-0">
        {telegramLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading PDF from Telegram...</p>
            </div>
          </div>
        ) : embedUrl ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title={title || "PDF Document"}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
        ) : null}

        {/* Sadguru Coaching Classes watermark — bottom-right, semi-transparent */}
        <div
          className="absolute bottom-3 right-3 z-20 select-none pointer-events-none"
          aria-hidden="true"
        >
          <img
            src={sadguruLogo}
            alt=""
            className="h-7 sm:h-9 w-auto opacity-40 drop-shadow-md"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";

export default PdfViewer;
