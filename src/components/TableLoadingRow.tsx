import { Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableLoadingRowProps {
  colSpan: number;
  message?: string;
}

export function TableLoadingRow({ colSpan, message = "Carregando dados..." }: TableLoadingRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
