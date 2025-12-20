import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { javaService } from './services/java';
import { javaDownloadService } from './services/java-download';
import { minecraftService } from './services/minecraft';
import { launcherService } from './services/launcher';
import { profileService } from './services/profiles';
import { accountService } from './services/accounts';
import { settingsService } from './services/settings';
import { newsService } from './services/news';
import { versionsService } from './services/versions';
import { modLoaderService } from './services/modloader';
import { microsoftAuthService } from './services/microsoft-auth';
import { GameProfile, Account, DownloadProgress, AppSettings } from '../shared/types';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

class LoraClient {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    app.whenReady().then(() => this.createMainWindow());
    app.on('window-all-closed', this.onWindowAllClosed.bind(this));
    app.on('activate', this.onActivate.bind(this));

    this.setupIpcHandlers();
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      frame: false,
      titleBarStyle: 'hidden',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
    });

    if (isDev) {
      const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
      this.mainWindow.loadURL(devUrl).catch(() => {
        return this.mainWindow?.loadFile(path.join(__dirname, '../renderer/index.html'));
      });
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      if (isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('window-minimize', () => this.mainWindow?.minimize());
    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });
    ipcMain.handle('window-close', () => this.mainWindow?.close());
    ipcMain.handle('get-app-version', () => app.getVersion());

    ipcMain.handle('java:detect', async () => {
      return await javaService.detectJavaInstallations();
    });

    ipcMain.handle('java:get-recommended', async (_, minecraftVersion: string) => {
      try {
        const installations = await javaService.detectJavaInstallations();
        return javaService.getRecommendedJava(installations, minecraftVersion);
      } catch (error: any) {
        throw new Error(error.message || 'Recommended Java could not be determined');
      }
    });

    ipcMain.handle('minecraft:get-versions', async () => {
      try {
        const manifest = await minecraftService.getVersionManifest();
        return manifest.versions.filter(v => v.type === 'release' || v.type === 'snapshot');
      } catch (error: any) {
        throw new Error(error.message || 'Versions could not be retrieved');
      }
    });

    ipcMain.handle('minecraft:get-releases', async () => {
      try {
        const manifest = await minecraftService.getVersionManifest();
        return manifest.versions.filter(v => v.type === 'release');
      } catch (error: any) {
        throw new Error(error.message || 'Releases could not be retrieved');
      }
    });

    ipcMain.handle('minecraft:is-installed', async (_, versionId: string) => {
      try {
        return await minecraftService.isVersionInstalled(versionId);
      } catch (error: any) {
        throw new Error(error.message || 'Installation status could not be determined');
      }
    });

    ipcMain.handle('minecraft:install', async (_, versionId: string) => {
      return new Promise<void>((resolve, reject) => {
        minecraftService.installVersion(versionId, (progress: DownloadProgress) => {
          this.mainWindow?.webContents.send('download-progress', progress);
        }).then(resolve).catch(reject);
      });
    });

    ipcMain.handle('minecraft:get-dir', () => minecraftService.getMinecraftDir());

    ipcMain.handle('profiles:get-all', () => profileService.getAllProfiles());
    ipcMain.handle('profiles:get', (_, id: string) => profileService.getProfile(id));
    ipcMain.handle('profiles:get-selected', () => profileService.getSelectedProfile());
    ipcMain.handle('profiles:set-selected', (_, id: string) => profileService.setSelectedProfile(id));
    ipcMain.handle('profiles:create', (_, data: Omit<GameProfile, 'id' | 'created'>) => {
      return profileService.createProfile(data);
    });
    ipcMain.handle('profiles:update', (_, id: string, data: Partial<GameProfile>) => {
      return profileService.updateProfile(id, data);
    });
    ipcMain.handle('profiles:delete', (_, id: string) => profileService.deleteProfile(id));

    ipcMain.handle('accounts:get-all', () => accountService.getAllAccounts());
    ipcMain.handle('accounts:get-selected', () => accountService.getSelectedAccount());
    ipcMain.handle('accounts:set-selected', (_, id: string) => accountService.setSelectedAccount(id));
    ipcMain.handle('accounts:create-offline', (_, username: string) => {
      return accountService.createOfflineAccount(username);
    });
    ipcMain.handle('accounts:delete', (_, id: string) => accountService.deleteAccount(id));
    ipcMain.handle('accounts:has-accounts', () => accountService.hasAccounts());

    ipcMain.handle('launch:start', async (_, profileId: string) => {
      const profile = profileService.getProfile(profileId);
      if (!profile) throw new Error('Profile not found');

      const account = accountService.getSelectedAccount();
      if (!account) throw new Error('No account selected');

      const java = await javaService.detectJavaInstallations();
      let recommendedJava = javaService.getRecommendedJava(java, profile.version);
      if (!recommendedJava) {
        javaDownloadService.setProgressCallback((progress) => {
          this.mainWindow?.webContents.send('download-progress', progress);
        });
        recommendedJava = await javaDownloadService.ensureJavaForMinecraft(profile.version);
      }
      if (!recommendedJava) throw new Error('No compatible Java found');

      const isInstalled = await minecraftService.isVersionInstalled(profile.version);
      if (!isInstalled) {
        await minecraftService.installVersion(profile.version, (progress) => {
          this.mainWindow?.webContents.send('download-progress', progress);
        });
      }

      launcherService.setLogCallback((log) => {
        this.mainWindow?.webContents.send('game-log', log);
      });

      launcherService.setExitCallback((code) => {
        this.mainWindow?.webContents.send('game-exit', code);
      });

      await launcherService.launch({
        profile,
        account,
        java: recommendedJava,
      });

      profileService.updateLastPlayed(profileId);
    });

    ipcMain.handle('launch:is-running', () => launcherService.isRunning());
    ipcMain.handle('launch:kill', () => launcherService.kill());

    ipcMain.handle('java:download', async (_, majorVersion: number) => {
      javaDownloadService.setProgressCallback((progress) => {
        this.mainWindow?.webContents.send('download-progress', progress);
      });
      return await javaDownloadService.downloadJava(majorVersion);
    });

    ipcMain.handle('java:get-managed', async () => {
      return await javaDownloadService.getManagedJavaInstallations();
    });

    ipcMain.handle('java:ensure-for-minecraft', async (_, version: string) => {
      javaDownloadService.setProgressCallback((progress) => {
        this.mainWindow?.webContents.send('download-progress', progress);
      });
      return await javaDownloadService.ensureJavaForMinecraft(version);
    });

    ipcMain.handle('profiles:open-folder', async (_, id: string) => {
      const profile = profileService.getProfile(id);
      if (profile) {
        await settingsService.openProfileFolder(id, profile.gameDir);
      }
    });

    ipcMain.handle('accounts:login-microsoft', async () => {
      const result = await microsoftAuthService.loginWithMicrosoft();
      const account = accountService.createMicrosoftAccount(result);
      return account;
    });

    ipcMain.handle('accounts:refresh', async (_, id: string) => {
      const account = accountService.getAccount(id);
      if (!account) return null;
      const refreshed = await microsoftAuthService.refreshAccount(account);
      if (refreshed) {
        accountService.updateAccount(id, refreshed);
      }
      return refreshed;
    });

    ipcMain.handle('accounts:get-skin-url', async (_, uuid: string) => {
      return await microsoftAuthService.getSkinUrl(uuid);
    });

    ipcMain.handle('settings:get', () => settingsService.getSettings());
    ipcMain.handle('settings:update', (_, settings: Partial<AppSettings>) => {
      return settingsService.updateSettings(settings);
    });
    ipcMain.handle('settings:reset', () => settingsService.resetSettings());
    ipcMain.handle('settings:open-minecraft-folder', () => settingsService.openMinecraftFolder());
    ipcMain.handle('settings:open-loraclient-folder', () => settingsService.openLoraClientFolder());

    ipcMain.handle('news:get', () => newsService.getNews());
    ipcMain.handle('news:get-latest-version', () => newsService.getLatestVersion());

    ipcMain.handle('versions:get-installed', () => versionsService.getInstalledVersions());
    ipcMain.handle('versions:delete', (_, versionId: string) => versionsService.deleteVersion(versionId));
    ipcMain.handle('versions:get-size', (_, versionId: string) => versionsService.getVersionSize(versionId));

    ipcMain.handle('modloader:get-versions', (_, gameVersion: string, loaderType: string) => {
      return modLoaderService.getModLoaderVersions(gameVersion, loaderType);
    });

    ipcMain.handle('modloader:install', async (_, gameVersion: string, loaderType: string, loaderVersion: string) => {
      modLoaderService.setProgressCallback((progress) => {
        this.mainWindow?.webContents.send('download-progress', progress);
      });
      return await modLoaderService.installModLoader(gameVersion, loaderType, loaderVersion);
    });
  }

  private onWindowAllClosed(): void {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onActivate(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }
}

new LoraClient();
