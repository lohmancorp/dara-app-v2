import { useState, useMemo, useRef, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, Settings2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { utils, writeFile } from "xlsx";

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
  
  // Download dialog state
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState("tickets");
  
  // Column selection state
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<boolean[]>(headers.map(() => true));
  
  // Find description column index (check for both 'description' and 'description_text')
  const descriptionIndex = headers.findIndex(h => h.toLowerCase() === 'description' || h.toLowerCase() === 'description_text');
  const subjectIndex = headers.findIndex(h => h.toLowerCase() === 'subject');
  
  // Define which columns should be hidden by default
  const hiddenByDefaultColumns = [
    'description', 
    'description_text',
    'created_at', 
    'updated_at', 
    'type', 
    'escalated', 
    'module', 
    'score', 
    'ticket_type',
    'department',
    'group',
    'source',
    'due_by',
    'fr_due_by',
    'requester_id',
    'responder_id',
    'workspace_id',
    'category',
    'sub_category',
    'item_category',
    'is_escalated',
    'fr_escalated',
    'priority_value'
  ];
  
  // Hide specified columns by default
  useEffect(() => {
    const newVisible = headers.map((header) => 
      !hiddenByDefaultColumns.some(hidden => header.toLowerCase().includes(hidden.toLowerCase()))
    );
    setVisibleColumns(newVisible);
  }, [headers.join(',')]); // Depend on headers changing
  
  // Filter headers and adjust column widths based on visible columns
  const visibleHeaders = headers.filter((_, index) => visibleColumns[index]);
  const visibleColumnWidths = columnWidths.filter((_, index) => visibleColumns[index]);

  const sortedRows = useMemo(() => {
    if (sortColumn === null || sortDirection === null) {
      return rows;
    }

    // Priority ordering map
    const priorityOrder: Record<string, number> = {
      'urgent': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    // Check if we're sorting by priority column
    const sortingByPriority = headers[sortColumn]?.toLowerCase() === 'priority';

    return [...rows].sort((a, b) => {
      let aVal = a[sortColumn] || '';
      let bVal = b[sortColumn] || '';
      
      // Special handling for priority column
      if (sortingByPriority) {
        const aPriority = priorityOrder[aVal.toLowerCase()] || 0;
        const bPriority = priorityOrder[bVal.toLowerCase()] || 0;
        return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      }
      
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
  }, [rows, sortColumn, sortDirection, headers]);
  
  // Filter rows to only include visible columns
  const filteredRows = useMemo(() => {
    return sortedRows.map(row => row.filter((_, index) => visibleColumns[index]));
  }, [sortedRows, visibleColumns]);

  const totalResults = filteredRows.length;
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalResults / itemsPerPage);
  
  const paginatedRows = useMemo(() => {
    if (itemsPerPage === -1) return filteredRows;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  // Calculate empty rows needed to maintain consistent table height
  const emptyRowsCount = useMemo(() => {
    if (itemsPerPage === -1) return 0;
    // Use the minimum of itemsPerPage and total rows as the target height
    const targetRowCount = Math.min(itemsPerPage, filteredRows.length);
    return Math.max(0, targetRowCount - paginatedRows.length);
  }, [itemsPerPage, paginatedRows.length, filteredRows.length]);

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
  
  const handleDownload = () => {
    // Create worksheet from visible data
    const wsData = [headers.filter((_, i) => visibleColumns[i]), ...filteredRows];
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Tickets");
    writeFile(wb, `${downloadFileName}.xlsx`);
    setShowDownloadDialog(false);
  };
  
  const toggleColumn = (index: number) => {
    setVisibleColumns(prev => {
      const newVisible = [...prev];
      newVisible[index] = !newVisible[index];
      return newVisible;
    });
  };

  return (
    <TooltipProvider>
      <div className="my-4 w-full space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1">
          <div className="text-sm text-muted-foreground">
            Showing {itemsPerPage === -1 ? totalResults : Math.min((currentPage - 1) * itemsPerPage + 1, totalResults)} to {itemsPerPage === -1 ? totalResults : Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} results
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowColumnDialog(true)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Select Columns</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setShowDownloadDialog(true)}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download XLSX</TooltipContent>
            </Tooltip>
            
            <Select value={itemsPerPage === -1 ? 'all' : itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-[75px]">
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
          <Table className="w-full min-w-[600px]">
            <TableHeader className="bg-[#9E9E9E]">
              <TableRow className="border-b-2 border-border hover:bg-[#9E9E9E]">
                {visibleHeaders.map((header, displayIndex) => {
                  // Map display index back to original index
                  const originalIndex = headers.findIndex((h, i) => visibleColumns[i] && headers.filter((_, j) => j <= i && visibleColumns[j]).length === displayIndex + 1);
                  return (
                    <TableHead 
                      key={displayIndex}
                      className="font-semibold whitespace-nowrap cursor-pointer select-none relative group text-xs sm:text-sm px-2 sm:px-4 text-white"
                      style={{ width: visibleColumnWidths[displayIndex], minWidth: visibleColumnWidths[displayIndex] }}
                      onClick={() => handleSort(originalIndex)}
                    >
                      <div className="flex items-center">
                        {header}
                        {getSortIcon(originalIndex)}
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30"
                        onMouseDown={(e) => handleStartResize(displayIndex, e)}
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row, rowIndex) => {
                // Get the full row from sortedRows to access description
                const fullRow = sortedRows[(currentPage - 1) * (itemsPerPage === -1 ? sortedRows.length : itemsPerPage) + rowIndex];
                
                return (
                  <TableRow 
                    key={rowIndex}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {row.map((cell, cellIndex) => {
                      // Map cellIndex back to original column index
                      const visibleIndices = visibleColumns.map((v, i) => v ? i : -1).filter(i => i !== -1);
                      const originalIndex = visibleIndices[cellIndex];
                      
                      const isTicketId = /^\d+$/.test(cell) && cell.length > 3;
                      const isSubject = originalIndex === subjectIndex;
                      const needsTooltip = cell.length > 50 || isSubject;
                      
                      // Check if this is the score column and handle N/A values
                      const isScoreColumn = headers[originalIndex]?.toLowerCase() === 'score';
                      const isEmptyOrNA = !cell || cell.trim() === '' || cell.trim().toUpperCase() === 'N/A';
                      
                      if (isTicketId && ticketBaseUrl) {
                        return (
                          <TableCell key={cellIndex} className="max-w-[150px] text-xs sm:text-sm px-2 sm:px-4">
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
                        // For subject column, include description in tooltip
                        const tooltipContent = isSubject && descriptionIndex !== -1 && fullRow
                          ? `${fullRow[subjectIndex]}\n\n${fullRow[descriptionIndex]?.substring(0, 500) || ''}`
                          : cell.substring(0, 500);
                        
                        // Clean up trailing backslashes (markdown escape characters)
                        let cleanCell = cell.replace(/\\\s*$/, '');
                        
                        // Replace N/A with 0 for score column
                        if (isScoreColumn && isEmptyOrNA) {
                          cleanCell = '0';
                        }
                        
                        return (
                          <TableCell key={cellIndex} className="max-w-[300px] text-xs sm:text-sm px-2 sm:px-4">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate cursor-help block">{cleanCell}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md whitespace-pre-wrap">
                                <p className="text-sm">{tooltipContent}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      }
                      
                      // Clean up trailing backslashes (markdown escape characters)
                      let cleanCell = cell.replace(/\\\s*$/, '');
                      
                      // Replace N/A with 0 for score column
                      if (isScoreColumn && isEmptyOrNA) {
                        cleanCell = '0';
                      }
                      
                      return (
                        <TableCell key={cellIndex} className="max-w-[300px] truncate text-xs sm:text-sm px-2 sm:px-4">
                          {cleanCell}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
              {Array.from({ length: emptyRowsCount }).map((_, index) => {
                const rowIndex = paginatedRows.length + index;
                const isEven = rowIndex % 2 === 0;
                return (
                  <TableRow 
                    key={`empty-${index}`}
                    className={`pointer-events-none ${isEven ? 'bg-transparent' : 'bg-muted/30'}`}
                  >
                    {visibleHeaders.map((_, cellIndex) => (
                      <TableCell key={cellIndex} className="border-0 text-xs sm:text-sm px-2 sm:px-4">
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
        
        {/* Download Dialog */}
        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Table</DialogTitle>
              <DialogDescription>
                Enter a name for your Excel file. The file will include all visible columns.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="filename">File Name</Label>
                <Input
                  id="filename"
                  value={downloadFileName}
                  onChange={(e) => setDownloadFileName(e.target.value)}
                  placeholder="tickets"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDownload}>
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Column Selection Dialog */}
        <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Columns</DialogTitle>
              <DialogDescription>
                Choose which columns to display in the table.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4 max-h-[400px] overflow-y-auto">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${index}`}
                    checked={visibleColumns[index]}
                    onCheckedChange={() => toggleColumn(index)}
                  />
                  <Label
                    htmlFor={`col-${index}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {header}
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowColumnDialog(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
