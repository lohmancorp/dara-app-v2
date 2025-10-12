import { Library as LibraryIcon, Upload, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
            <Card key={i} className="hover:shadow-md transition-all cursor-pointer group">
              <div className="p-5 space-y-3">
                <div className="h-40 bg-gradient-to-br from-primary/5 to-accent/5 rounded-md flex items-center justify-center group-hover:from-primary/10 group-hover:to-accent/10 transition-all">
                  <LibraryIcon className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  Document {i}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sample research document placeholder
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-muted rounded">PDF</span>
                  <span className="px-2 py-1 bg-muted rounded">Added recently</span>
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
