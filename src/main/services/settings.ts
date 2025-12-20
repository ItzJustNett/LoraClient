import Store from 'electron-store';
import { app, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { AppSettings } from '../../shared/types';

const defaultSettings: AppSettings = {
  minecraftDir: '',
  defaultMemory: {
    min: 512,
    max: 4096,
  },
  closeOnLaunch: false,
  minimizeOnLaunch: true,
  language: 'tr',
  theme: 'dark',
  showSnapshots: false,
  autoUpdate: true,
  discordRPC: false,
  selectedJavaPath: undefined,
};

const store = new Store<{ settings: AppSettings }>({
  name: 'settings',
  defaults: {
    settings: defaultSettings,
  },
});

export class SettingsService {
  constructor() {
    const settings = this.getSettings();
    if (!settings.minecraftDir) {
      this.updateSettings({ minecraftDir: this.getDefaultMinecraftDir() });
    }
  }

  private getDefaultMinecraftDir(): string {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(app.getPath('appData'), '.minecraft');
    } else if (platform === 'darwin') {
      return path.join(app.getPath('home'), 'Library', 'Application Support', 'minecraft');
    } else {
      return path.join(app.getPath('home'), '.minecraft');
    }
  }

  getSettings(): AppSettings {
    const settings = store.get('settings', defaultSettings);
    if (!settings.minecraftDir) {
      settings.minecraftDir = this.getDefaultMinecraftDir();
    }
    return settings;
  }

  updateSettings(updates: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    store.set('settings', updated);
    return updated;
  }

  resetSettings(): AppSettings {
    const reset = { ...defaultSettings, minecraftDir: this.getDefaultMinecraftDir() };
    store.set('settings', reset);
    return reset;
  }

  async openFolder(folderPath: string): Promise<void> {
    if (fs.existsSync(folderPath)) {
      await shell.openPath(folderPath);
    } else {
      await fs.promises.mkdir(folderPath, { recursive: true });
      await shell.openPath(folderPath);
    }
  }

  async openMinecraftFolder(): Promise<void> {
    const settings = this.getSettings();
    await this.openFolder(settings.minecraftDir);
  }

  async openProfileFolder(profileId: string, gameDir?: string): Promise<void> {
    const settings = this.getSettings();
    const folder = gameDir || settings.minecraftDir;
    await this.openFolder(folder);
  }

  getLoraClientDir(): string {
    return path.join(app.getPath('userData'));
  }

  async openLoraClientFolder(): Promise<void> {
    await this.openFolder(this.getLoraClientDir());
  }

  getJavaDir(): string {
    return path.join(this.getLoraClientDir(), 'java');
  }

  async ensureDirectories(): Promise<void> {
    const settings = this.getSettings();
    const dirs = [
      settings.minecraftDir,
      path.join(settings.minecraftDir, 'versions'),
      path.join(settings.minecraftDir, 'libraries'),
      path.join(settings.minecraftDir, 'assets'),
      this.getJavaDir(),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
    }
  }
}

export const settingsService = new SettingsService();
