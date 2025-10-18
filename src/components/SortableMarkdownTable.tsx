import { useState, useMemo, useRef, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SortableMarkdownTableProps {
  headers: string[];
  rows: string[][];
  ticketBaseUrl?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export const SortableMarkdownTable = ({ headers, rows, ticketBaseUrl }: SortableMarkdownTableProps) => {
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [columnWidths, setColumnWidths] = useState<number[]>(headers.map(() => 150));
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  const totalResults = sortedRows.length;
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalResults / itemsPerPage);
  
  const paginatedRows = useMemo(() => {
    if (itemsPerPage === -1) return sortedRows;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRows.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRows, currentPage, itemsPerPage]);

  // Calculate empty rows needed to maintain consistent table height
  const emptyRowsCount = useMemo(() => {
    if (itemsPerPage === -1) return 0;
    return Math.max(0, itemsPerPage - paginatedRows.length);
  }, [itemsPerPage, paginatedRows.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, sortColumn, sortDirection]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn === null) return;
      
      const newWidths = [...columnWidths];
      const mouseX = e.clientX;
      const tableRect = tableRef.current?.getBoundingClientRect();
      
      if (tableRect) {
        const relativeX = mouseX - tableRect.left;
        const sumPreviousWidths = columnWidths.slice(0, resizingColumn).reduce((sum, w) => sum + w, 0);
        const newWidth = Math.max(80, relativeX - sumPreviousWidths);
        newWidths[resizingColumn] = newWidth;
        setColumnWidths(newWidths);
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingColumn, columnWidths]);

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

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? -1 : parseInt(value));
  };

  const handleStartResize = (columnIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingColumn(columnIndex);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <TooltipProvider>
      <div className="my-4 w-full space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
          <div className="text-sm text-muted-foreground">
            Showing {itemsPerPage === -1 ? totalResults : Math.min((currentPage - 1) * itemsPerPage + 1, totalResults)} to {itemsPerPage === -1 ? totalResults : Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} results
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
            <Select value={itemsPerPage === -1 ? 'all' : itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div ref={tableRef} className="w-full overflow-x-auto rounded-md border">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead 
                    key={index}
                    className="font-semibold whitespace-nowrap cursor-pointer select-none relative group"
                    style={{ width: columnWidths[index], minWidth: columnWidths[index] }}
                    onClick={() => handleSort(index)}
                  >
                    <div className="flex items-center">
                      {header}
                      {getSortIcon(index)}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30"
                      onMouseDown={(e) => handleStartResize(index, e)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, rowIndex) => (
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
              {Array.from({ length: emptyRowsCount }).map((_, index) => {
                const rowIndex = paginatedRows.length + index;
                const isEven = rowIndex % 2 === 0;
                return (
                  <TableRow 
                    key={`empty-${index}`}
                    className={`pointer-events-none ${isEven ? 'bg-transparent' : 'bg-muted/30'}`}
                  >
                    {headers.map((_, cellIndex) => (
                      <TableCell key={cellIndex} className="border-0">
                        &nbsp;
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <Button
                    key={idx}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[40px]"
                  >
                    {page}
                  </Button>
                ) : (
                  <span key={idx} className="px-2 text-muted-foreground">
                    {page}
                  </span>
                )
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
