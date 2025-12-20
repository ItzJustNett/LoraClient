import * as fs from 'fs';
import * as path from 'path';
import { InstalledVersion } from '../../shared/types';
import { minecraftService } from './minecraft';

export class VersionsService {
  async getInstalledVersions(): Promise<InstalledVersion[]> {
    const minecraftDir = minecraftService.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, 'versions');
    const installed: InstalledVersion[] = [];

    if (!fs.existsSync(versionsDir)) {
      return installed;
    }

    try {
      const entries = await fs.promises.readdir(versionsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const versionId = entry.name;
        const versionDir = path.join(versionsDir, versionId);
        const jarPath = path.join(versionDir, `${versionId}.jar`);
        const jsonPath = path.join(versionDir, `${versionId}.json`);

        if (!fs.existsSync(jsonPath)) continue;

        try {
          const stats = await fs.promises.stat(versionDir);
          const jsonContent = JSON.parse(await fs.promises.readFile(jsonPath, 'utf-8'));

          let type: InstalledVersion['type'] = 'vanilla';
          let modLoaderVersion: string | undefined;

          if (versionId.includes('fabric')) {
            type = 'fabric';
            const match = versionId.match(/fabric-loader-([\d.]+)/);
            if (match) modLoaderVersion = match[1];
          } else if (versionId.includes('forge')) {
            type = 'forge';
            const match = versionId.match(/forge-([\d.]+)/);
            if (match) modLoaderVersion = match[1];
          } else if (versionId.includes('quilt')) {
            type = 'quilt';
            const match = versionId.match(/quilt-loader-([\d.]+)/);
            if (match) modLoaderVersion = match[1];
          } else if (versionId.includes('neoforge')) {
            type = 'neoforge';
          }

          let size = 0;
          if (fs.existsSync(jarPath)) {
            const jarStats = await fs.promises.stat(jarPath);
            size = jarStats.size;
          }

          installed.push({
            id: versionId,
            type,
            installedAt: stats.birthtime.toISOString(),
            size,
            modLoaderVersion,
          });
        } catch {
        }
      }
    } catch {
    }

    return installed.sort((a, b) => new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime());
  }

  async deleteVersion(versionId: string): Promise<boolean> {
    const minecraftDir = minecraftService.getMinecraftDir();
    const versionDir = path.join(minecraftDir, 'versions', versionId);

    if (!fs.existsSync(versionDir)) {
      return false;
    }

    try {
      await fs.promises.rm(versionDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async getVersionSize(versionId: string): Promise<number> {
    const minecraftDir = minecraftService.getMinecraftDir();
    const versionDir = path.join(minecraftDir, 'versions', versionId);

    if (!fs.existsSync(versionDir)) {
      return 0;
    }

    return this.calculateDirSize(versionDir);
  }

  private async calculateDirSize(dirPath: string): Promise<number> {
    let size = 0;

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += await this.calculateDirSize(fullPath);
      } else {
        const stats = await fs.promises.stat(fullPath);
        size += stats.size;
      }
    }

    return size;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const versionsService = new VersionsService();
