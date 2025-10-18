import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SortableMarkdownTableProps {
  headers: string[];
  rows: string[][];
  ticketBaseUrl?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export const SortableMarkdownTable = ({ headers, rows, ticketBaseUrl }: SortableMarkdownTableProps) => {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const sortedRows = useMemo(() => {
    if (sortColumn === null || sortDirection === null) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      
      // Try to parse as numbers first
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Otherwise compare as strings
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnIndex);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (columnIndex: number) => {
    if (sortColumn !== columnIndex) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <TooltipProvider>
      <div className="my-4 w-full overflow-x-auto rounded-md border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {headers.map((header, index) => (
                <TableHead 
                  key={index}
                  className="font-semibold whitespace-nowrap cursor-pointer select-none"
                  onClick={() => handleSort(index)}
                >
                  <div className="flex items-center">
                    {header}
                    {getSortIcon(index)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                className="hover:bg-muted/50 transition-colors"
              >
                {row.map((cell, cellIndex) => {
                  const isTicketId = /^\d+$/.test(cell) && cell.length > 3;
                  const needsTooltip = cell.length > 50;
                  
                  if (isTicketId && ticketBaseUrl) {
                    return (
                      <TableCell key={cellIndex} className="max-w-[150px]">
                        <a
                          href={`${ticketBaseUrl}/helpdesk/tickets/${cell}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          {cell}
                        </a>
                      </TableCell>
                    );
                  }
                  
                  if (needsTooltip) {
                    return (
                      <TableCell key={cellIndex} className="max-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate cursor-help block">{cell}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p className="text-sm">{cell.substring(0, 500)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    );
                  }
                  
                  return (
                    <TableCell key={cellIndex} className="max-w-[300px] truncate">
                      {cell}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
