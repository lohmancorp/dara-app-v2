import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Mail, Briefcase, MapPin, Loader2, Globe, Upload, RefreshCw, Pencil } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WysiwygEditor } from "@/components/WysiwygEditor";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

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

  const isGoogleAuth = () => {
    return user?.app_metadata?.provider === "google" || user?.app_metadata?.providers?.includes("google");
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    // Check if the click was on an icon button
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setIsModalOpen(true);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Delete old avatar if exists
      if (formData.avatar_url && formData.avatar_url.includes('avatars/')) {
        const oldPath = formData.avatar_url.split('avatars/')[1];
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, avatar_url: publicUrl });
      setIsModalOpen(false);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSyncFromGoogle = async () => {
    if (!isGoogleAuth()) {
      toast({
        title: "Not Available",
        description: "Sync is only available for Google authenticated accounts.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Get fresh user data from Google
      const { data: { user: freshUser }, error: refreshError } = await supabase.auth.getUser();
      
      if (refreshError) throw refreshError;

      const googleAvatarUrl = freshUser?.user_metadata?.avatar_url;
      
      if (!googleAvatarUrl) {
        toast({
          title: "No Google Avatar",
          description: "No avatar found in your Google account.",
          variant: "destructive",
        });
        return;
      }

      // Update profile with Google avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: googleAvatarUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setFormData({ ...formData, avatar_url: googleAvatarUrl });
      setIsModalOpen(false);
      toast({
        title: "Avatar Synced",
        description: "Your profile picture has been synced from Google.",
      });
    } catch (error) {
      console.error('Error syncing avatar:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync avatar from Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
              <div className="flex items-start gap-6">
                <TooltipProvider>
                  <div 
                    className="relative cursor-pointer flex-shrink-0"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    onClick={handleAvatarClick}
                  >
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {isHovering && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 rounded-full">
                        {isGoogleAuth() && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSyncFromGoogle();
                                }}
                                disabled={isUploading}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                              >
                                <RefreshCw className="h-4 w-4 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Sync from Google</TooltipContent>
                          </Tooltip>
                        )}
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUploadClick();
                              }}
                              disabled={isUploading}
                              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                            >
                              <Upload className="h-4 w-4 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Upload new picture</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </TooltipProvider>
                
                <div className="flex-1 space-y-3">
                  <div 
                    className="relative group"
                    onMouseEnter={() => setIsHoveringName(true)}
                    onMouseLeave={() => setIsHoveringName(false)}
                  >
                    {isEditingName ? (
                      <Input
                        ref={nameInputRef}
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        onBlur={() => {
                          setIsEditingName(false);
                          handleFieldSave("full_name");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingName(false);
                            handleFieldSave("full_name");
                          }
                        }}
                        className="text-2xl font-semibold h-auto py-1 px-2"
                      />
                    ) : (
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingName(true)}>
                        <h3 className="text-2xl font-semibold">{formData.full_name}</h3>
                        {isHoveringName && (
                          <Pencil className="h-4 w-4 text-muted-foreground" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }} />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{formData.email}</span>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="font-bold">Bio</Label>
                <WysiwygEditor
                  value={formData.bio}
                  onChange={(value) => setFormData({ ...formData, bio: value })}
                  onBlur={() => handleFieldSave("bio")}
                  placeholder="Tell us about yourself"
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.replace(/<[^>]*>/g, '').length}/500 characters
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

      {/* Avatar Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              <Avatar className="h-48 w-48">
                <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-6xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex gap-3">
              {isGoogleAuth() && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleSyncFromGoogle}
                        disabled={isUploading}
                        className="p-3 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-5 w-5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Sync from Google</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className="p-3 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Upload className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Upload new picture</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              {isGoogleAuth() 
                ? "Sync from Google or upload a custom picture (max 2MB)" 
                : "Upload a custom picture (max 2MB, JPEG/PNG/WebP)"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
