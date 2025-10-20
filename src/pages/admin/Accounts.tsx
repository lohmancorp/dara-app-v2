import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const AdminAccounts = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={Building2}
        title="Account Management"
        description="Manage organizational accounts and settings"
      />
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <p className="text-muted-foreground">Account management coming soon...</p>
      </div>
    </div>
  );
};

export default AdminAccounts;
