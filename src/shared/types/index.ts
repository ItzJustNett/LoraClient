export interface MinecraftVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string;
  releaseTime: string;
}

export interface ModLoaderVersion {
  id: string;
  version: string;
  gameVersion: string;
  loaderType: 'forge' | 'fabric' | 'quilt' | 'neoforge';
  stable: boolean;
}

export interface GameProfile {
  id: string;
  name: string;
  version: string;
  versionType: 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge';
  modLoaderVersion?: string;
  lastPlayed?: string;
  created: string;
  javaPath?: string;
  jvmArgs?: string;
  gameDir?: string;
  resolution?: {
    width: number;
    height: number;
  };
  memory: {
    min: number;
    max: number;
  };
  fullscreen?: boolean;
  icon?: string;
}

export interface Account {
  id: string;
  username: string;
  type: 'offline' | 'microsoft';
  uuid: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  skinUrl?: string;
  capeUrl?: string;
}

export interface JavaInstallation {
  path: string;
  version: string;
  is64Bit: boolean;
  vendor?: string;
  isManaged?: boolean;
}

export interface JavaDownloadInfo {
  url: string;
  checksum: string;
  size: number;
  version: string;
}

export interface LaunchOptions {
  profile: GameProfile;
  account: Account;
  java: JavaInstallation;
}

export interface DownloadProgress {
  currentBytes: number;
  totalBytes: number;
  downloadedFiles: number;
  totalFiles: number;
  stage: string;
  speed: number;
  isPaused?: boolean;
}

export interface AppSettings {
  minecraftDir: string;
  defaultMemory: {
    min: number;
    max: number;
  };
  closeOnLaunch: boolean;
  minimizeOnLaunch: boolean;
  language: 'tr' | 'en';
  theme: 'dark' | 'light' | 'system';
  showSnapshots: boolean;
  autoUpdate: boolean;
  discordRPC: boolean;
  selectedJavaPath?: string;
}

export interface LauncherState {
  isLaunching: boolean;
  downloadProgress?: DownloadProgress;
  currentAction?: string;
  error?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  url?: string;
  category: 'update' | 'news' | 'event';
}

export interface InstalledVersion {
  id: string;
  type: 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge';
  installedAt: string;
  size: number;
  modLoaderVersion?: string;
}

export interface MicrosoftAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  username: string;
  uuid: string;
  skinUrl?: string;
}
