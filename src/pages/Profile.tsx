import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Briefcase, MapPin, Loader2, Globe } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  company: z.string().max(100, "Company name must be less than 100 characters").optional(),
  job_title: z.string().max(100, "Job title must be less than 100 characters").optional(),
  location: z.string().max(100, "Location must be less than 100 characters").optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    bio: "",
    company: "",
    job_title: "",
    location: "",
    website: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile exists, create one from auth data
      if (!data) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user?.id,
            email: user?.email || "",
            full_name: user?.user_metadata?.full_name || "",
            avatar_url: user?.user_metadata?.avatar_url || "",
          });

        if (insertError) throw insertError;

        // Set form data from auth user
        setFormData({
          full_name: user?.user_metadata?.full_name || "",
          email: user?.email || "",
          bio: "",
          company: "",
          job_title: "",
          location: "",
          website: "",
          avatar_url: user?.user_metadata?.avatar_url || "",
        });
      } else {
        setFormData({
          full_name: data.full_name || "",
          email: data.email || user?.email || "",
          bio: data.bio || "",
          company: data.company || "",
          job_title: data.job_title || "",
          location: data.location || "",
          website: data.website || "",
          avatar_url: data.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldSave = async (fieldName: keyof typeof formData) => {
    // Skip auto-save for email and avatar_url (read-only fields)
    if (fieldName === "email" || fieldName === "avatar_url") return;

    // Validate form data
    try {
      profileSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.issues.find(issue => issue.path[0] === fieldName);
        if (fieldError) {
          toast({
            title: "Validation Error",
            description: fieldError.message,
            variant: "destructive",
          });
        }
        return;
      }
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          company: formData.company,
          job_title: formData.job_title,
          location: formData.location,
          website: formData.website,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return formData.email?.slice(0, 2).toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={User}
        title="Profile"
        description="Manage your account information and preferences"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Avatar is synced from your authentication provider
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  onBlur={() => handleFieldSave("full_name")}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10 bg-muted"
                    value={formData.email}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update it.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself"
                  className="min-h-[100px]"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  onBlur={() => handleFieldSave("bio")}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>Information about your work and expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="job_title"
                    className="pl-10"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    onBlur={() => handleFieldSave("job_title")}
                    placeholder="e.g. Senior Research Analyst"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  onBlur={() => handleFieldSave("company")}
                  placeholder="e.g. Tech Insights Inc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    className="pl-10"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    onBlur={() => handleFieldSave("location")}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    className="pl-10"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    onBlur={() => handleFieldSave("website")}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
