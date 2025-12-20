import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { JavaInstallation } from '../../shared/types';

const execAsync = promisify(exec);

const COMMON_JAVA_PATHS_WINDOWS = [
  'C:\\Program Files\\Java',
  'C:\\Program Files (x86)\\Java',
  'C:\\Program Files\\Eclipse Adoptium',
  'C:\\Program Files\\Zulu',
  'C:\\Program Files\\Microsoft\\jdk-17',
  'C:\\Program Files\\BellSoft\\LibericaJDK-17',
];

const COMMON_JAVA_PATHS_LINUX = [
  '/usr/lib/jvm',
  '/usr/java',
  '/opt/java',
];

const COMMON_JAVA_PATHS_MAC = [
  '/Library/Java/JavaVirtualMachines',
  '/System/Library/Java/JavaVirtualMachines',
];

export class JavaService {
  async detectJavaInstallations(): Promise<JavaInstallation[]> {
    const installations: JavaInstallation[] = [];
    const platform = process.platform;

    const javaFromPath = await this.getJavaFromPath();
    if (javaFromPath) {
      installations.push(javaFromPath);
    }

    let searchPaths: string[] = [];
    if (platform === 'win32') {
      searchPaths = COMMON_JAVA_PATHS_WINDOWS;
    } else if (platform === 'darwin') {
      searchPaths = COMMON_JAVA_PATHS_MAC;
    } else {
      searchPaths = COMMON_JAVA_PATHS_LINUX;
    }

    for (const basePath of searchPaths) {
      const found = await this.searchJavaInDirectory(basePath);
      installations.push(...found);
    }

    const uniqueInstallations = this.deduplicateInstallations(installations);
    return uniqueInstallations.sort((a, b) => {
      const vA = this.parseVersion(a.version);
      const vB = this.parseVersion(b.version);
      return vB - vA;
    });
  }

  private async getJavaFromPath(): Promise<JavaInstallation | null> {
    try {
      const { stdout } = await execAsync('java -version 2>&1');
      const version = this.parseJavaVersionOutput(stdout);
      if (!version) return null;

      const javaPath = await this.getJavaExecutablePath();
      if (!javaPath) return null;

      const is64Bit = stdout.toLowerCase().includes('64-bit');

      return {
        path: javaPath,
        version,
        is64Bit,
      };
    } catch {
      return null;
    }
  }

  private async getJavaExecutablePath(): Promise<string | null> {
    try {
      const command = process.platform === 'win32' ? 'where java' : 'which java';
      const { stdout } = await execAsync(command);
      const javaPath = stdout.trim().split('\n')[0];
      
      if (process.platform === 'win32') {
        const binDir = path.dirname(javaPath);
        return path.dirname(binDir);
      }
      
      const realPath = fs.realpathSync(javaPath);
      const binDir = path.dirname(realPath);
      return path.dirname(binDir);
    } catch {
      return null;
    }
  }

  private async searchJavaInDirectory(basePath: string): Promise<JavaInstallation[]> {
    const installations: JavaInstallation[] = [];

    try {
      if (!fs.existsSync(basePath)) return [];

      const entries = fs.readdirSync(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const javaHome = path.join(basePath, entry.name);
        const javaBin = process.platform === 'win32'
          ? path.join(javaHome, 'bin', 'java.exe')
          : path.join(javaHome, 'bin', 'java');

        if (fs.existsSync(javaBin)) {
          const info = await this.getJavaInfo(javaHome);
          if (info) {
            installations.push(info);
          }
        }

        if (process.platform === 'darwin') {
          const contentsHome = path.join(javaHome, 'Contents', 'Home');
          if (fs.existsSync(contentsHome)) {
            const info = await this.getJavaInfo(contentsHome);
            if (info) {
              installations.push(info);
            }
          }
        }
      }
    } catch {
    }

    return installations;
  }

  private async getJavaInfo(javaHome: string): Promise<JavaInstallation | null> {
    try {
      const javaBin = process.platform === 'win32'
        ? path.join(javaHome, 'bin', 'java.exe')
        : path.join(javaHome, 'bin', 'java');

      const { stdout } = await execAsync(`"${javaBin}" -version 2>&1`);
      const version = this.parseJavaVersionOutput(stdout);
      if (!version) return null;

      const is64Bit = stdout.toLowerCase().includes('64-bit');

      return {
        path: javaHome,
        version,
        is64Bit,
      };
    } catch {
      return null;
    }
  }

  private parseJavaVersionOutput(output: string): string | null {
    const patterns = [
      /version "(\d+)"/,
      /version "1\.(\d+)\./,
      /version "(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1].startsWith('1.') ? match[1] : match[1];
      }
    }

    return null;
  }

  private parseVersion(version: string): number {
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 0;
    return major;
  }

  private deduplicateInstallations(installations: JavaInstallation[]): JavaInstallation[] {
    const seen = new Set<string>();
    return installations.filter(inst => {
      const key = inst.path.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getRecommendedJava(installations: JavaInstallation[], minecraftVersion: string): JavaInstallation | null {
    if (installations.length === 0) return null;

    const versionNum = this.parseMinecraftVersion(minecraftVersion);
    
    let requiredMajor = 8;
    if (versionNum >= 1.18) requiredMajor = 17;
    else if (versionNum >= 1.17) requiredMajor = 16;

    const compatible = installations.filter(inst => {
      const major = this.parseVersion(inst.version);
      return major >= requiredMajor && inst.is64Bit;
    });

    if (compatible.length > 0) {
      return compatible[0];
    }

    return installations.find(i => i.is64Bit) || installations[0];
  }

  private parseMinecraftVersion(version: string): number {
    const match = version.match(/1\.(\d+)/);
    if (match) {
      return 1 + parseInt(match[1]) / 100;
    }
    return 1.0;
  }
}

export const javaService = new JavaService();
