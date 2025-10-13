import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bell, Lock, Globe, Database, Trash2, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { LanguageCombobox } from "@/components/LanguageCombobox";
import { TimezoneCombobox } from "@/components/TimezoneCombobox";
import { useTranslation } from "@/contexts/TranslationContext";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const passwordSchema = z.object({
  newPassword: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
    .min(12, "Password must be at least 12 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Settings = () => {
  const { t, setLanguage } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [researchCompleteNotifications, setResearchCompleteNotifications] = useState(true);
  const [weeklySummaryNotifications, setWeeklySummaryNotifications] = useState(false);
  const [dataSharing, setDataSharing] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<{ code: string; name: string }>();
  const [selectedTimezone, setSelectedTimezone] = useState<string>();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email_notifications, research_complete_notifications, weekly_summary_notifications, data_sharing, language_code, timezone")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEmailNotifications(data.email_notifications ?? true);
        setResearchCompleteNotifications(data.research_complete_notifications ?? true);
        setWeeklySummaryNotifications(data.weekly_summary_notifications ?? false);
        setDataSharing(data.data_sharing ?? true);
        setSelectedTimezone(data.timezone ?? "UTC");
        if (data.language_code) {
          setLanguage(data.language_code);
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved.",
      });
    } catch (error) {
      console.error("Error updating preference:", error);
      toast({
        title: "Error",
        description: "Failed to save preference.",
        variant: "destructive",
      });
    }
  };
  
  const handleLanguageSelect = (language: { code: string; name: string }) => {
    setSelectedLanguage(language);
    setLanguage(language.code);
    updatePreference("language_code", language.code);
  };

  const handleTimezoneSelect = (timezone: string) => {
    setSelectedTimezone(timezone);
    updatePreference("timezone", timezone);
  };

  const handleChangePassword = async () => {
    try {
      passwordSchema.parse({ newPassword, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // Delete user's profile data
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user?.id);

      if (profileError) throw profileError;

      // Delete user's templates
      await supabase.from("prompt_templates").delete().eq("user_id", user?.id);
      await supabase.from("job_templates").delete().eq("user_id", user?.id);

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been deleted.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={SettingsIcon}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{t("settings.notifications")}</CardTitle>
                  <CardDescription>{t("settings.notifications.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">{t("settings.emailNotifications")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.emailNotifications.description")}
                  </p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={emailNotifications}
                  onCheckedChange={(checked) => {
                    setEmailNotifications(checked);
                    updatePreference("email_notifications", checked);
                  }}
                  disabled={isLoading}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="research-complete">{t("settings.researchComplete")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.researchComplete.description")}
                  </p>
                </div>
                <Switch 
                  id="research-complete" 
                  checked={researchCompleteNotifications}
                  onCheckedChange={(checked) => {
                    setResearchCompleteNotifications(checked);
                    updatePreference("research_complete_notifications", checked);
                  }}
                  disabled={isLoading}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-summary">{t("settings.weeklySummary")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.weeklySummary.description")}
                  </p>
                </div>
                <Switch 
                  id="weekly-summary" 
                  checked={weeklySummaryNotifications}
                  onCheckedChange={(checked) => {
                    setWeeklySummaryNotifications(checked);
                    updatePreference("weekly_summary_notifications", checked);
                  }}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{t("settings.privacy")}</CardTitle>
                  <CardDescription>{t("settings.privacy.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-sharing">{t("settings.dataSharing")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.dataSharing.description")}
                  </p>
                </div>
                <Switch 
                  id="data-sharing" 
                  checked={dataSharing}
                  onCheckedChange={(checked) => {
                    setDataSharing(checked);
                    updatePreference("data_sharing", checked);
                  }}
                  disabled={isLoading}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("settings.password")}</Label>
                  <p className="text-sm text-muted-foreground">
                    Update your password to keep your account secure
                  </p>
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  {t("settings.changePassword")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{t("settings.regional")}</CardTitle>
                  <CardDescription>{t("settings.regional.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language-select">{t("settings.language")}</Label>
                <LanguageCombobox
                  value={selectedLanguage?.code}
                  onSelect={handleLanguageSelect}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="timezone-select">{t("settings.timezone")}</Label>
                <TimezoneCombobox
                  value={selectedTimezone}
                  onSelect={handleTimezoneSelect}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{t("settings.dataManagement")}</CardTitle>
                  <CardDescription>{t("settings.dataManagement.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("settings.exportData")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.exportData.description")}
                  </p>
                </div>
                <Button variant="outline" size="sm">{t("action.export")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <CardTitle className="text-destructive">{t("settings.dangerZone")}</CardTitle>
                  <CardDescription>{t("settings.dangerZone.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("settings.deleteAccount")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.deleteAccount.description")}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  {t("action.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below. Must be at least 12 characters with uppercase, lowercase, and numbers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={isChangingPassword}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data including templates, jobs, and profile information from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
