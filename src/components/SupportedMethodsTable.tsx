import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddMethodWizard } from "./AddMethodWizard";
import { EditMethodModal } from "./EditMethodModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Method {
  name: string;
  description?: string;
  endpoint?: string;
  method?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface SupportedMethodsTableProps {
  methods: Method[];
  type: 'tools' | 'resources';
  serviceId?: string;
  onMethodAdded?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;

export const SupportedMethodsTable = ({ methods, type, serviceId, onMethodAdded }: SupportedMethodsTableProps) => {
  const [sortColumn, setSortColumn] = useState<'name' | 'endpoint' | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  // Filter methods by search query
  const filteredMethods = useMemo(() => {
    if (!searchQuery) return methods;
    
    const query = searchQuery.toLowerCase();
    return methods.filter(method => 
      method.name?.toLowerCase().includes(query) ||
      method.description?.toLowerCase().includes(query) ||
      method.endpoint?.toLowerCase().includes(query)
    );
  }, [methods, searchQuery]);

  // Sort methods
  const sortedMethods = useMemo(() => {
    if (sortColumn === null || sortDirection === null) {
      return filteredMethods;
    }

    return [...filteredMethods].sort((a, b) => {
      const aVal = (a[sortColumn] || '').toLowerCase();
      const bVal = (b[sortColumn] || '').toLowerCase();
      
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [filteredMethods, sortColumn, sortDirection]);

  const totalResults = sortedMethods.length;
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalResults / itemsPerPage);
  
  const paginatedMethods = useMemo(() => {
    if (itemsPerPage === -1) return sortedMethods;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedMethods.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedMethods, currentPage, itemsPerPage]);

  const handleSort = (column: 'name' | 'endpoint') => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: 'name' | 'endpoint') => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? -1 : parseInt(value));
    setCurrentPage(1);
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

  const getParameterCount = (method: Method) => {
    if (!method.inputSchema?.properties) return 0;
    return Object.keys(method.inputSchema.properties).length;
  };

  const getRequiredParameterCount = (method: Method) => {
    if (!method.inputSchema?.required) return 0;
    return method.inputSchema.required.length;
  };

  const handleSaveMethod = async (method: any) => {
    if (!serviceId) return;

    try {
      // Get current config
      const { data: service, error: fetchError } = await supabase
        .from('mcp_services')
        .select(type === 'tools' ? 'tools_config' : 'resources_config')
        .eq('id', serviceId)
        .single();

      if (fetchError) throw fetchError;

      const currentConfig = type === 'tools' 
        ? ((service as any).tools_config || []) 
        : ((service as any).resources_config || []);
      const updatedConfig = [...currentConfig, method];

      // Update service
      const { error: updateError } = await supabase
        .from('mcp_services')
        .update({
          [type === 'tools' ? 'tools_config' : 'resources_config']: updatedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (updateError) throw updateError;

      // Notify parent to refresh
      if (onMethodAdded) {
        onMethodAdded();
      }

      toast({
        title: `${type === 'tools' ? 'Tool' : 'Resource'} added successfully`,
        description: `${method.name} has been added to the configuration.`,
      });
    } catch (error: any) {
      toast({
        title: "Error adding method",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateMethod = async (updatedMethod: any) => {
    if (!serviceId) return;

    try {
      // Get current config
      const { data: service, error: fetchError } = await supabase
        .from('mcp_services')
        .select(type === 'tools' ? 'tools_config' : 'resources_config')
        .eq('id', serviceId)
        .single();

      if (fetchError) throw fetchError;

      const currentConfig = type === 'tools' 
        ? ((service as any).tools_config || []) 
        : ((service as any).resources_config || []);
      
      // Find and replace the method
      const updatedConfig = currentConfig.map((m: any) => 
        m.name === editingMethod?.name ? updatedMethod : m
      );

      // Update service
      const { error: updateError } = await supabase
        .from('mcp_services')
        .update({
          [type === 'tools' ? 'tools_config' : 'resources_config']: updatedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (updateError) throw updateError;

      // Notify parent to refresh
      if (onMethodAdded) {
        onMethodAdded();
      }

      toast({
        title: `${type === 'tools' ? 'Tool' : 'Resource'} updated successfully`,
        description: `${updatedMethod.name} has been updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating method",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMethod = async () => {
    if (!serviceId || !editingMethod) return;

    try {
      // Get current config
      const { data: service, error: fetchError } = await supabase
        .from('mcp_services')
        .select(type === 'tools' ? 'tools_config' : 'resources_config')
        .eq('id', serviceId)
        .single();

      if (fetchError) throw fetchError;

      const currentConfig = type === 'tools' 
        ? ((service as any).tools_config || []) 
        : ((service as any).resources_config || []);
      
      // Remove the method
      const updatedConfig = currentConfig.filter((m: any) => m.name !== editingMethod.name);

      // Update service
      const { error: updateError } = await supabase
        .from('mcp_services')
        .update({
          [type === 'tools' ? 'tools_config' : 'resources_config']: updatedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (updateError) throw updateError;

      // Notify parent to refresh
      if (onMethodAdded) {
        onMethodAdded();
      }

      toast({
        title: `${type === 'tools' ? 'Tool' : 'Resource'} deleted successfully`,
        description: `${editingMethod.name} has been removed from the configuration.`,
      });
    } catch (error: any) {
      toast({
        title: "Error deleting method",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRowDoubleClick = (method: Method) => {
    setEditingMethod(method);
    setIsEditModalOpen(true);
  };

  if (methods.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">
          No {type} configured for this connection.
        </p>
        {serviceId && (
          <AddMethodWizard type={type} onSave={handleSaveMethod} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {serviceId && (
          <AddMethodWizard type={type} onSave={handleSaveMethod} />
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${type}...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {itemsPerPage === -1 ? totalResults : Math.min((currentPage - 1) * itemsPerPage + 1, totalResults)} - {itemsPerPage === -1 ? totalResults : Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
          </div>
          <Select value={itemsPerPage === -1 ? 'all' : itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[75px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Table */}
      <div className="w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="border-b-2 hover:bg-muted">
              <TableHead 
                className="font-semibold cursor-pointer select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Method Name
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer select-none"
                onClick={() => handleSort('endpoint')}
              >
                <div className="flex items-center">
                  Endpoint
                  {getSortIcon('endpoint')}
                </div>
              </TableHead>
              <TableHead className="font-semibold">
                Parameters
              </TableHead>
              <TableHead className="font-semibold">
                Description
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMethods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No {type} found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            ) : (
              paginatedMethods.map((method, index) => (
                <TableRow 
                  key={index} 
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onDoubleClick={() => handleRowDoubleClick(method)}
                  title="Double-click to edit"
                >
                  <TableCell className="font-medium">
                    {method.name || 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                    {method.endpoint || method.method || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getParameterCount(method) > 0 ? (
                      <span>
                        {getParameterCount(method)} total
                        {getRequiredParameterCount(method) > 0 && (
                          <span className="text-muted-foreground"> ({getRequiredParameterCount(method)} required)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-[300px]">
                    {method.description || 'No description available'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2">...</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                onClick={() => setCurrentPage(page as number)}
              >
                {page}
              </Button>
            )
          ))}
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Method Modal */}
      {editingMethod && (
        <EditMethodModal
          method={editingMethod}
          type={type}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={handleUpdateMethod}
          onDelete={handleDeleteMethod}
        />
      )}
    </div>
  );
};