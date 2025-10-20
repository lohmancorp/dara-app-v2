import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const AdminUsers = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Users}
        title="User Management"
        description="Manage user profiles and permissions"
      />
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <p className="text-muted-foreground">User management coming soon...</p>
      </div>
    </div>
  );
};

export default AdminUsers;
