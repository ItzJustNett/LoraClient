import { TranslationKeys } from './tr';

export const en: TranslationKeys = {
  common: {
    play: 'Play',
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    refresh: 'Refresh',
    clear: 'Clear',
    close: 'Close',
    loading: 'Loading...',
    selected: 'Selected',
    or: 'or',
    beta: 'BETA',
    systemReady: 'System ready',
  },

  nav: {
    home: 'Home',
    profiles: 'Profiles',
    versions: 'Versions',
    settings: 'Settings',
  },

  sidebar: {
    addAccount: 'Add Account',
    login: 'Sign in',
    microsoft: 'Microsoft',
    offline: 'Offline',
  },

  home: {
    title: 'Home',
    subtitle: 'Get started quickly',
    quickStart: 'Quick Start',
    otherProfiles: 'Other Profiles',
    logs: 'Logs',
    launching: 'Launching',
    createProfile: 'Create new profile',
    startPlaying: 'Start playing Minecraft',
  },

  profiles: {
    title: 'Profiles',
    subtitle: 'Manage your game profiles',
    newProfile: 'New Profile',
    noProfiles: 'You haven\'t created any profiles yet',
    createFirst: 'Create your first profile',
    openFolder: 'Open Folder',
    editProfile: 'Edit Profile',
  },

  versions: {
    title: 'Downloaded Versions',
    subtitle: 'Manage installed Minecraft versions',
    noVersions: 'No downloaded versions yet',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Configure launcher settings',
    defaultMemory: 'Default Memory',
    minRam: 'Minimum RAM (MB)',
    maxRam: 'Maximum RAM (MB)',
    application: 'Application',
    closeOnLaunch: 'Close launcher when game starts',
    closeOnLaunchDesc: 'Launcher closes when game opens',
    minimizeOnLaunch: 'Minimize when game starts',
    minimizeOnLaunchDesc: 'Launcher runs in background',
    showSnapshots: 'Show snapshot versions',
    showSnapshotsDesc: 'Shows snapshots when selecting versions',
    folders: 'Folders',
    about: 'About',
    aboutText: 'LoraClient v1.0.0 - Modern Minecraft Launcher',
    language: 'Language',
    languageDesc: 'Select interface language',
  },

  account: {
    title: 'Account Management',
    savedAccounts: 'Saved Accounts',
    addNew: 'Add New Account',
    microsoftLogin: 'Sign in with Microsoft',
    loggingIn: 'Signing in...',
    offlineUsername: 'Offline username',
    addOffline: 'Add Offline Account',
    loginFailed: 'Microsoft login failed',
  },

  profile: {
    title: 'New Profile',
    editTitle: 'Edit Profile',
    name: 'Profile Name',
    namePlaceholder: 'Profile name',
    minecraftVersion: 'Minecraft Version',
    modLoader: 'Mod Loader',
    selectVersion: 'Select version',
    stable: 'Stable',
    minRam: 'Min RAM (MB)',
    maxRam: 'Max RAM (MB)',
  },

  logs: {
    title: 'Game Logs',
    noLogs: 'No logs yet',
  },

  time: {
    neverPlayed: 'Never played',
    justNow: 'Just now',
    hoursAgo: '{count} hours ago',
    daysAgo: '{count} days ago',
    weeksAgo: '{count} weeks ago',
  },

  errors: {
    selectProfile: 'Please select a profile',
  },
};
