import { memo, useMemo, useState, useCallback } from "react";
import { FileText, Maximize, Minimize, Download } from "lucide-react";
import { useDownloads } from "../../hooks/useDownloads";
import { Button } from "../ui/button";
import { downloadFile } from "../../utils/fileUtils";
import { toast } from "sonner";
import { resolveEmbedUrl } from "../../lib/pdfViewerUrl";
import nbLogo from "../../assets/sadguru-logo.png";

interface PdfViewerProps {
  url: string;
  title?: string;
  onDownloaded?: (info: { title: string; url: string; filename: string }) => void;
}

const PdfViewer = memo(({ url, title, onDownloaded }: PdfViewerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { addDownload } = useDownloads();

  const { embedUrl, isDrive } = useMemo(() => resolveEmbedUrl(url), [url]);

  const handleDownload = useCallback(async () => {
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
  }, [url, title, addDownload, onDownloaded]);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-background flex flex-col"
          : "relative w-full rounded-xl overflow-hidden border border-border bg-card flex flex-col"
      }
      style={isFullscreen ? undefined : { height: "calc(100dvh - 44px)" }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border shrink-0">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {title || "Document"}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            disabled={downloading}
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium hidden sm:inline">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="w-full h-full border-0"
          title={title || "PDF Document"}
          allow="fullscreen"
          {...(isDrive
            ? { sandbox: "allow-scripts allow-same-origin allow-popups allow-forms" }
            : {})}
          loading="eager"
        />

        <div
          className="absolute bottom-3 right-3 z-20 select-none pointer-events-none"
          aria-hidden="true"
        >
          <img
            src={nbLogo}
            alt=""
            className="h-7 sm:h-9 w-auto opacity-40 drop-shadow-md"
            draggable={false}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";

export default PdfViewer;
