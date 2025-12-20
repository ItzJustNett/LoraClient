/// <reference path="../electron.d.ts" />
import { create } from 'zustand';
import { GameProfile, Account, MinecraftVersion, DownloadProgress } from '../../shared/types/index';

interface LauncherStore {
  profiles: GameProfile[];
  selectedProfile: GameProfile | null;
  accounts: Account[];
  selectedAccount: Account | null;
  versions: MinecraftVersion[];
  
  isLaunching: boolean;
  isDownloading: boolean;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  gameLogs: string[];

  loadProfiles: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  loadVersions: () => Promise<void>;
  
  selectProfile: (id: string) => Promise<void>;
  createProfile: (data: Omit<GameProfile, 'id' | 'created'>) => Promise<GameProfile>;
  deleteProfile: (id: string) => Promise<void>;
  
  selectAccount: (id: string) => Promise<void>;
  createOfflineAccount: (username: string) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  
  launchGame: (profileId: string) => Promise<void>;
  setDownloadProgress: (progress: DownloadProgress | null) => void;
  addGameLog: (log: string) => void;
  clearGameLogs: () => void;
  setError: (error: string | null) => void;
  setIsLaunching: (isLaunching: boolean) => void;
}

export const useLauncherStore = create<LauncherStore>((set, get) => ({
  profiles: [],
  selectedProfile: null,
  accounts: [],
  selectedAccount: null,
  versions: [],
  
  isLaunching: false,
  isDownloading: false,
  downloadProgress: null,
  error: null,
  gameLogs: [],

  loadProfiles: async () => {
    try {
      if (!window.electronAPI?.profiles) {
        set({ profiles: [], selectedProfile: null });
        return;
      }
      const profiles = await window.electronAPI.profiles.getAll();
      const selected = await window.electronAPI.profiles.getSelected();
      set({ profiles, selectedProfile: selected || null });
    } catch (err) {
      set({ error: 'Profiller yüklenemedi' });
    }
  },

  loadAccounts: async () => {
    try {
      if (!window.electronAPI?.accounts) {
        set({ accounts: [], selectedAccount: null });
        return;
      }
      const accounts = await window.electronAPI.accounts.getAll();
      const selected = await window.electronAPI.accounts.getSelected();
      set({ accounts, selectedAccount: selected || null });
    } catch (err) {
      set({ error: 'Hesaplar yüklenemedi' });
    }
  },

  loadVersions: async () => {
    console.log('loadVersions called');
    console.log('window.electronAPI:', window.electronAPI);
    console.log('window.electronAPI keys:', window.electronAPI ? Object.keys(window.electronAPI) : 'undefined');
    try {
      if (!window.electronAPI?.minecraft) {
        console.warn('electronAPI.minecraft not available');
        set({ versions: [] });
        return;
      }
      console.log('Fetching versions...');
      const versions = await window.electronAPI.minecraft.getReleases();
      console.log('Versions received:', versions?.length, versions?.slice(0, 3));
      set({ versions: versions || [] });
    } catch (err: any) {
      const message = err?.message || 'Sürümler yüklenemedi';
      console.error('Version loading error:', err);
      set({ error: message });
    }
  },

  selectProfile: async (id: string) => {
    if (!window.electronAPI?.profiles) return;
    await window.electronAPI.profiles.setSelected(id);
    const selected = await window.electronAPI.profiles.get(id);
    set({ selectedProfile: selected || null });
  },

  createProfile: async (data) => {
    if (!window.electronAPI?.profiles) {
      throw new Error('Electron API kullanılamıyor');
    }
    const profile = await window.electronAPI.profiles.create(data);
    const profiles = await window.electronAPI.profiles.getAll();
    set({ profiles, selectedProfile: profile });
    return profile;
  },

  deleteProfile: async (id: string) => {
    if (!window.electronAPI?.profiles) return;
    await window.electronAPI.profiles.delete(id);
    await get().loadProfiles();
  },

  selectAccount: async (id: string) => {
    if (!window.electronAPI?.accounts) return;
    await window.electronAPI.accounts.setSelected(id);
    const selected = await window.electronAPI.accounts.getAll();
    const account = selected.find(a => a.id === id);
    set({ selectedAccount: account || null });
  },

  createOfflineAccount: async (username: string) => {
    if (!window.electronAPI?.accounts) {
      throw new Error('Electron API kullanılamıyor');
    }
    const account = await window.electronAPI.accounts.createOffline(username);
    const accounts = await window.electronAPI.accounts.getAll();
    set({ accounts, selectedAccount: account });
    return account;
  },

  deleteAccount: async (id: string) => {
    if (!window.electronAPI?.accounts) return;
    await window.electronAPI.accounts.delete(id);
    await get().loadAccounts();
  },

  launchGame: async (profileId: string) => {
    if (!window.electronAPI?.launch) {
      set({ error: 'Electron API kullanılamıyor' });
      return;
    }
    set({ isLaunching: true, error: null, gameLogs: [] });
    try {
      await window.electronAPI.launch.start(profileId);
    } catch (err: any) {
      set({ error: err.message || 'Oyun başlatılamadı', isLaunching: false });
    }
  },

  setDownloadProgress: (progress) => {
    set({ downloadProgress: progress, isDownloading: progress !== null });
  },

  addGameLog: (log) => {
    set((state) => ({ gameLogs: [...state.gameLogs.slice(-100), log] }));
  },

  clearGameLogs: () => set({ gameLogs: [] }),
  
  setError: (error) => set({ error }),
  
  setIsLaunching: (isLaunching) => set({ isLaunching }),
}));
