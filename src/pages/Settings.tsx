import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, Lock, Globe, Database, Trash2, Settings as SettingsIcon } from "lucide-react";
import { LanguageCombobox } from "@/components/LanguageCombobox";
import { TimezoneCombobox } from "@/components/TimezoneCombobox";
import { useState } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { PageHeader } from "@/components/PageHeader";

const Settings = () => {
  const { t, setLanguage } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<{ code: string; name: string }>();
  const [selectedTimezone, setSelectedTimezone] = useState<string>();
  
  const handleLanguageSelect = (language: { code: string; name: string }) => {
    setSelectedLanguage(language);
    setLanguage(language.code);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        icon={SettingsIcon}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
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
                <Switch id="email-notifications" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="research-complete">{t("settings.researchComplete")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.researchComplete.description")}
                  </p>
                </div>
                <Switch id="research-complete" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-summary">{t("settings.weeklySummary")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.weeklySummary.description")}
                  </p>
                </div>
                <Switch id="weekly-summary" />
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
                  <Label htmlFor="two-factor">{t("settings.twoFactor")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.twoFactor.description")}
                  </p>
                </div>
                <Switch id="two-factor" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="data-sharing">{t("settings.dataSharing")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.dataSharing.description")}
                  </p>
                </div>
                <Switch id="data-sharing" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center gap-[15px]">
                <Label htmlFor="change-password">{t("settings.password")}</Label>
                <Button 
                  id="change-password"
                  variant="default" 
                  size="sm"
                  aria-label={t("settings.changePassword")}
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
                  onSelect={setSelectedTimezone}
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
                <Button variant="destructive" size="sm">{t("action.delete")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
