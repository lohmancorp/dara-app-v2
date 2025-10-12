// Base English resource map for UI translations
export const EN_TRANSLATIONS = {
  // Settings page
  "settings.title": "Settings",
  "settings.description": "Manage your application preferences and account settings",
  
  // Notifications section
  "settings.notifications": "Notifications",
  "settings.notifications.description": "Configure how you receive notifications",
  "settings.emailNotifications": "Email Notifications",
  "settings.emailNotifications.description": "Receive updates via email",
  "settings.researchComplete": "Research Completion",
  "settings.researchComplete.description": "Notify when research tasks complete",
  "settings.weeklySummary": "Weekly Summary",
  "settings.weeklySummary.description": "Receive a weekly activity summary",
  
  // Privacy & Security section
  "settings.privacy": "Privacy & Security",
  "settings.privacy.description": "Manage your privacy and security preferences",
  "settings.twoFactor": "Two-Factor Authentication",
  "settings.twoFactor.description": "Add an extra layer of security",
  "settings.dataSharing": "Data Sharing",
  "settings.dataSharing.description": "Share anonymized usage data",
  "settings.password": "Password",
  "settings.changePassword": "Change Password",
  
  // Regional Settings section
  "settings.regional": "Regional Settings",
  "settings.regional.description": "Configure language and timezone preferences",
  "settings.language": "Language",
  "settings.timezone": "Timezone",
  
  // Data Management section
  "settings.dataManagement": "Data Management",
  "settings.dataManagement.description": "Export or delete your data",
  "settings.exportData": "Export Data",
  "settings.exportData.description": "Download all your research data",
  "action.export": "Export",
  
  // Danger Zone section
  "settings.dangerZone": "Danger Zone",
  "settings.dangerZone.description": "Irreversible actions",
  "settings.deleteAccount": "Delete Account",
  "settings.deleteAccount.description": "Permanently delete your account and all data",
  "action.delete": "Delete",
  
  // Common actions
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.apply": "Apply",
  "action.close": "Close",
  
  // Placeholders
  "placeholder.selectLanguage": "Select language...",
  "placeholder.selectTimezone": "Select timezone...",
  "placeholder.searchLanguages": "Search languages...",
  "placeholder.searchTimezones": "Search timezones...",
  
  // Loading states
  "loading.languages": "Loading languages...",
  "loading.default": "Loading...",
  
  // No results
  "noResults.languages": "No languages found.",
  "noResults.timezones": "No timezones found.",
};

export type TranslationKey = keyof typeof EN_TRANSLATIONS;
