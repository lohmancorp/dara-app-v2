import { Settings, Building2, Users, ShieldCheck, Cable, X, Search, ArrowUp, ArrowDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminArea {
  id: string;
  name: string;
  description: string;
  icon: any;
  route: string;
}

type SortField = "name" | "id";
type SortDirection = "asc" | "desc";

const adminAreas: AdminArea[] = [
  {
    id: "accounts",
    name: "Accounts",
    description: "Manage organizational accounts and settings",
    icon: Building2,
    route: "/admin/accounts",
  },
  {
    id: "users",
    name: "Users",
    description: "Manage user profiles and permissions",
    icon: Users,
    route: "/admin/users",
  },
  {
    id: "roles",
    name: "Roles",
    description: "Configure user roles and access levels",
    icon: ShieldCheck,
    route: "/admin/roles",
  },
  {
    id: "connections",
    name: "Connections",
    description: "Configure API connections and rate limits",
    icon: Cable,
    route: "/admin/connections",
  },
];

const Admin = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const navigate = useNavigate();

  const filteredAreas = useMemo(() => {
    let filtered = adminAreas.filter((area) => {
      const query = searchQuery.toLowerCase();
      return (
        area.name.toLowerCase().includes(query) ||
        area.description.toLowerCase().includes(query)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "id":
          aVal = a.id.toLowerCase();
          bVal = b.id.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchQuery, sortField, sortDirection]);

  const getSortLabel = () => {
    const labels = {
      name: "Name",
      id: "Type",
    };
    return labels[sortField];
  };

  const handleCardClick = (route: string) => {
    setSearchQuery("");
    navigate(route);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Settings}
        title="Admin Panel"
        description="Manage system settings and configurations"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admin functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={clearSearch}
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
                onClick={() => { setSortField("id"); setSortDirection("asc"); }}
                className={`justify-between ${sortField === "id" && sortDirection === "asc" ? "bg-accent text-white" : ""}`}
              >
                Type
                <ArrowUp className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortField("id"); setSortDirection("desc"); }}
                className={`justify-between ${sortField === "id" && sortDirection === "desc" ? "bg-accent text-white" : ""}`}
              >
                Type
                <ArrowDown className="h-4 w-4 ml-2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-6">
          Showing {filteredAreas.length} of {adminAreas.length} functions
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredAreas.map((area) => (
            <Card
              key={area.id}
              className="p-6 hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
              onClick={() => handleCardClick(area.route)}
            >
              <div className="flex gap-4">
                <div className="flex items-center justify-center p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors h-fit">
                  <area.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1">{area.name}</h3>
                  <p className="text-sm text-muted-foreground">{area.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredAreas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No admin functions found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
