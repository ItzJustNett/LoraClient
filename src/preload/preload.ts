import { contextBridge, ipcRenderer } from 'electron';
import { GameProfile, Account, MinecraftVersion, JavaInstallation, DownloadProgress, AppSettings, NewsItem, InstalledVersion, ModLoaderVersion } from '../shared/types/index';

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  java: {
    detect: () => ipcRenderer.invoke('java:detect'),
    getRecommended: (version: string) => ipcRenderer.invoke('java:get-recommended', version),
    download: (majorVersion: number) => ipcRenderer.invoke('java:download', majorVersion),
    getManaged: () => ipcRenderer.invoke('java:get-managed'),
    ensureForMinecraft: (version: string) => ipcRenderer.invoke('java:ensure-for-minecraft', version),
  },

  minecraft: {
    getVersions: () => ipcRenderer.invoke('minecraft:get-versions'),
    getReleases: () => ipcRenderer.invoke('minecraft:get-releases'),
    isInstalled: (versionId: string) => ipcRenderer.invoke('minecraft:is-installed', versionId),
    install: (versionId: string) => ipcRenderer.invoke('minecraft:install', versionId),
    getDir: () => ipcRenderer.invoke('minecraft:get-dir'),
  },

  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:get-all'),
    get: (id: string) => ipcRenderer.invoke('profiles:get', id),
    getSelected: () => ipcRenderer.invoke('profiles:get-selected'),
    setSelected: (id: string) => ipcRenderer.invoke('profiles:set-selected', id),
    create: (data: Omit<GameProfile, 'id' | 'created'>) => ipcRenderer.invoke('profiles:create', data),
    update: (id: string, data: Partial<GameProfile>) => ipcRenderer.invoke('profiles:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    openFolder: (id: string) => ipcRenderer.invoke('profiles:open-folder', id),
  },

  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:get-all'),
    getSelected: () => ipcRenderer.invoke('accounts:get-selected'),
    setSelected: (id: string) => ipcRenderer.invoke('accounts:set-selected', id),
    createOffline: (username: string) => ipcRenderer.invoke('accounts:create-offline', username),
    loginMicrosoft: () => ipcRenderer.invoke('accounts:login-microsoft'),
    refresh: (id: string) => ipcRenderer.invoke('accounts:refresh', id),
    delete: (id: string) => ipcRenderer.invoke('accounts:delete', id),
    hasAccounts: () => ipcRenderer.invoke('accounts:has-accounts'),
    getSkinUrl: (uuid: string) => ipcRenderer.invoke('accounts:get-skin-url', uuid),
  },

  launch: {
    start: (profileId: string) => ipcRenderer.invoke('launch:start', profileId),
    isRunning: () => ipcRenderer.invoke('launch:is-running'),
    kill: () => ipcRenderer.invoke('launch:kill'),
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
    openMinecraftFolder: () => ipcRenderer.invoke('settings:open-minecraft-folder'),
    openLoraClientFolder: () => ipcRenderer.invoke('settings:open-loraclient-folder'),
  },

  news: {
    get: () => ipcRenderer.invoke('news:get'),
    getLatestVersion: () => ipcRenderer.invoke('news:get-latest-version'),
  },

  versions: {
    getInstalled: () => ipcRenderer.invoke('versions:get-installed'),
    delete: (versionId: string) => ipcRenderer.invoke('versions:delete', versionId),
    getSize: (versionId: string) => ipcRenderer.invoke('versions:get-size', versionId),
  },

  modloader: {
    getVersions: (gameVersion: string, loaderType: string) => ipcRenderer.invoke('modloader:get-versions', gameVersion, loaderType),
    install: (gameVersion: string, loaderType: string, loaderVersion: string) => ipcRenderer.invoke('modloader:install', gameVersion, loaderType, loaderVersion),
  },

  on: {
    downloadProgress: (callback: (progress: DownloadProgress) => void) => {
      ipcRenderer.on('download-progress', (_, progress) => callback(progress));
    },
    gameLog: (callback: (log: string) => void) => {
      ipcRenderer.on('game-log', (_, log) => callback(log));
    },
    gameExit: (callback: (code: number | null) => void) => {
      ipcRenderer.on('game-exit', (_, code) => callback(code));
    },
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  java: {
    detect: () => Promise<JavaInstallation[]>;
    getRecommended: (version: string) => Promise<JavaInstallation | null>;
    download: (majorVersion: number) => Promise<JavaInstallation | null>;
    getManaged: () => Promise<JavaInstallation[]>;
    ensureForMinecraft: (version: string) => Promise<JavaInstallation>;
  };
  minecraft: {
    getVersions: () => Promise<MinecraftVersion[]>;
    getReleases: () => Promise<MinecraftVersion[]>;
    isInstalled: (versionId: string) => Promise<boolean>;
    install: (versionId: string) => Promise<void>;
    getDir: () => Promise<string>;
  };
  profiles: {
    getAll: () => Promise<GameProfile[]>;
    get: (id: string) => Promise<GameProfile | undefined>;
    getSelected: () => Promise<GameProfile | undefined>;
    setSelected: (id: string) => Promise<void>;
    create: (data: Omit<GameProfile, 'id' | 'created'>) => Promise<GameProfile>;
    update: (id: string, data: Partial<GameProfile>) => Promise<GameProfile | null>;
    delete: (id: string) => Promise<boolean>;
    openFolder: (id: string) => Promise<void>;
  };
  accounts: {
    getAll: () => Promise<Account[]>;
    getSelected: () => Promise<Account | undefined>;
    setSelected: (id: string) => Promise<void>;
    createOffline: (username: string) => Promise<Account>;
    loginMicrosoft: () => Promise<Account>;
    refresh: (id: string) => Promise<Account | null>;
    delete: (id: string) => Promise<boolean>;
    hasAccounts: () => Promise<boolean>;
    getSkinUrl: (uuid: string) => Promise<string | null>;
  };
  launch: {
    start: (profileId: string) => Promise<void>;
    isRunning: () => Promise<boolean>;
    kill: () => Promise<void>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
    reset: () => Promise<AppSettings>;
    openMinecraftFolder: () => Promise<void>;
    openLoraClientFolder: () => Promise<void>;
  };
  news: {
    get: () => Promise<NewsItem[]>;
    getLatestVersion: () => Promise<{ id: string; type: string } | null>;
  };
  versions: {
    getInstalled: () => Promise<InstalledVersion[]>;
    delete: (versionId: string) => Promise<boolean>;
    getSize: (versionId: string) => Promise<number>;
  };
  modloader: {
    getVersions: (gameVersion: string, loaderType: string) => Promise<ModLoaderVersion[]>;
    install: (gameVersion: string, loaderType: string, loaderVersion: string) => Promise<string>;
  };
  on: {
    downloadProgress: (callback: (progress: DownloadProgress) => void) => void;
    gameLog: (callback: (log: string) => void) => void;
    gameExit: (callback: (code: number | null) => void) => void;
  };
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}