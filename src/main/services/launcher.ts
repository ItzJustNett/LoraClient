import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { LaunchOptions } from '../../shared/types';
import { minecraftService, VersionDetails } from './minecraft';

export class LauncherService {
  private gameProcess: ChildProcess | null = null;
  private onLogCallback?: (log: string) => void;
  private onExitCallback?: (code: number | null) => void;

  setLogCallback(callback: (log: string) => void): void {
    this.onLogCallback = callback;
  }

  setExitCallback(callback: (code: number | null) => void): void {
    this.onExitCallback = callback;
  }

  async launch(options: LaunchOptions): Promise<void> {
    const { profile, account, java } = options;

    const versionJsonPath = path.join(
      minecraftService.getMinecraftDir(),
      'versions',
      profile.version,
      `${profile.version}.json`
    );

    if (!fs.existsSync(versionJsonPath)) {
      throw new Error(`Version ${profile.version} is not installed`);
    }

    const versionDetails: VersionDetails = JSON.parse(
      await fs.promises.readFile(versionJsonPath, 'utf-8')
    );

    const nativesDir = await minecraftService.extractNatives(versionDetails);
    const classpath = minecraftService.getLibraryPaths(versionDetails);
    const classpathSeparator = process.platform === 'win32' ? ';' : ':';

    const gameDir = profile.gameDir || minecraftService.getMinecraftDir();
    const assetsDir = path.join(minecraftService.getMinecraftDir(), 'assets');

    const jvmArgs = this.buildJvmArgs(options, nativesDir, classpath.join(classpathSeparator));
    const gameArgs = this.buildGameArgs(versionDetails, account, gameDir, assetsDir, profile);

    const javaExe = process.platform === 'win32'
      ? path.join(java.path, 'bin', 'javaw.exe')
      : path.join(java.path, 'bin', 'java');

    const allArgs = [...jvmArgs, versionDetails.mainClass, ...gameArgs];

    this.log(`Launching Minecraft ${profile.version}`);
    this.log(`Java: ${javaExe}`);
    this.log(`Game Directory: ${gameDir}`);

    this.gameProcess = spawn(javaExe, allArgs, {
      cwd: gameDir,
      detached: false,
    });

    this.gameProcess.stdout?.on('data', (data) => {
      this.log(data.toString());
    });

    this.gameProcess.stderr?.on('data', (data) => {
      this.log(data.toString());
    });

    this.gameProcess.on('exit', (code) => {
      this.log(`Game exited with code: ${code}`);
      this.gameProcess = null;
      if (this.onExitCallback) {
        this.onExitCallback(code);
      }
    });

    this.gameProcess.on('error', (err) => {
      this.log(`Error: ${err.message}`);
    });
  }

  private buildJvmArgs(
    options: LaunchOptions,
    nativesDir: string,
    classpath: string
  ): string[] {
    const { profile } = options;
    const args: string[] = [];

    args.push(`-Xms${profile.memory.min}M`);
    args.push(`-Xmx${profile.memory.max}M`);

    args.push(`-Djava.library.path=${nativesDir}`);
    args.push('-Dminecraft.launcher.brand=LoraClient');
    args.push('-Dminecraft.launcher.version=1.0.0');

    if (profile.jvmArgs) {
      args.push(...profile.jvmArgs.split(' ').filter(a => a));
    }

    args.push('-cp', classpath);

    return args;
  }

  private buildGameArgs(
    details: VersionDetails,
    account: { username: string; uuid: string; accessToken?: string },
    gameDir: string,
    assetsDir: string,
    profile: { version: string; resolution?: { width: number; height: number } }
  ): string[] {
    const args: string[] = [];

    if (details.minecraftArguments) {
      const templateArgs = details.minecraftArguments.split(' ');
      for (const arg of templateArgs) {
        args.push(this.replaceArg(arg, {
          auth_player_name: account.username,
          version_name: profile.version,
          game_directory: gameDir,
          assets_root: assetsDir,
          assets_index_name: details.assetIndex.id,
          auth_uuid: account.uuid,
          auth_access_token: account.accessToken || 'offline',
          user_type: 'legacy',
          version_type: details.type,
        }));
      }
    } else if (details.arguments?.game) {
      for (const arg of details.arguments.game) {
        if (typeof arg === 'string') {
          args.push(this.replaceArg(arg, {
            auth_player_name: account.username,
            version_name: profile.version,
            game_directory: gameDir,
            assets_root: assetsDir,
            assets_index_name: details.assetIndex.id,
            auth_uuid: account.uuid,
            auth_access_token: account.accessToken || 'offline',
            user_type: 'msa',
            version_type: details.type,
          }));
        }
      }
    }

    if (profile.resolution) {
      args.push('--width', profile.resolution.width.toString());
      args.push('--height', profile.resolution.height.toString());
    }

    return args;
  }

  private replaceArg(arg: string, values: Record<string, string>): string {
    let result = arg;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`\${${key}}`, value);
    }
    return result;
  }

  private log(message: string): void {
    if (this.onLogCallback) {
      this.onLogCallback(message);
    }
  }

  isRunning(): boolean {
    return this.gameProcess !== null;
  }

  kill(): void {
    if (this.gameProcess) {
      this.gameProcess.kill();
      this.gameProcess = null;
    }
  }
}

export const launcherService = new LauncherService();
