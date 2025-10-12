import { Library as LibraryIcon, Search, Filter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useFloatingAction } from "@/components/AppLayout";
import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";

const Library = () => {
  const { setActionButton } = useFloatingAction();

  useEffect(() => {
    setActionButton(<FloatingActionButton label="Upload Documents" />);
    return () => setActionButton(null);
  }, [setActionButton]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={LibraryIcon}
        title="Document Library"
        description="Manage and search your research documents"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-10" />
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-muted">
                    PDF
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                    Document {i}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem]">
                    Sample research document placeholder
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Added recently
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Library;
