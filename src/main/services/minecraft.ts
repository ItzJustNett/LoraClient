import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MinecraftVersion, DownloadProgress } from '../../shared/types';
import { getAppPathSafe } from '../utils/app-path';

const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const RESOURCES_URL = 'https://resources.download.minecraft.net';

export interface VersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersion[];
}

export interface VersionDetails {
  id: string;
  type: string;
  mainClass: string;
  inheritsFrom?: string;
  jar?: string;
  minecraftArguments?: string;
  arguments?: {
    game: any[];
    jvm: any[];
  };
  libraries: Library[];
  assetIndex: {
    id: string;
    sha1: string;
    url: string;
  };
  downloads: {
    client: {
      sha1: string;
      size: number;
      url: string;
    };
  };
  javaVersion?: {
    majorVersion: number;
  };
}

export interface Library {
  name: string;
  url?: string;
  downloads?: {
    artifact?: {
      path: string;
      sha1: string;
      size: number;
      url: string;
    };
    classifiers?: Record<string, {
      path: string;
      sha1: string;
      size: number;
      url: string;
    }>;
  };
  rules?: Array<{
    action: 'allow' | 'disallow';
    os?: { name?: string };
  }>;
  natives?: Record<string, string>;
}

export class MinecraftService {
  private minecraftDir: string;
  private progressCallback?: (progress: DownloadProgress) => void;
  private downloadState = {
    totalBytes: 0,
    downloadedBytes: 0,
    totalFiles: 0,
    downloadedFiles: 0,
    currentFileBytes: 0,
    stage: 'İndiriliyor',
  };

  constructor() {
    this.minecraftDir = this.getDefaultMinecraftDir();
  }

  private getDefaultMinecraftDir(): string {
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(getAppPathSafe('appData'), '.minecraft');
    } else if (platform === 'darwin') {
      return path.join(getAppPathSafe('home'), 'Library', 'Application Support', 'minecraft');
    } else {
      return path.join(getAppPathSafe('home'), '.minecraft');
    }
  }

  setMinecraftDir(dir: string): void {
    this.minecraftDir = dir;
  }

  getMinecraftDir(): string {
    return this.minecraftDir;
  }

  setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  async getVersionManifest(): Promise<VersionManifest> {
    try {
      const response = await axios.get<VersionManifest>(VERSION_MANIFEST_URL, {
        timeout: 15000,
        headers: {
          'User-Agent': 'LoraClient/1.0.0',
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('İnternet bağlantısı bulunamadı');
      }
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error('Bağlantı zaman aşımına uğradı');
      }
      throw new Error(`Sürüm listesi alınamadı: ${error.message || 'Bilinmeyen hata'}`);
    }
  }

  async getVersionDetails(version: MinecraftVersion): Promise<VersionDetails> {
    const response = await axios.get<VersionDetails>(version.url);
    return response.data;
  }

  async getLocalVersionDetails(versionId: string): Promise<VersionDetails> {
    const details = await this.readLocalVersionJson(versionId);
    return await this.resolveVersionInheritance(details);
  }

  private async readLocalVersionJson(versionId: string): Promise<VersionDetails> {
    const versionDir = path.join(this.minecraftDir, 'versions', versionId);
    const jsonPath = path.join(versionDir, `${versionId}.json`);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Version ${versionId} is not installed`);
    }
    return JSON.parse(await fs.promises.readFile(jsonPath, 'utf-8'));
  }

  private async resolveVersionInheritance(details: VersionDetails): Promise<VersionDetails> {
    if (!details.inheritsFrom) {
      return details;
    }

    const parent = await this.readLocalVersionJson(details.inheritsFrom);
    const resolvedParent = await this.resolveVersionInheritance(parent);

    return this.mergeVersionDetails(resolvedParent, details);
  }

  private mergeVersionDetails(parent: VersionDetails, child: VersionDetails): VersionDetails {
    const mergedArguments = this.mergeArguments(parent.arguments, child.arguments);
    const mergedMinecraftArgs = this.mergeMinecraftArguments(
      parent.minecraftArguments,
      child.minecraftArguments
    );

    return {
      ...parent,
      ...child,
      id: child.id,
      minecraftArguments: mergedMinecraftArgs,
      arguments: mergedArguments,
      libraries: [...(parent.libraries || []), ...(child.libraries || [])],
    };
  }

  private mergeArguments(
    parent?: { game: any[]; jvm: any[] },
    child?: { game: any[]; jvm: any[] }
  ): { game: any[]; jvm: any[] } | undefined {
    const game = [...(parent?.game || []), ...(child?.game || [])];
    const jvm = [...(parent?.jvm || []), ...(child?.jvm || [])];

    if (game.length === 0 && jvm.length === 0) {
      return undefined;
    }

    return { game, jvm };
  }

  private mergeMinecraftArguments(parent?: string, child?: string): string | undefined {
    if (parent && child) {
      return `${parent} ${child}`.trim();
    }
    return child || parent;
  }

  async isVersionInstalled(versionId: string): Promise<boolean> {
    const versionDir = path.join(this.minecraftDir, 'versions', versionId);
    const jarPath = path.join(versionDir, `${versionId}.jar`);
    const jsonPath = path.join(versionDir, `${versionId}.json`);
    return fs.existsSync(jarPath) && fs.existsSync(jsonPath);
  }

  async installVersion(versionId: string, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    if (onProgress) this.progressCallback = onProgress;

    const manifest = await this.getVersionManifest();
    const version = manifest.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    const details = await this.getVersionDetails(version);

    this.downloadState = {
      totalBytes: 0,
      downloadedBytes: 0,
      totalFiles: 0,
      downloadedFiles: 0,
      currentFileBytes: 0,
      stage: 'Hesaplanıyor',
    };

    await this.calculateTotalDownloads(details);

    this.downloadState.stage = 'İstemci indiriliyor';
    await this.downloadClient(details);
    
    this.downloadState.stage = 'Kütüphaneler indiriliyor';
    await this.downloadLibraries(details);
    
    this.downloadState.stage = 'Kaynaklar indiriliyor';
    await this.downloadAssets(details);

    const versionDir = path.join(this.minecraftDir, 'versions', versionId);
    const jsonPath = path.join(versionDir, `${versionId}.json`);
    await fs.promises.writeFile(jsonPath, JSON.stringify(details, null, 2));
  }

  private async downloadClient(details: VersionDetails): Promise<void> {
    const versionDir = path.join(this.minecraftDir, 'versions', details.id);
    await fs.promises.mkdir(versionDir, { recursive: true });

    const jarPath = path.join(versionDir, `${details.id}.jar`);
    
    if (await this.verifyFile(jarPath, details.downloads.client.sha1)) {
      return;
    }

    await this.downloadFile(
      details.downloads.client.url,
      jarPath,
      details.downloads.client.size,
      `${details.id}.jar`
    );
  }

  private async downloadLibraries(details: VersionDetails): Promise<void> {
    const libDir = path.join(this.minecraftDir, 'libraries');
    
    for (const lib of details.libraries) {
      if (!this.shouldIncludeLibrary(lib)) continue;

      const artifactInfo = this.getLibraryArtifactInfo(lib);
      if (artifactInfo) {
        const filePath = path.join(libDir, artifactInfo.path);
        const hasValidHash = artifactInfo.sha1
          ? await this.verifyFile(filePath, artifactInfo.sha1)
          : fs.existsSync(filePath);

        if (!hasValidHash) {
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
          if (artifactInfo.url) {
            await this.downloadFile(
              artifactInfo.url,
              filePath,
              artifactInfo.size || 0,
              path.basename(artifactInfo.path)
            );
          }
        }
      }

      if (lib.natives && lib.downloads?.classifiers) {
        const nativeKey = this.getNativeKey(lib.natives);
        if (nativeKey && lib.downloads.classifiers[nativeKey]) {
          const native = lib.downloads.classifiers[nativeKey];
          const filePath = path.join(libDir, native.path);

          if (await this.verifyFile(filePath, native.sha1)) {
            continue;
          }

          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
          await this.downloadFile(native.url, filePath, native.size, path.basename(native.path));
        }
      }
    }
  }

  private async downloadAssets(details: VersionDetails): Promise<void> {
    const indexDir = path.join(this.minecraftDir, 'assets', 'indexes');
    await fs.promises.mkdir(indexDir, { recursive: true });

    const indexPath = path.join(indexDir, `${details.assetIndex.id}.json`);
    
    if (!await this.verifyFile(indexPath, details.assetIndex.sha1)) {
      await this.downloadFile(
        details.assetIndex.url,
        indexPath,
        0,
        `${details.assetIndex.id}.json`
      );
    }

    const indexContent = JSON.parse(await fs.promises.readFile(indexPath, 'utf-8'));
    const objects = indexContent.objects as Record<string, { hash: string; size: number }>;

    const objectsDir = path.join(this.minecraftDir, 'assets', 'objects');

    for (const [, asset] of Object.entries(objects)) {
      const hashPrefix = asset.hash.substring(0, 2);
      const assetPath = path.join(objectsDir, hashPrefix, asset.hash);

      if (await this.verifyFile(assetPath, asset.hash)) {
        continue;
      }

      await fs.promises.mkdir(path.dirname(assetPath), { recursive: true });
      const url = `${RESOURCES_URL}/${hashPrefix}/${asset.hash}`;
      await this.downloadFile(url, assetPath, asset.size, asset.hash.substring(0, 8));
    }
  }

  private shouldIncludeLibrary(lib: Library): boolean {
    if (!lib.rules) return true;

    let dominated = false;
    for (const rule of lib.rules) {
      if (rule.os) {
        const osMatch = this.matchesOS(rule.os.name);
        if (rule.action === 'allow' && osMatch) dominated = true;
        if (rule.action === 'disallow' && osMatch) return false;
      } else {
        dominated = rule.action === 'allow';
      }
    }
    return dominated;
  }

  private matchesOS(osName?: string): boolean {
    if (!osName) return true;
    const platform = process.platform;
    if (osName === 'windows') return platform === 'win32';
    if (osName === 'osx') return platform === 'darwin';
    if (osName === 'linux') return platform === 'linux';
    return false;
  }

  private getNativeKey(natives: Record<string, string>): string | null {
    const platform = process.platform;
    if (platform === 'win32') return natives['windows'];
    if (platform === 'darwin') return natives['osx'];
    if (platform === 'linux') return natives['linux'];
    return null;
  }

  private async verifyFile(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) return false;
      const content = await fs.promises.readFile(filePath);
      const hash = crypto.createHash('sha1').update(content).digest('hex');
      return hash === expectedHash;
    } catch {
      return false;
    }
  }

  private async calculateTotalDownloads(details: VersionDetails): Promise<void> {
    let totalBytes = details.downloads.client.size;
    let totalFiles = 1;

    for (const lib of details.libraries) {
      if (!this.shouldIncludeLibrary(lib)) continue;
      const artifactInfo = this.getLibraryArtifactInfo(lib);
      if (artifactInfo) {
        const filePath = path.join(this.minecraftDir, 'libraries', artifactInfo.path);
        const hasValidHash = artifactInfo.sha1
          ? await this.verifyFile(filePath, artifactInfo.sha1)
          : fs.existsSync(filePath);
        if (!hasValidHash) {
          totalBytes += artifactInfo.size || 0;
          totalFiles++;
        }
      }
      if (lib.natives && lib.downloads?.classifiers) {
        const nativeKey = this.getNativeKey(lib.natives);
        if (nativeKey && lib.downloads.classifiers[nativeKey]) {
          const native = lib.downloads.classifiers[nativeKey];
          const filePath = path.join(this.minecraftDir, 'libraries', native.path);
          if (!await this.verifyFile(filePath, native.sha1)) {
            totalBytes += native.size;
            totalFiles++;
          }
        }
      }
    }

    const indexPath = path.join(this.minecraftDir, 'assets', 'indexes', `${details.assetIndex.id}.json`);
    if (fs.existsSync(indexPath)) {
      try {
        const indexContent = JSON.parse(await fs.promises.readFile(indexPath, 'utf-8'));
        const objects = indexContent.objects as Record<string, { hash: string; size: number }>;
        for (const [, asset] of Object.entries(objects)) {
          const hashPrefix = asset.hash.substring(0, 2);
          const assetPath = path.join(this.minecraftDir, 'assets', 'objects', hashPrefix, asset.hash);
          if (!await this.verifyFile(assetPath, asset.hash)) {
            totalBytes += asset.size;
            totalFiles++;
          }
        }
      } catch {}
    } else {
      totalFiles += 100;
      totalBytes += 100 * 1024 * 1024;
    }

    this.downloadState.totalBytes = totalBytes;
    this.downloadState.totalFiles = totalFiles;
  }

  private emitProgress(): void {
    if (this.progressCallback) {
      const totalDownloaded = this.downloadState.downloadedBytes + this.downloadState.currentFileBytes;
      this.progressCallback({
        currentBytes: totalDownloaded,
        totalBytes: this.downloadState.totalBytes,
        downloadedFiles: this.downloadState.downloadedFiles,
        totalFiles: this.downloadState.totalFiles,
        stage: this.downloadState.stage,
        speed: 0,
      });
    }
  }

  private async downloadFile(url: string, destPath: string, totalSize: number, _filename: string): Promise<void> {
    this.downloadState.currentFileBytes = 0;
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      onDownloadProgress: (progressEvent) => {
        this.downloadState.currentFileBytes = progressEvent.loaded;
        this.emitProgress();
      },
    });

    await fs.promises.writeFile(destPath, Buffer.from(response.data));
    
    this.downloadState.downloadedBytes += totalSize || response.data.byteLength;
    this.downloadState.downloadedFiles++;
    this.downloadState.currentFileBytes = 0;
    this.emitProgress();
  }

  getLibraryPaths(details: VersionDetails): string[] {
    const libDir = path.join(this.minecraftDir, 'libraries');
    const paths: string[] = [];

    for (const lib of details.libraries) {
      if (!this.shouldIncludeLibrary(lib)) continue;

      const artifactInfo = this.getLibraryArtifactInfo(lib);
      if (artifactInfo) {
        paths.push(path.join(libDir, artifactInfo.path));
      }
    }

    const jarId = details.jar || details.id;
    const versionJar = path.join(this.minecraftDir, 'versions', jarId, `${jarId}.jar`);
    paths.push(versionJar);

    return paths;
  }

  getNativesDir(versionId: string): string {
    return path.join(this.minecraftDir, 'versions', versionId, 'natives');
  }

  async extractNatives(details: VersionDetails): Promise<string> {
    const nativesDir = this.getNativesDir(details.id);
    await fs.promises.mkdir(nativesDir, { recursive: true });

    const libDir = path.join(this.minecraftDir, 'libraries');

    for (const lib of details.libraries) {
      if (!lib.natives || !lib.downloads?.classifiers) continue;
      if (!this.shouldIncludeLibrary(lib)) continue;

      const nativeKey = this.getNativeKey(lib.natives);
      if (!nativeKey || !lib.downloads.classifiers[nativeKey]) continue;

      const native = lib.downloads.classifiers[nativeKey];
      const nativePath = path.join(libDir, native.path);

      if (fs.existsSync(nativePath)) {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(nativePath);
        zip.extractAllTo(nativesDir, true);
      }
    }

    return nativesDir;
  }

  async ensureLibraries(details: VersionDetails, onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    if (onProgress) this.progressCallback = onProgress;
    this.downloadState.stage = 'KA¬tA¬phaneler indiriliyor';
    await this.downloadLibraries(details);
  }

  private getLibraryArtifactInfo(
    lib: Library
  ): { path: string; url?: string; sha1?: string; size?: number } | null {
    if (lib.downloads?.artifact) {
      const artifact = lib.downloads.artifact;
      return {
        path: artifact.path,
        url: artifact.url,
        sha1: artifact.sha1,
        size: artifact.size,
      };
    }

    if (lib.name && lib.url) {
      const maven = this.getMavenArtifactPath(lib.name);
      if (!maven) return null;
      const baseUrl = lib.url.endsWith('/') ? lib.url : `${lib.url}/`;
      return {
        path: maven,
        url: `${baseUrl}${maven.replace(/\\/g, '/')}`,
      };
    }

    return null;
  }

  private getMavenArtifactPath(name: string): string | null {
    const parts = name.split(':');
    if (parts.length < 3) return null;

    const group = parts[0];
    const artifact = parts[1];
    const version = parts[2];
    const classifier = parts[3];

    const groupPath = group.replace(/\./g, '/');
    const baseName = classifier
      ? `${artifact}-${version}-${classifier}.jar`
      : `${artifact}-${version}.jar`;

    return path.join(groupPath, artifact, version, baseName);
  }
}

export const minecraftService = new MinecraftService();
