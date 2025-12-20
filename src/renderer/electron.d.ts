import { GameProfile, Account, MinecraftVersion, JavaInstallation, DownloadProgress } from '../shared/types/index';

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  java: {
    detect: () => Promise<JavaInstallation[]>;
    getRecommended: (version: string) => Promise<JavaInstallation | null>;
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
  };
  accounts: {
    getAll: () => Promise<Account[]>;
    getSelected: () => Promise<Account | undefined>;
    setSelected: (id: string) => Promise<void>;
    createOffline: (username: string) => Promise<Account>;
    delete: (id: string) => Promise<boolean>;
    hasAccounts: () => Promise<boolean>;
  };
  launch: {
    start: (profileId: string) => Promise<void>;
    isRunning: () => Promise<boolean>;
    kill: () => Promise<void>;
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

export {};
