import { memo, useMemo, useState } from "react";
import { FileText, ExternalLink, Maximize, Minimize, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/utils/fileUtils";
import { toast } from "sonner";
import mahimaLogo from "@/assets/mahima-academy-logo.png";

interface PdfViewerProps {
  url: string;
  title?: string;
}

const PdfViewer = memo(({ url, title }: PdfViewerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { embedUrl, openUrl } = useMemo(() => {
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = driveMatch?.[1] || driveIdParam?.[1];

    if (fileId || /drive\.google\.com/.test(url)) {
      return {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        openUrl: `https://drive.google.com/file/d/${fileId}/view`,
      };
    }

    if (/\.pdf($|\?)/i.test(url)) {
      return {
        embedUrl: url.includes("#") ? url : `${url}#toolbar=0&navpanes=0`,
        openUrl: url,
      };
    }

    return { embedUrl: url, openUrl: url };
  }, [url]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadFile(url, title ? `${title}.pdf` : undefined);
      toast.success("Download started");
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF iframe — fills remaining space */}
      <div className="relative flex-1 min-h-0">
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title={title || "PDF Document"}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          loading="lazy"
        />

        {/* Branding bar */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-1.5 select-none pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          <img src={mahimaLogo} alt="" className="h-5 w-5 rounded" draggable={false} />
          <span className="text-white text-xs font-semibold tracking-wide">
            Sadguru Coaching Classes
          </span>
        </div>
      </div>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";

export default PdfViewer;
