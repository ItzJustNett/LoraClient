import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ModLoaderVersion, DownloadProgress } from '../../shared/types';
import { minecraftService } from './minecraft';

const FABRIC_META_URL = 'https://meta.fabricmc.net/v2';
const FORGE_MAVEN_URL = 'https://files.minecraftforge.net/maven';
const FORGE_PROMOTIONS_URL = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json';
const QUILT_META_URL = 'https://meta.quiltmc.org/v3';
const NEOFORGE_META_URL = 'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge';

export class ModLoaderService {
  private progressCallback?: (progress: DownloadProgress) => void;

  setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  async getFabricVersions(gameVersion: string): Promise<ModLoaderVersion[]> {
    try {
      const response = await axios.get(`${FABRIC_META_URL}/versions/loader/${gameVersion}`);
      return response.data.map((item: any) => ({
        id: `fabric-loader-${item.loader.version}-${gameVersion}`,
        version: item.loader.version,
        gameVersion,
        loaderType: 'fabric' as const,
        stable: item.loader.stable,
      }));
    } catch {
      return [];
    }
  }

  async getQuiltVersions(gameVersion: string): Promise<ModLoaderVersion[]> {
    try {
      const response = await axios.get(`${QUILT_META_URL}/versions/loader/${gameVersion}`);
      return response.data.map((item: any) => ({
        id: `quilt-loader-${item.loader.version}-${gameVersion}`,
        version: item.loader.version,
        gameVersion,
        loaderType: 'quilt' as const,
        stable: !item.loader.version.includes('beta'),
      }));
    } catch {
      return [];
    }
  }

  async getForgeVersions(gameVersion: string): Promise<ModLoaderVersion[]> {
    try {
      const response = await axios.get(`https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json`);
      const versions = response.data[gameVersion] || [];
      return versions.map((version: string) => ({
        id: `forge-${version}`,
        version: version.split('-')[1] || version,
        gameVersion,
        loaderType: 'forge' as const,
        stable: !version.includes('beta') && !version.includes('alpha'),
      }));
    } catch {
      return [];
    }
  }

  async getNeoForgeVersions(gameVersion: string): Promise<ModLoaderVersion[]> {
    try {
      const response = await axios.get(NEOFORGE_META_URL);
      const allVersions = response.data.versions || [];
      const mcVersionPart = gameVersion.replace('1.', '');
      const filtered = allVersions.filter((v: string) => v.startsWith(mcVersionPart));
      return filtered.map((version: string) => ({
        id: `neoforge-${version}`,
        version,
        gameVersion,
        loaderType: 'neoforge' as const,
        stable: !version.includes('beta'),
      }));
    } catch {
      return [];
    }
  }

  async getModLoaderVersions(gameVersion: string, loaderType: string): Promise<ModLoaderVersion[]> {
    switch (loaderType) {
      case 'fabric':
        return this.getFabricVersions(gameVersion);
      case 'quilt':
        return this.getQuiltVersions(gameVersion);
      case 'forge':
        return this.getForgeVersions(gameVersion);
      case 'neoforge':
        return this.getNeoForgeVersions(gameVersion);
      default:
        return [];
    }
  }

  async installFabric(gameVersion: string, loaderVersion: string): Promise<string> {
    const versionId = `fabric-loader-${loaderVersion}-${gameVersion}`;
    const minecraftDir = minecraftService.getMinecraftDir();
    const versionDir = path.join(minecraftDir, 'versions', versionId);

    if (fs.existsSync(path.join(versionDir, `${versionId}.json`))) {
      return versionId;
    }

    await fs.promises.mkdir(versionDir, { recursive: true });

    const profileUrl = `${FABRIC_META_URL}/versions/loader/${gameVersion}/${loaderVersion}/profile/json`;
    const response = await axios.get(profileUrl);
    const versionJson = response.data;

    await fs.promises.writeFile(
      path.join(versionDir, `${versionId}.json`),
      JSON.stringify(versionJson, null, 2)
    );

    await this.downloadFabricLibraries(versionJson);

    return versionId;
  }

  private async downloadFabricLibraries(versionJson: any): Promise<void> {
    const minecraftDir = minecraftService.getMinecraftDir();
    const librariesDir = path.join(minecraftDir, 'libraries');

    for (const lib of versionJson.libraries) {
      if (!lib.url) continue;

      const [group, artifact, version] = lib.name.split(':');
      const groupPath = group.replace(/\./g, '/');
      const libPath = path.join(librariesDir, groupPath, artifact, version, `${artifact}-${version}.jar`);

      if (fs.existsSync(libPath)) continue;

      await fs.promises.mkdir(path.dirname(libPath), { recursive: true });
      const url = `${lib.url}${groupPath}/${artifact}/${version}/${artifact}-${version}.jar`;

      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fs.promises.writeFile(libPath, Buffer.from(response.data));
      } catch {
      }
    }
  }

  async installQuilt(gameVersion: string, loaderVersion: string): Promise<string> {
    const versionId = `quilt-loader-${loaderVersion}-${gameVersion}`;
    const minecraftDir = minecraftService.getMinecraftDir();
    const versionDir = path.join(minecraftDir, 'versions', versionId);

    if (fs.existsSync(path.join(versionDir, `${versionId}.json`))) {
      return versionId;
    }

    await fs.promises.mkdir(versionDir, { recursive: true });

    const profileUrl = `${QUILT_META_URL}/versions/loader/${gameVersion}/${loaderVersion}/profile/json`;
    const response = await axios.get(profileUrl);
    const versionJson = response.data;

    await fs.promises.writeFile(
      path.join(versionDir, `${versionId}.json`),
      JSON.stringify(versionJson, null, 2)
    );

    return versionId;
  }

  async installModLoader(
    gameVersion: string,
    loaderType: string,
    loaderVersion: string
  ): Promise<string> {
    const isVanillaInstalled = await minecraftService.isVersionInstalled(gameVersion);
    if (!isVanillaInstalled) {
      await minecraftService.installVersion(gameVersion, this.progressCallback);
    }

    switch (loaderType) {
      case 'fabric':
        return this.installFabric(gameVersion, loaderVersion);
      case 'quilt':
        return this.installQuilt(gameVersion, loaderVersion);
      case 'forge':
        return `${gameVersion}-forge-${loaderVersion}`;
      case 'neoforge':
        return `neoforge-${loaderVersion}`;
      default:
        return gameVersion;
    }
  }
}

export const modLoaderService = new ModLoaderService();
