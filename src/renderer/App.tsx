/// <reference path="./electron.d.ts" />
import React, { useState, useEffect, useCallback } from 'react';
import { useLauncherStore } from './store';
import { GameProfile, Account, AppSettings, NewsItem, InstalledVersion, ModLoaderVersion } from '../shared/types/index';
import { I18nProvider, useI18n, formatTime, Language, TranslationKeys } from './i18n';

type NavItem = 'home' | 'instances' | 'versions' | 'settings';
type VersionType = 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge';

const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [username, setUsername] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedVersionType, setSelectedVersionType] = useState<VersionType>('vanilla');
  const [modLoaderVersions, setModLoaderVersions] = useState<ModLoaderVersion[]>([]);
  const [selectedModLoaderVersion, setSelectedModLoaderVersion] = useState('');
  const [profileMemoryMin, setProfileMemoryMin] = useState(512);
  const [profileMemoryMax, setProfileMemoryMax] = useState(4096);
  const [editingProfile, setEditingProfile] = useState<GameProfile | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [installedVersions, setInstalledVersions] = useState<InstalledVersion[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  const {
    profiles, selectedProfile, selectedAccount, versions, isLaunching, isDownloading,
    downloadProgress, error, gameLogs, loadProfiles, loadAccounts, loadVersions, selectProfile,
    createProfile, deleteProfile, createOfflineAccount, launchGame, setDownloadProgress,
    setError, setIsLaunching, addGameLog, clearGameLogs,
  } = useLauncherStore();

  useEffect(() => {
    loadProfiles(); loadAccounts(); loadVersions();
    loadNews(); loadSettings(); loadInstalledVersions(); loadAllAccounts();
    if (window.electronAPI?.on) {
      window.electronAPI.on.downloadProgress((progress) => setDownloadProgress(progress));
      window.electronAPI.on.gameExit(() => { setIsLaunching(false); setDownloadProgress(null); });
      window.electronAPI.on.gameLog((log) => addGameLog(log));
    }
    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('download-progress');
        window.electronAPI.removeAllListeners('game-exit');
        window.electronAPI.removeAllListeners('game-log');
      }
    };
  }, []);

  const loadNews = async () => {
    try {
      if (window.electronAPI?.news) {
        const newsData = await window.electronAPI.news.get();
        setNews(newsData || []);
      }
    } catch {}
  };

  const loadSettings = async () => {
    try {
      if (window.electronAPI?.settings) {
        const s = await window.electronAPI.settings.get();
        setSettings(s);
      }
    } catch {}
  };

  const loadInstalledVersions = async () => {
    try {
      if (window.electronAPI?.versions) {
        const v = await window.electronAPI.versions.getInstalled();
        setInstalledVersions(v || []);
      }
    } catch {}
  };

  const loadAllAccounts = async () => {
    try {
      if (window.electronAPI?.accounts) {
        const a = await window.electronAPI.accounts.getAll();
        setAccounts(a || []);
      }
    } catch {}
  };

  const handleMicrosoftLogin = async () => {
    setIsMicrosoftLoading(true);
    try {
      if (window.electronAPI?.accounts) {
        await window.electronAPI.accounts.loginMicrosoft();
        await loadAccounts();
        await loadAllAccounts();
        setShowAccountModal(false);
      }
    } catch (err: any) {
      setError(err.message || t.account.loginFailed);
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  const handleSelectAccount = async (id: string) => {
    try {
      if (window.electronAPI?.accounts) {
        await window.electronAPI.accounts.setSelected(id);
        await loadAccounts();
      }
    } catch {}
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      if (window.electronAPI?.accounts) {
        await window.electronAPI.accounts.delete(id);
        await loadAccounts();
        await loadAllAccounts();
      }
    } catch {}
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    try {
      if (window.electronAPI?.settings) {
        const updated = await window.electronAPI.settings.update(updates);
        setSettings(updated);
      }
    } catch {}
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      if (window.electronAPI?.versions) {
        await window.electronAPI.versions.delete(versionId);
        await loadInstalledVersions();
      }
    } catch {}
  };

  const loadModLoaderVersions = async (gameVersion: string, loaderType: string) => {
    if (loaderType === 'vanilla') {
      setModLoaderVersions([]);
      return;
    }
    try {
      if (window.electronAPI?.modloader) {
        const versions = await window.electronAPI.modloader.getVersions(gameVersion, loaderType);
        setModLoaderVersions(versions || []);
      }
    } catch {
      setModLoaderVersions([]);
    }
  };

  const handleVersionTypeChange = (type: VersionType) => {
    setSelectedVersionType(type);
    setSelectedModLoaderVersion('');
    if (selectedVersion && type !== 'vanilla') {
      loadModLoaderVersions(selectedVersion, type);
    }
  };

  const handleGameVersionChange = (version: string) => {
    setSelectedVersion(version);
    setSelectedModLoaderVersion('');
    if (selectedVersionType !== 'vanilla') {
      loadModLoaderVersions(version, selectedVersionType);
    }
  };

  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  const handleCreateAccount = async () => {
    if (username.trim().length >= 3) {
      await createOfflineAccount(username.trim());
      setUsername(''); setShowAccountModal(false);
    }
  };

  const handleCreateProfile = async () => {
    if (newProfileName.trim() && selectedVersion) {
      await createProfile({
        name: newProfileName.trim(),
        version: selectedVersion,
        versionType: selectedVersionType,
        modLoaderVersion: selectedModLoaderVersion || undefined,
        memory: { min: profileMemoryMin, max: profileMemoryMax }
      });
      setNewProfileName(''); setSelectedVersion(''); setSelectedVersionType('vanilla');
      setSelectedModLoaderVersion(''); setModLoaderVersions([]);
      setProfileMemoryMin(512); setProfileMemoryMax(4096);
      setShowProfileModal(false);
    }
  };

  const handleEditProfile = (profile: GameProfile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setSelectedVersion(profile.version);
    setSelectedVersionType(profile.versionType);
    setProfileMemoryMin(profile.memory.min);
    setProfileMemoryMax(profile.memory.max);
    if (profile.modLoaderVersion) {
      setSelectedModLoaderVersion(profile.modLoaderVersion);
    }
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (editingProfile && newProfileName.trim()) {
      try {
        if (window.electronAPI?.profiles) {
          await window.electronAPI.profiles.update(editingProfile.id, {
            name: newProfileName.trim(),
            version: selectedVersion,
            versionType: selectedVersionType,
            modLoaderVersion: selectedModLoaderVersion || undefined,
            memory: { min: profileMemoryMin, max: profileMemoryMax }
          });
          await loadProfiles();
        }
      } catch {}
      setEditingProfile(null); setNewProfileName(''); setSelectedVersion('');
      setSelectedVersionType('vanilla'); setSelectedModLoaderVersion('');
      setShowEditProfileModal(false);
    }
  };

  const handleOpenFolder = async (profileId: string) => {
    try {
      if (window.electronAPI?.profiles) {
        await window.electronAPI.profiles.openFolder(profileId);
      }
    } catch {}
  };

  const handleLaunch = async () => {
    if (!selectedAccount) { setShowAccountModal(true); return; }
    if (!selectedProfile) { setError(t.errors.selectProfile); return; }
    await launchGame(selectedProfile.id);
  };

  const formatLastPlayed = (date?: string) => {
    if (!date) return t.time.neverPlayed;
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t.time.justNow;
    if (hours < 24) return formatTime(t.time.hoursAgo, hours);
    const days = Math.floor(hours / 24);
    if (days < 7) return formatTime(t.time.daysAgo, days);
    return formatTime(t.time.weeksAgo, Math.floor(days / 7));
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col overflow-hidden">
      <Header onMinimize={handleMinimize} onMaximize={handleMaximize} onClose={handleClose} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} profiles={profiles} selectedAccount={selectedAccount} onAccountClick={() => setShowAccountModal(true)} installedVersions={installedVersions} t={t} />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950">
          {activeNav === 'home' && <HomePage selectedProfile={selectedProfile} profiles={profiles} isLaunching={isLaunching} isDownloading={isDownloading} downloadProgress={downloadProgress} error={error} onLaunch={handleLaunch} onSelectProfile={selectProfile} onNewProfile={() => setShowProfileModal(true)} formatLastPlayed={formatLastPlayed} news={news} gameLogs={gameLogs} onShowLogs={() => setShowLogsModal(true)} t={t} />}
          {activeNav === 'instances' && <ProfilesPage profiles={profiles} selectedProfile={selectedProfile} onSelect={selectProfile} onDelete={deleteProfile} onNew={() => setShowProfileModal(true)} formatLastPlayed={formatLastPlayed} onEdit={handleEditProfile} onOpenFolder={handleOpenFolder} t={t} />}
          {activeNav === 'versions' && <VersionsPage installedVersions={installedVersions} onDelete={handleDeleteVersion} onRefresh={loadInstalledVersions} t={t} />}
          {activeNav === 'settings' && <SettingsPage settings={settings} onUpdate={handleUpdateSettings} t={t} language={language} onLanguageChange={setLanguage} />}
        </main>
      </div>
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} accounts={accounts} selectedAccount={selectedAccount} onSelect={handleSelectAccount} onDelete={handleDeleteAccount} onCreateOffline={handleCreateAccount} onMicrosoftLogin={handleMicrosoftLogin} username={username} setUsername={setUsername} isMicrosoftLoading={isMicrosoftLoading} t={t} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} title={t.profile.title} name={newProfileName} setName={setNewProfileName} version={selectedVersion} onVersionChange={handleGameVersionChange} versions={versions} versionType={selectedVersionType} onVersionTypeChange={handleVersionTypeChange} modLoaderVersions={modLoaderVersions} modLoaderVersion={selectedModLoaderVersion} setModLoaderVersion={setSelectedModLoaderVersion} memoryMin={profileMemoryMin} setMemoryMin={setProfileMemoryMin} memoryMax={profileMemoryMax} setMemoryMax={setProfileMemoryMax} onSubmit={handleCreateProfile} submitLabel={t.common.create} t={t} />}
      {showEditProfileModal && <ProfileModal onClose={() => { setShowEditProfileModal(false); setEditingProfile(null); }} title={t.profile.editTitle} name={newProfileName} setName={setNewProfileName} version={selectedVersion} onVersionChange={handleGameVersionChange} versions={versions} versionType={selectedVersionType} onVersionTypeChange={handleVersionTypeChange} modLoaderVersions={modLoaderVersions} modLoaderVersion={selectedModLoaderVersion} setModLoaderVersion={setSelectedModLoaderVersion} memoryMin={profileMemoryMin} setMemoryMin={setProfileMemoryMin} memoryMax={profileMemoryMax} setMemoryMax={setProfileMemoryMax} onSubmit={handleSaveProfile} submitLabel={t.common.save} t={t} />}
      {showLogsModal && <LogsModal onClose={() => setShowLogsModal(false)} logs={gameLogs} onClear={clearGameLogs} t={t} />}
    </div>
  );
};

const Header: React.FC<{onMinimize: () => void; onMaximize: () => void; onClose: () => void}> = ({onMinimize, onMaximize, onClose}) => (
  <header className="drag-region h-12 bg-zinc-900 flex items-center justify-between px-4 border-b border-zinc-800">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </div>
      <span className="text-sm font-medium text-zinc-300">LoraClient</span>
      <span className="text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-zinc-800 rounded">BETA</span>
    </div>
    <div className="flex no-drag">
      <button onClick={onMinimize} className="w-11 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"><svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg></button>
      <button onClick={onMaximize} className="w-11 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg></button>
      <button onClick={onClose} className="w-11 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-red-600 transition-colors"><svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5"><path d="M1,1 L9,9 M9,1 L1,9"/></svg></button>
    </div>
  </header>
);

const Sidebar: React.FC<{activeNav: NavItem; setActiveNav: (n: NavItem) => void; profiles: GameProfile[]; selectedAccount: Account | null; onAccountClick: () => void; installedVersions: InstalledVersion[]; t: TranslationKeys}> = ({activeNav, setActiveNav, profiles, selectedAccount, onAccountClick, installedVersions, t}) => (
  <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
    <nav className="flex-1 p-3 space-y-0.5">
      <NavButton active={activeNav === 'home'} onClick={() => setActiveNav('home')} icon={<HomeIcon />} label={t.nav.home} />
      <NavButton active={activeNav === 'instances'} onClick={() => setActiveNav('instances')} icon={<GridIcon />} label={t.nav.profiles} badge={profiles.length || undefined} />
      <NavButton active={activeNav === 'versions'} onClick={() => setActiveNav('versions')} icon={<DownloadIcon />} label={t.nav.versions} badge={installedVersions.length || undefined} />
      <NavButton active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} icon={<SettingsIcon />} label={t.nav.settings} />
    </nav>
    <div className="p-3 border-t border-zinc-800">
      <button onClick={onAccountClick} className="w-full flex items-center gap-3 p-2.5 rounded bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-colors">
        <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center overflow-hidden">
          {selectedAccount?.skinUrl ? <img src={selectedAccount.skinUrl} alt="" className="w-full h-full object-cover" /> : selectedAccount ? <span className="text-xs font-medium text-zinc-300">{selectedAccount.username.charAt(0).toUpperCase()}</span> : <UserIcon />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-zinc-200 truncate">{selectedAccount?.username || t.sidebar.addAccount}</p>
          <p className="text-[10px] text-zinc-500">{selectedAccount ? (selectedAccount.type === 'microsoft' ? t.sidebar.microsoft : t.sidebar.offline) : t.sidebar.login}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  </aside>
);

const NavButton: React.FC<{active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number}> = ({active, onClick, icon, label, badge}) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
    <span className={active ? 'text-zinc-300' : 'text-zinc-500'}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-700 text-zinc-400 rounded">{badge}</span>}
  </button>
);

const HomeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const GridIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const UserIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CubeIcon: React.FC<{small?: boolean}> = ({small}) => <svg width={small ? 16 : 20} height={small ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const PlayIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const FolderIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const TerminalIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

interface HomePageProps { selectedProfile: GameProfile | null; profiles: GameProfile[]; isLaunching: boolean; isDownloading: boolean; downloadProgress: any; error: string | null; onLaunch: () => void; onSelectProfile: (id: string) => void; onNewProfile: () => void; formatLastPlayed: (d?: string) => string; news: NewsItem[]; gameLogs: string[]; onShowLogs: () => void; t: TranslationKeys; }

const HomePage: React.FC<HomePageProps> = ({selectedProfile, profiles, isLaunching, isDownloading, downloadProgress, error, onLaunch, onSelectProfile, onNewProfile, formatLastPlayed, news, gameLogs, onShowLogs, t}) => {
  const otherProfiles = profiles.filter(p => p.id !== selectedProfile?.id).slice(0, 4);
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-lg font-semibold text-zinc-100 mb-1">{t.home.title}</h1><p className="text-sm text-zinc-500">{t.home.subtitle}</p></div>
        {gameLogs.length > 0 && <button onClick={onShowLogs} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded flex items-center gap-2 transition-colors"><TerminalIcon /><span>{t.home.logs} ({gameLogs.length})</span></button>}
      </div>
      {error && <div className="mb-4 px-4 py-3 bg-red-950/50 border border-red-900/50 rounded flex items-center gap-3"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><span className="text-sm text-red-400">{error}</span></div>}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">{t.home.quickStart}</h2>
        {selectedProfile ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center"><CubeIcon /></div>
                <div><h3 className="text-sm font-medium text-zinc-100 mb-1">{selectedProfile.name}</h3><div className="flex items-center gap-2"><span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">{selectedProfile.version}</span><span className="text-xs text-zinc-500">{formatLastPlayed(selectedProfile.lastPlayed)}</span></div></div>
              </div>
              <button onClick={onLaunch} disabled={isLaunching || isDownloading} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded flex items-center gap-2 transition-colors">
                {isDownloading ? <><Spinner /><span>{downloadProgress?.totalBytes > 0 ? Math.round((downloadProgress.currentBytes / downloadProgress.totalBytes) * 100) : 0}%</span></> : isLaunching ? <><Spinner /><span>{t.home.launching}</span></> : <><PlayIcon /><span>{t.common.play}</span></>}
              </button>
            </div>
            {isDownloading && downloadProgress && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex justify-between text-xs text-zinc-500 mb-2"><span>{downloadProgress.stage}</span><span>{downloadProgress.totalBytes > 0 ? Math.round((downloadProgress.currentBytes / downloadProgress.totalBytes) * 100) : 0}%</span></div>
                <div className="h-1 bg-zinc-800 rounded overflow-hidden"><div className="h-full bg-blue-600 rounded transition-all" style={{width: (downloadProgress.totalBytes > 0 ? (downloadProgress.currentBytes / downloadProgress.totalBytes) * 100 : 0) + '%'}}/></div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onNewProfile} className="w-full bg-zinc-900 border border-dashed border-zinc-700 rounded-lg p-8 hover:border-zinc-600 hover:bg-zinc-900/80 transition-colors flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center"><PlusIcon /></div>
            <div className="text-center"><p className="text-sm text-zinc-400">{t.home.createProfile}</p><p className="text-xs text-zinc-600 mt-1">{t.home.startPlaying}</p></div>
          </button>
        )}
      </section>
      {otherProfiles.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">{t.home.otherProfiles}</h2>
          <div className="grid grid-cols-2 gap-3">
            {otherProfiles.map(profile => (
              <button key={profile.id} onClick={() => onSelectProfile(profile.id)} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors text-left">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center"><CubeIcon small /></div><div className="flex-1 min-w-0"><h4 className="text-sm font-medium text-zinc-200 truncate">{profile.name}</h4><p className="text-xs text-zinc-500">{profile.version}</p></div></div>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-xs text-zinc-400">{t.common.systemReady}</span></div>
    </div>
  );
};

const Spinner = () => <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>;

interface ProfilesPageProps { profiles: GameProfile[]; selectedProfile: GameProfile | null; onSelect: (id: string) => void; onDelete: (id: string) => void; onNew: () => void; formatLastPlayed: (d?: string) => string; onEdit: (profile: GameProfile) => void; onOpenFolder: (id: string) => void; t: TranslationKeys; }

const ProfilesPage: React.FC<ProfilesPageProps> = ({profiles, selectedProfile, onSelect, onDelete, onNew, formatLastPlayed, onEdit, onOpenFolder, t}) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-6">
      <div><h1 className="text-lg font-semibold text-zinc-100 mb-1">{t.profiles.title}</h1><p className="text-sm text-zinc-500">{t.profiles.subtitle}</p></div>
      <button onClick={onNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded flex items-center gap-2 transition-colors"><PlusIcon /><span>{t.profiles.newProfile}</span></button>
    </div>
    {profiles.length === 0 ? (
      <div className="text-center py-12"><p className="text-zinc-500 mb-4">{t.profiles.noProfiles}</p><button onClick={onNew} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors">{t.profiles.createFirst}</button></div>
    ) : (
      <div className="space-y-2">
        {profiles.map(profile => (
          <div key={profile.id} className={`bg-zinc-900 border rounded-lg p-4 transition-colors ${selectedProfile?.id === profile.id ? 'border-blue-600/50' : 'border-zinc-800 hover:border-zinc-700'}`}>
            <div className="flex items-center justify-between">
              <button onClick={() => onSelect(profile.id)} className="flex items-center gap-4 flex-1 text-left">
                <div className="w-11 h-11 rounded bg-zinc-800 flex items-center justify-center"><CubeIcon /></div>
                <div><h3 className="text-sm font-medium text-zinc-100 mb-0.5">{profile.name}</h3><p className="text-xs text-zinc-500">{profile.version} - {profile.versionType} - {formatLastPlayed(profile.lastPlayed)}</p></div>
              </button>
              <div className="flex items-center gap-2">
                {selectedProfile?.id === profile.id && <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">{t.common.selected}</span>}
                <button onClick={() => onOpenFolder(profile.id)} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors" title={t.profiles.openFolder}><FolderIcon /></button>
                <button onClick={() => onEdit(profile)} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors" title={t.common.edit}><EditIcon /></button>
                <button onClick={() => onDelete(profile.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors" title={t.common.delete}><TrashIcon /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

interface VersionsPageProps { installedVersions: InstalledVersion[]; onDelete: (id: string) => void; onRefresh: () => void; t: TranslationKeys; }

const VersionsPage: React.FC<VersionsPageProps> = ({installedVersions, onDelete, onRefresh, t}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-lg font-semibold text-zinc-100 mb-1">{t.versions.title}</h1><p className="text-sm text-zinc-500">{t.versions.subtitle}</p></div>
        <button onClick={onRefresh} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded flex items-center gap-2 transition-colors"><RefreshIcon /><span>{t.common.refresh}</span></button>
      </div>
      {installedVersions.length === 0 ? (
        <div className="text-center py-12"><p className="text-zinc-500">{t.versions.noVersions}</p></div>
      ) : (
        <div className="space-y-2">
          {installedVersions.map(v => (
            <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center"><CubeIcon small /></div>
                <div>
                  <h3 className="text-sm font-medium text-zinc-100">{v.id}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">{v.type}</span>
                    <span className="text-xs text-zinc-500">{formatSize(v.size)}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => onDelete(v.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors"><TrashIcon /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SettingsPageProps { settings: AppSettings | null; onUpdate: (updates: Partial<AppSettings>) => void; t: TranslationKeys; language: Language; onLanguageChange: (lang: Language) => void; }

const SettingsPage: React.FC<SettingsPageProps> = ({settings, onUpdate, t, language, onLanguageChange}) => {
  const handleOpenMinecraftFolder = () => window.electronAPI?.settings?.openMinecraftFolder();
  const handleOpenLoraClientFolder = () => window.electronAPI?.settings?.openLoraClientFolder();
  const handleLanguageChange = (lang: Language) => {
    onLanguageChange(lang);
    onUpdate({ language: lang });
  };
  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-lg font-semibold text-zinc-100 mb-1">{t.settings.title}</h1><p className="text-sm text-zinc-500">{t.settings.subtitle}</p></div>
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-zinc-200 mb-4">{t.settings.language}</h3>
          <div className="flex gap-3">
            <button onClick={() => handleLanguageChange('tr')} className={`flex-1 px-4 py-2.5 rounded text-sm font-medium transition-colors ${language === 'tr' ? 'bg-blue-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>Türkçe</button>
            <button onClick={() => handleLanguageChange('en')} className={`flex-1 px-4 py-2.5 rounded text-sm font-medium transition-colors ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>English</button>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-zinc-200 mb-4">{t.settings.defaultMemory}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs text-zinc-500 mb-2">{t.settings.minRam}</label><input type="number" value={settings?.defaultMemory?.min || 512} onChange={e => onUpdate({defaultMemory: {...settings?.defaultMemory, min: parseInt(e.target.value) || 512, max: settings?.defaultMemory?.max || 4096}})} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"/></div>
            <div><label className="block text-xs text-zinc-500 mb-2">{t.settings.maxRam}</label><input type="number" value={settings?.defaultMemory?.max || 4096} onChange={e => onUpdate({defaultMemory: {...settings?.defaultMemory, min: settings?.defaultMemory?.min || 512, max: parseInt(e.target.value) || 4096}})} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"/></div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-200 mb-4">{t.settings.application}</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-zinc-200">{t.settings.closeOnLaunch}</p><p className="text-xs text-zinc-500">{t.settings.closeOnLaunchDesc}</p></div>
            <button onClick={() => onUpdate({closeOnLaunch: !settings?.closeOnLaunch})} className={`w-11 h-6 rounded-full relative transition-colors ${settings?.closeOnLaunch ? 'bg-blue-600' : 'bg-zinc-700'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings?.closeOnLaunch ? 'left-[22px]' : 'left-0.5'}`}/></button>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-zinc-200">{t.settings.minimizeOnLaunch}</p><p className="text-xs text-zinc-500">{t.settings.minimizeOnLaunchDesc}</p></div>
            <button onClick={() => onUpdate({minimizeOnLaunch: !settings?.minimizeOnLaunch})} className={`w-11 h-6 rounded-full relative transition-colors ${settings?.minimizeOnLaunch ? 'bg-blue-600' : 'bg-zinc-700'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings?.minimizeOnLaunch ? 'left-[22px]' : 'left-0.5'}`}/></button>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-zinc-200">{t.settings.showSnapshots}</p><p className="text-xs text-zinc-500">{t.settings.showSnapshotsDesc}</p></div>
            <button onClick={() => onUpdate({showSnapshots: !settings?.showSnapshots})} className={`w-11 h-6 rounded-full relative transition-colors ${settings?.showSnapshots ? 'bg-blue-600' : 'bg-zinc-700'}`}><div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings?.showSnapshots ? 'left-[22px]' : 'left-0.5'}`}/></button>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-zinc-200 mb-4">{t.settings.folders}</h3>
          <div className="flex gap-3">
            <button onClick={handleOpenMinecraftFolder} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded flex items-center justify-center gap-2 transition-colors"><FolderIcon /><span>.minecraft</span></button>
            <button onClick={handleOpenLoraClientFolder} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded flex items-center justify-center gap-2 transition-colors"><FolderIcon /><span>LoraClient</span></button>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5"><h3 className="text-sm font-medium text-zinc-200 mb-2">{t.settings.about}</h3><p className="text-xs text-zinc-500">{t.settings.aboutText}</p></div>
      </div>
    </div>
  );
};

interface ModalProps { onClose: () => void; title: string; children: React.ReactNode; }

const Modal: React.FC<ModalProps> = ({onClose, title, children}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      {children}
    </div>
  </div>
);

interface AccountModalProps { onClose: () => void; accounts: Account[]; selectedAccount: Account | null; onSelect: (id: string) => void; onDelete: (id: string) => void; onCreateOffline: () => void; onMicrosoftLogin: () => void; username: string; setUsername: (s: string) => void; isMicrosoftLoading: boolean; t: TranslationKeys; }

const AccountModal: React.FC<AccountModalProps> = ({onClose, accounts, selectedAccount, onSelect, onDelete, onCreateOffline, onMicrosoftLogin, username, setUsername, isMicrosoftLoading, t}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-100">{t.account.title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      {accounts.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-zinc-500 mb-2">{t.account.savedAccounts}</p>
          {accounts.map(acc => (
            <div key={acc.id} className={`flex items-center gap-3 p-3 rounded border transition-colors cursor-pointer ${selectedAccount?.id === acc.id ? 'bg-blue-600/10 border-blue-600/50' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'}`} onClick={() => onSelect(acc.id)}>
              <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center overflow-hidden">
                {acc.skinUrl ? <img src={acc.skinUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-medium text-zinc-300">{acc.username.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{acc.username}</p>
                <p className="text-[10px] text-zinc-500">{acc.type === 'microsoft' ? t.sidebar.microsoft : t.sidebar.offline}</p>
              </div>
              {selectedAccount?.id === acc.id && <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] rounded">{t.common.selected}</span>}
              <button onClick={e => { e.stopPropagation(); onDelete(acc.id); }} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"><TrashIcon /></button>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500 mb-3">{t.account.addNew}</p>
        <button onClick={onMicrosoftLogin} disabled={isMicrosoftLoading} className="w-full mb-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors">
          {isMicrosoftLoading ? <Spinner /> : <svg width="16" height="16" viewBox="0 0 21 21" fill="currentColor"><path d="M0 0h10v10H0V0zm11 0h10v10H11V0zM0 11h10v10H0V11zm11 0h10v10H11V11z"/></svg>}
          <span>{isMicrosoftLoading ? t.account.loggingIn : t.account.microsoftLogin}</span>
        </button>
        <div className="flex items-center gap-2 mb-3"><div className="flex-1 h-px bg-zinc-800"/><span className="text-xs text-zinc-600">{t.common.or}</span><div className="flex-1 h-px bg-zinc-800"/></div>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={t.account.offlineUsername} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 mb-3" onKeyDown={e => e.key === 'Enter' && username.trim().length >= 3 && onCreateOffline()} />
        <button onClick={onCreateOffline} disabled={username.trim().length < 3} className="w-full py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors">{t.account.addOffline}</button>
      </div>
    </div>
  </div>
);

interface ProfileModalProps { onClose: () => void; title: string; name: string; setName: (s: string) => void; version: string; onVersionChange: (v: string) => void; versions: any[]; versionType: string; onVersionTypeChange: (vt: any) => void; modLoaderVersions: ModLoaderVersion[]; modLoaderVersion: string; setModLoaderVersion: (v: string) => void; memoryMin: number; setMemoryMin: (n: number) => void; memoryMax: number; setMemoryMax: (n: number) => void; onSubmit: () => void; submitLabel: string; t: TranslationKeys; }

const ProfileModal: React.FC<ProfileModalProps> = ({onClose, title, name, setName, version, onVersionChange, versions, versionType, onVersionTypeChange, modLoaderVersions, modLoaderVersion, setModLoaderVersion, memoryMin, setMemoryMin, memoryMax, setMemoryMax, onSubmit, submitLabel, t}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div className="space-y-4">
        <div><label className="block text-xs text-zinc-500 mb-2">{t.profile.name}</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t.profile.namePlaceholder} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs text-zinc-500 mb-2">{t.profile.minecraftVersion}</label><select value={version} onChange={e => onVersionChange(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"><option value="">{t.profile.selectVersion}</option>{versions.slice(0, 50).map(v => <option key={v.id} value={v.id}>{v.id}</option>)}</select></div>
          <div><label className="block text-xs text-zinc-500 mb-2">{t.profile.modLoader}</label><select value={versionType} onChange={e => onVersionTypeChange(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"><option value="vanilla">Vanilla</option><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="quilt">Quilt</option><option value="neoforge">NeoForge</option></select></div>
        </div>
        {versionType !== 'vanilla' && modLoaderVersions.length > 0 && (
          <div><label className="block text-xs text-zinc-500 mb-2">{versionType.charAt(0).toUpperCase() + versionType.slice(1)}</label><select value={modLoaderVersion} onChange={e => setModLoaderVersion(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"><option value="">{t.profile.selectVersion}</option>{modLoaderVersions.slice(0, 20).map(v => <option key={v.id} value={v.version}>{v.version}{v.stable ? ` (${t.profile.stable})` : ''}</option>)}</select></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs text-zinc-500 mb-2">{t.profile.minRam}</label><input type="number" value={memoryMin} onChange={e => setMemoryMin(parseInt(e.target.value) || 512)} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"/></div>
          <div><label className="block text-xs text-zinc-500 mb-2">{t.profile.maxRam}</label><input type="number" value={memoryMax} onChange={e => setMemoryMax(parseInt(e.target.value) || 4096)} className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"/></div>
        </div>
        <button onClick={onSubmit} disabled={!name.trim() || !version} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors">{submitLabel}</button>
      </div>
    </div>
  </div>
);

interface LogsModalProps { onClose: () => void; logs: string[]; onClear: () => void; t: TranslationKeys; }

const LogsModal: React.FC<LogsModalProps> = ({onClose, logs, onClear, t}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-100">{t.logs.title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={onClear} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors">{t.common.clear}</button>
          <button onClick={onClose} className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-zinc-950 rounded p-3 font-mono text-xs text-zinc-400 whitespace-pre-wrap">
        {logs.length === 0 ? <span className="text-zinc-600">{t.logs.noLogs}</span> : logs.map((log, i) => <div key={i} className="py-0.5">{log}</div>)}
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [initialLanguage, setInitialLanguage] = useState<Language>('tr');
  
  useEffect(() => {
    const loadInitialLanguage = async () => {
      try {
        if (window.electronAPI?.settings) {
          const settings = await window.electronAPI.settings.get();
          if (settings?.language) {
            setInitialLanguage(settings.language);
          }
        }
      } catch {}
    };
    loadInitialLanguage();
  }, []);

  return (
    <I18nProvider initialLanguage={initialLanguage}>
      <AppContent />
    </I18nProvider>
  );
};

export default App;
