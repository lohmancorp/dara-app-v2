import { Library as LibraryIcon, Upload, Search, Filter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const Library = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <LibraryIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Document Library</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Manage and search your research documents
                </p>
              </div>
            </div>
            <Button variant="accent" className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Upload Documents</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
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
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    Document {i}
                  </h3>
                  <p className="text-sm text-muted-foreground">
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
