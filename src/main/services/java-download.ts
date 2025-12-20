import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { JavaInstallation, DownloadProgress } from '../../shared/types';
import { settingsService } from './settings';

const ADOPTIUM_API = 'https://api.adoptium.net/v3';

interface AdoptiumRelease {
  binary: {
    architecture: string;
    download_count: number;
    heap_size: string;
    image_type: string;
    jvm_impl: string;
    os: string;
    package: {
      checksum: string;
      checksum_link: string;
      download_count: number;
      link: string;
      metadata_link: string;
      name: string;
      size: number;
    };
    project: string;
    scm_ref: string;
    updated_at: string;
  };
  release_name: string;
  vendor: string;
  version: {
    build: number;
    major: number;
    minor: number;
    openjdk_version: string;
    security: number;
    semver: string;
  };
}

export class JavaDownloadService {
  private progressCallback?: (progress: DownloadProgress) => void;

  setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  async getAvailableJavaVersions(): Promise<number[]> {
    try {
      const response = await axios.get(`${ADOPTIUM_API}/info/available_releases`);
      return response.data.available_releases || [8, 11, 17, 21];
    } catch {
      return [8, 11, 17, 21];
    }
  }

  async getLatestJavaRelease(majorVersion: number): Promise<AdoptiumRelease | null> {
    const os = this.getOS();
    const arch = this.getArch();

    try {
      const response = await axios.get(
        `${ADOPTIUM_API}/assets/latest/${majorVersion}/hotspot`,
        {
          params: {
            architecture: arch,
            image_type: 'jre',
            os: os,
            vendor: 'eclipse',
          },
        }
      );

      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  private getOS(): string {
    switch (process.platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'mac';
      case 'linux':
        return 'linux';
      default:
        return 'windows';
    }
  }

  private getArch(): string {
    switch (process.arch) {
      case 'x64':
        return 'x64';
      case 'arm64':
        return 'aarch64';
      case 'ia32':
        return 'x86';
      default:
        return 'x64';
    }
  }

  async downloadJava(majorVersion: number): Promise<JavaInstallation | null> {
    const release = await this.getLatestJavaRelease(majorVersion);
    if (!release) {
      throw new Error(`Java ${majorVersion} bulunamadi`);
    }

    const javaDir = settingsService.getJavaDir();
    const versionDir = path.join(javaDir, `java-${majorVersion}`);

    if (fs.existsSync(versionDir)) {
      const existingJava = await this.verifyJavaInstallation(versionDir);
      if (existingJava) {
        return existingJava;
      }
    }

    await fs.promises.mkdir(javaDir, { recursive: true });

    const downloadUrl = release.binary.package.link;
    const fileName = release.binary.package.name;
    const downloadPath = path.join(javaDir, fileName);

    this.emitProgress('Java indiriliyor', 0, release.binary.package.size);

    await this.downloadFile(downloadUrl, downloadPath, release.binary.package.size);

    const expectedChecksum = release.binary.package.checksum;
    const actualChecksum = await this.calculateChecksum(downloadPath);

    if (actualChecksum !== expectedChecksum) {
      await fs.promises.unlink(downloadPath);
      throw new Error('Java dosyasi dogrulanamadi');
    }

    this.emitProgress('Java cikartiliyor', release.binary.package.size, release.binary.package.size);

    await this.extractArchive(downloadPath, javaDir);
    await fs.promises.unlink(downloadPath);

    const extractedDir = await this.findExtractedJavaDir(javaDir, majorVersion);
    if (extractedDir && extractedDir !== versionDir) {
      if (fs.existsSync(versionDir)) {
        await fs.promises.rm(versionDir, { recursive: true });
      }
      await fs.promises.rename(extractedDir, versionDir);
    }

    return this.verifyJavaInstallation(versionDir);
  }

  private async downloadFile(url: string, destPath: string, totalSize: number): Promise<void> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      onDownloadProgress: (progressEvent) => {
        this.emitProgress('Java indiriliyor', progressEvent.loaded, totalSize);
      },
    });

    await fs.promises.writeFile(destPath, Buffer.from(response.data));
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const content = await fs.promises.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async extractArchive(archivePath: string, destDir: string): Promise<void> {
    const AdmZip = require('adm-zip');

    if (archivePath.endsWith('.zip')) {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(destDir, true);
    } else if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
      const tar = require('tar');
      await tar.extract({
        file: archivePath,
        cwd: destDir,
      });
    }
  }

  private async findExtractedJavaDir(baseDir: string, majorVersion: number): Promise<string | null> {
    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.includes('jdk') || entry.name.includes('jre')) {
        const fullPath = path.join(baseDir, entry.name);
        const binPath = process.platform === 'darwin'
          ? path.join(fullPath, 'Contents', 'Home', 'bin', 'java')
          : path.join(fullPath, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');

        if (fs.existsSync(binPath)) {
          return process.platform === 'darwin'
            ? path.join(fullPath, 'Contents', 'Home')
            : fullPath;
        }
      }
    }

    return null;
  }

  private async verifyJavaInstallation(javaHome: string): Promise<JavaInstallation | null> {
    const javaBin = process.platform === 'win32'
      ? path.join(javaHome, 'bin', 'java.exe')
      : path.join(javaHome, 'bin', 'java');

    if (!fs.existsSync(javaBin)) {
      return null;
    }

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(`"${javaBin}" -version 2>&1`);
      const versionMatch = stdout.match(/version "(\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      const is64Bit = stdout.toLowerCase().includes('64-bit');

      return {
        path: javaHome,
        version,
        is64Bit,
        vendor: 'Eclipse Adoptium',
        isManaged: true,
      };
    } catch {
      return null;
    }
  }

  private emitProgress(stage: string, current: number, total: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        currentBytes: current,
        totalBytes: total,
        downloadedFiles: 0,
        totalFiles: 1,
        stage,
        speed: 0,
      });
    }
  }

  async getRecommendedJavaVersion(minecraftVersion: string): Promise<number> {
    const match = minecraftVersion.match(/1\.(\d+)/);
    if (!match) return 17;

    const minor = parseInt(match[1]);

    if (minor >= 21) return 21;
    if (minor >= 18) return 17;
    if (minor >= 17) return 16;
    return 8;
  }

  async ensureJavaForMinecraft(minecraftVersion: string): Promise<JavaInstallation> {
    const recommendedVersion = await this.getRecommendedJavaVersion(minecraftVersion);
    const javaDir = settingsService.getJavaDir();
    const versionDir = path.join(javaDir, `java-${recommendedVersion}`);

    const existing = await this.verifyJavaInstallation(versionDir);
    if (existing) {
      return existing;
    }

    const downloaded = await this.downloadJava(recommendedVersion);
    if (!downloaded) {
      throw new Error(`Java ${recommendedVersion} indirilemedi`);
    }

    return downloaded;
  }

  async getManagedJavaInstallations(): Promise<JavaInstallation[]> {
    const javaDir = settingsService.getJavaDir();
    const installations: JavaInstallation[] = [];

    if (!fs.existsSync(javaDir)) {
      return installations;
    }

    const entries = await fs.promises.readdir(javaDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('java-')) {
        const fullPath = path.join(javaDir, entry.name);
        const installation = await this.verifyJavaInstallation(fullPath);
        if (installation) {
          installations.push(installation);
        }
      }
    }

    return installations;
  }
}

export const javaDownloadService = new JavaDownloadService();
