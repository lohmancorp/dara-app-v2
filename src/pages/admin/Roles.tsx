import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const AdminRoles = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={ShieldCheck}
        title="Role Management"
        description="Configure user roles and access levels"
      />
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <p className="text-muted-foreground">Role management coming soon...</p>
      </div>
    </div>
  );
};

export default AdminRoles;
