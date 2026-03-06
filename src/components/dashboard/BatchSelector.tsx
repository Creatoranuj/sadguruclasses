import { ChevronDown } from "lucide-react";
import { useBatch } from "@/contexts/BatchContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BatchSelector = () => {
  const { batches, selectedBatch, setSelectedBatch, loading } = useBatch();

  if (loading || batches.length === 0) return null;

  return (
    <div className="w-full">
      <Select
        value={selectedBatch?.id.toString() || ""}
        onValueChange={(val) => {
          const batch = batches.find((b) => b.id.toString() === val);
          if (batch) setSelectedBatch(batch);
        }}
      >
        <SelectTrigger className="w-full bg-card border border-border rounded-xl h-12 px-4 text-base font-semibold text-foreground shadow-sm">
          <div className="flex items-center gap-3">
            {selectedBatch?.image_url && (
              <img
                src={selectedBatch.image_url}
                alt=""
                className="h-7 w-7 rounded-lg object-cover"
              />
            )}
            <SelectValue placeholder="Select Batch" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {batches.map((batch) => (
            <SelectItem key={batch.id} value={batch.id.toString()}>
              <div className="flex items-center gap-3">
                {batch.image_url && (
                  <img
                    src={batch.image_url}
                    alt=""
                    className="h-6 w-6 rounded-md object-cover"
                  />
                )}
                <span>{batch.title}</span>
                {batch.grade && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (Class {batch.grade})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BatchSelector;
