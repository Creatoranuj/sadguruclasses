import { memo, useMemo, useState } from "react";
import { ExternalLink, Download, Maximize, Minimize, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile, extractArchiveId, extractDocsId } from "@/utils/fileUtils";
import { toast } from "sonner";
import refreshLogo from "@/assets/refresh-logo.png";

interface DriveEmbedViewerProps {
  url: string;
  title?: string;
}

const DriveEmbedViewer = memo(({ url, title }: DriveEmbedViewerProps) => {
  const [downloading, setDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { embedUrl, openUrl, canRender } = useMemo(() => {
    // Google Drive
    if (/drive\.google\.com/.test(url)) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch?.[1] || idParamMatch?.[1];
      if (fileId) {
        return {
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          openUrl: `https://drive.google.com/file/d/${fileId}/view`,
          canRender: true,
        };
      }
    }

    // Google Docs
    const docsId = extractDocsId(url);
    if (docsId) {
      return {
        embedUrl: `https://docs.google.com/document/d/${docsId}/preview`,
        openUrl: `https://docs.google.com/document/d/${docsId}/edit`,
        canRender: true,
      };
    }

    // Archive.org
    const archiveId = extractArchiveId(url);
    if (archiveId) {
      return {
        embedUrl: `https://archive.org/embed/${archiveId}`,
        openUrl: `https://archive.org/details/${archiveId}`,
        canRender: true,
      };
    }

    // Direct PDF
    if (/\.pdf($|\?)/i.test(url)) {
      return { embedUrl: url, openUrl: url, canRender: true };
    }

    return { embedUrl: url, openUrl: url, canRender: false };
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

  if (!canRender) return null;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-background flex flex-col"
          : "relative w-full rounded-xl overflow-hidden border border-border bg-card flex flex-col"
      }
      style={isFullscreen ? undefined : { height: "calc(100dvh - 44px)" }}
    >
      {/* Header bar */}
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
            title="Download"
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

      {/* Iframe */}
      <div className="relative flex-1 min-h-0">
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title={title || "Document Preview"}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          loading="eager"
        />
        {/* Branding bar */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-1.5 select-none pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          <img src={refreshLogo} alt="" className="h-5 w-5 rounded" draggable={false} />
          <span className="text-white text-xs font-semibold tracking-wide">
            Sadguru Coaching Classes
          </span>
        </div>
      </div>
    </div>
  );
});

DriveEmbedViewer.displayName = "DriveEmbedViewer";

export default DriveEmbedViewer;
