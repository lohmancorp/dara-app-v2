import { Cable, Settings, CheckCircle, AlertCircle, Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import freshserviceIcon from "@/assets/connection-icons/freshservice.svg";
import jiraIcon from "@/assets/connection-icons/jira.png";
import confluenceIcon from "@/assets/connection-icons/confluence.png";
import geminiIcon from "@/assets/connection-icons/gemini.png";
import openaiIcon from "@/assets/connection-icons/openai.png";
import googleAlertsIcon from "@/assets/connection-icons/google-alerts.ico";

type ConnectionType = 'freshservice' | 'jira' | 'confluence' | 'gemini' | 'openai' | 'google_alerts';

interface MCPService {
  id: string;
  service_name: string;
  service_type: ConnectionType;
  description: string | null;
  uses_app_token: boolean;
  is_active: boolean;
  endpoint_template: string | null;
  allow_custom_endpoint: boolean;
  call_delay_ms: number;
  max_retries: number;
  retry_delay_sec: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  tags: string[];
}

const CONNECTION_CONFIGS: Record<ConnectionType, { name: string; description: string; icon: string }> = {
  freshservice: {
    name: "Freshservice",
    description: "IT service management and ticketing system",
    icon: freshserviceIcon,
  },
  jira: {
    name: "Jira",
    description: "Project tracking and agile development platform",
    icon: jiraIcon,
  },
  confluence: {
    name: "Confluence",
    description: "Team collaboration and documentation workspace",
    icon: confluenceIcon,
  },
  gemini: {
    name: "Gemini",
    description: "Google's advanced AI model for reasoning and analysis",
    icon: geminiIcon,
  },
  openai: {
    name: "OpenAI",
    description: "ChatGPT and advanced language models",
    icon: openaiIcon,
  },
  google_alerts: {
    name: "Google Alerts",
    description: "Automated monitoring and notifications for web content",
    icon: googleAlertsIcon,
  },
};

type SortField = "name" | "status";
type SortDirection = "asc" | "desc";

const AdminConnections = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState<MCPService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('mcp_services')
        .select('*')
        .order('service_name', { ascending: true });

      if (error) throw error;
      setServices((data || []) as MCPService[]);
    } catch (error: any) {
      toast({
        title: "Error fetching services",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceByType = (type: ConnectionType) => {
    return services.find(s => s.service_type === type);
  };

  // Filter and sort services - Must be before early return to follow Rules of Hooks
  const filteredAndSortedServices = useMemo(() => {
    // First, map services to include config info
    const servicesWithConfig = Object.entries(CONNECTION_CONFIGS).map(([type, config]) => {
      const service = getServiceByType(type as ConnectionType);
      return service ? { service, config, type: type as ConnectionType } : null;
    }).filter(Boolean) as { service: MCPService; config: typeof CONNECTION_CONFIGS[ConnectionType]; type: ConnectionType }[];

    // Filter by search query
    let filtered = servicesWithConfig.filter(({ service, config }) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        config.name.toLowerCase().includes(query) ||
        config.description.toLowerCase().includes(query) ||
        service.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case "name":
          aVal = a.config.name.toLowerCase();
          bVal = b.config.name.toLowerCase();
          break;
        case "status":
          aVal = a.service.is_active ? 1 : 0;
          bVal = b.service.is_active ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [services, searchQuery, sortField, sortDirection]);

  // Get top 5 tags from all services
  const allTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    services.forEach(service => {
      service.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [services]);

  // Filter by selected tags
  const tagFilteredServices = useMemo(() => {
    if (selectedFilters.length === 0) return filteredAndSortedServices;
    
    return filteredAndSortedServices.filter(({ service }) => {
      return selectedFilters.every(filter => service.tags?.includes(filter));
    });
  }, [filteredAndSortedServices, selectedFilters]);

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearFilters = () => {
    setSelectedFilters([]);
  };

  const getSortLabel = () => {
    const labels = {
      name: "Name",
      status: "Status",
    };
    return labels[sortField];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          icon={Cable}
          title="Connection Management"
          description="Configure connection settings and API rate limits"
        />
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">Loading services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Cable}
        title="Connection Management"
        description="Configure connection settings and API rate limits"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Search and Sort Controls */}
        <div className="mb-6 flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {getSortLabel()}
                {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              <DropdownMenuItem
                onClick={() => { setSortField("name"); setSortDirection("asc"); }}
                className={sortField === "name" && sortDirection === "asc" ? "bg-accent text-white" : ""}
              >
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("name"); setSortDirection("desc"); }}
                className={sortField === "name" && sortDirection === "desc" ? "bg-accent text-white" : ""}
              >
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("status"); setSortDirection("asc"); }}
                className={`justify-between ${sortField === "status" && sortDirection === "asc" ? "bg-accent text-white" : ""}`}
              >
                Status
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("status"); setSortDirection("desc"); }}
                className={`justify-between ${sortField === "status" && sortDirection === "desc" ? "bg-accent text-white" : ""}`}
              >
                Status
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Tags */}
        {allTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedFilters.includes(tag) ? "default" : "outline"}
                className="cursor-pointer py-[2px]"
                onClick={() => toggleFilter(tag)}
              >
                {tag}
              </Badge>
            ))}
            {selectedFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto min-h-0 px-2.5 py-[2px] text-xs font-semibold gap-1 leading-none"
              >
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-6">
          Showing {tagFilteredServices.length} of {services.length} connections
        </div>

        {/* Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tagFilteredServices.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Cable className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No connections found matching your search.</p>
            </div>
          ) : (
            tagFilteredServices.map(({ service, config, type }) => (
              <Card 
                key={type} 
                className="hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary cursor-pointer"
                onClick={() => navigate(`/admin/connections/${service.id}`)}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-px rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <img 
                        src={config.icon} 
                        alt={`${config.name} icon`}
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={service.is_active ? "default" : "destructive"}
                        className={`flex items-center gap-1.5 ${
                          service.is_active 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "bg-[#9E9E9E] hover:bg-[#9E9E9E] text-white"
                        }`}
                      >
                        {service.is_active ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span>{service.is_active ? "Enabled" : "Disabled"}</span>
                      </Badge>
                      {service.tags && service.tags.length > 0 && (
                        <Badge variant="default" className="whitespace-nowrap">
                          {service.tags[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {config.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      {service.uses_app_token ? "App Token" : "User Token"}
                    </div>
                    <Settings className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminConnections;
