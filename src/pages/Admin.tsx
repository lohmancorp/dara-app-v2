import { Settings, Building2, Users, ShieldCheck, Cable, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AdminArea {
  id: string;
  name: string;
  description: string;
  icon: any;
  route: string;
}

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
  const navigate = useNavigate();

  const filteredAreas = adminAreas.filter((area) => {
    const query = searchQuery.toLowerCase();
    return (
      area.name.toLowerCase().includes(query) ||
      area.description.toLowerCase().includes(query)
    );
  });

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
        <div className="mb-6 max-w-md relative">
          <Input
            placeholder="Search admin functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAreas.map((area) => (
            <Card
              key={area.id}
              className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => handleCardClick(area.route)}
            >
              <div className="flex gap-4">
                <div className="flex items-center justify-center p-3 rounded-lg bg-primary/10 h-fit">
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
