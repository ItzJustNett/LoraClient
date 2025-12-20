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

    const versionDetails: VersionDetails = await minecraftService.getLocalVersionDetails(profile.version);

    await minecraftService.ensureLibraries(versionDetails);
    const nativesDir = await minecraftService.extractNatives(versionDetails);
    const classpath = minecraftService.getLibraryPaths(versionDetails);
    const classpathSeparator = process.platform === 'win32' ? ';' : ':';

    const gameDir = profile.gameDir || minecraftService.getMinecraftDir();
    const assetsDir = path.join(minecraftService.getMinecraftDir(), 'assets');

    const fullClasspath = classpath.join(classpathSeparator);
    const jvmArgs = this.buildJvmArgs(options, versionDetails, nativesDir, fullClasspath, gameDir, assetsDir);
    const gameArgs = this.buildGameArgs(versionDetails, account, gameDir, assetsDir, profile);

    const javaExe = this.resolveJavaExecutable(java.path);

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
    details: VersionDetails,
    nativesDir: string,
    classpath: string,
    gameDir: string,
    assetsDir: string
  ): string[] {
    const { profile } = options;
    const args: string[] = [];

    args.push(`-Xms${profile.memory.min}M`);
    args.push(`-Xmx${profile.memory.max}M`);

    const values = this.getArgumentValues(
      options.profile,
      options.account,
      details,
      gameDir,
      assetsDir,
      nativesDir,
      classpath
    );
    const features = this.getFeatureFlags(profile);

    const rawJvmArgs = details.arguments?.jvm || [];
    const resolvedJvmArgs = this.resolveArguments(rawJvmArgs, values, features);

    if (!this.hasArgumentPrefix(resolvedJvmArgs, '-Djava.library.path=')) {
      args.push(`-Djava.library.path=${nativesDir}`);
    }

    args.push('-Dminecraft.launcher.brand=LoraClient');
    args.push('-Dminecraft.launcher.version=1.0.0');

    args.push(...resolvedJvmArgs);

    if (profile.jvmArgs) {
      args.push(...profile.jvmArgs.split(' ').filter(a => a));
    }

    if (!this.hasClasspathArg(rawJvmArgs)) {
      args.push('-cp', classpath);
    }

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
    const features = this.getFeatureFlags(profile);

    const values = this.getArgumentValues(
      profile,
      account,
      details,
      gameDir,
      assetsDir,
      minecraftService.getNativesDir(details.id),
      ''
    );

    if (details.minecraftArguments) {
      const templateArgs = details.minecraftArguments.split(' ');
      for (const arg of templateArgs) {
        args.push(this.replaceArg(arg, values));
      }
    } else if (details.arguments?.game) {
      args.push(...this.resolveArguments(details.arguments.game, values, features));
    }

    if (profile.resolution && !this.hasResolutionArgs(details.arguments?.game || [])) {
      args.push('--width', profile.resolution.width.toString());
      args.push('--height', profile.resolution.height.toString());
    }

    return args;
  }

  private replaceArg(arg: string, values: Record<string, string>): string {
    let result = arg;
    for (const [key, value] of Object.entries(values)) {
      result = result.split(`\${${key}}`).join(value);
    }
    return result;
  }

  private resolveArguments(
    args: any[],
    values: Record<string, string>,
    features: Record<string, boolean>
  ): string[] {
    const resolved: string[] = [];

    for (const arg of args) {
      if (typeof arg === 'string') {
        resolved.push(this.replaceArg(arg, values));
        continue;
      }

      if (arg && typeof arg === 'object' && arg.value) {
        if (!this.isRuleAllowed(arg.rules, features)) {
          continue;
        }

        const valuesToAdd = Array.isArray(arg.value) ? arg.value : [arg.value];
        for (const item of valuesToAdd) {
          resolved.push(this.replaceArg(item, values));
        }
      }
    }

    return resolved;
  }

  private isRuleAllowed(rules: any[] | undefined, features: Record<string, boolean>): boolean {
    if (!rules || rules.length === 0) return true;

    let allowed = false;
    for (const rule of rules) {
      if (rule.os && !this.matchesOs(rule.os)) {
        continue;
      }
      if (rule.features && !this.matchesFeatures(rule.features, features)) {
        continue;
      }
      allowed = rule.action === 'allow';
    }

    return allowed;
  }

  private matchesOs(os: { name?: string; arch?: string } | undefined): boolean {
    if (!os) return true;

    if (os.name) {
      const platform = process.platform;
      const name =
        platform === 'win32' ? 'windows' :
        platform === 'darwin' ? 'osx' :
        platform === 'linux' ? 'linux' : platform;
      if (os.name !== name) {
        return false;
      }
    }

    if (os.arch) {
      const arch = process.arch === 'ia32' ? 'x86' : process.arch === 'x64' ? 'x64' : process.arch;
      if (os.arch !== arch) {
        return false;
      }
    }

    return true;
  }

  private matchesFeatures(
    ruleFeatures: Record<string, boolean>,
    features: Record<string, boolean>
  ): boolean {
    for (const [key, value] of Object.entries(ruleFeatures)) {
      if ((features[key] ?? false) !== value) {
        return false;
      }
    }
    return true;
  }

  private getFeatureFlags(profile: { resolution?: { width: number; height: number } }): Record<string, boolean> {
    return {
      is_demo_user: false,
      has_custom_resolution: Boolean(profile.resolution),
      has_quick_plays_support: false,
    };
  }

  private hasArgumentPrefix(args: string[], prefix: string): boolean {
    return args.some(arg => arg.startsWith(prefix));
  }

  private hasClasspathArg(rawArgs: any[]): boolean {
    for (const arg of rawArgs) {
      if (typeof arg === 'string') {
        if (arg === '-cp' || arg.includes('${classpath}')) return true;
      } else if (arg && typeof arg === 'object' && arg.value) {
        const values = Array.isArray(arg.value) ? arg.value : [arg.value];
        if (values.some((v: string) => v === '-cp' || v.includes('${classpath}'))) {
          return true;
        }
      }
    }
    return false;
  }

  private hasResolutionArgs(rawArgs: any[]): boolean {
    for (const arg of rawArgs) {
      if (typeof arg === 'string') {
        if (arg === '--width' || arg === '--height') return true;
      } else if (arg && typeof arg === 'object' && arg.value) {
        const values = Array.isArray(arg.value) ? arg.value : [arg.value];
        if (values.some((v: string) => v === '--width' || v === '--height')) {
          return true;
        }
      }
    }
    return false;
  }

  private getArgumentValues(
    profile: { version: string; resolution?: { width: number; height: number } },
    account: { username: string; uuid: string; accessToken?: string; type?: 'offline' | 'microsoft' },
    details: VersionDetails,
    gameDir: string,
    assetsDir: string,
    nativesDir: string,
    classpath: string
  ): Record<string, string> {
    const librariesDir = path.join(minecraftService.getMinecraftDir(), 'libraries');
    const resolution = profile.resolution || { width: 854, height: 480 };

    return {
      auth_player_name: account.username,
      version_name: profile.version,
      game_directory: gameDir,
      assets_root: assetsDir,
      assets_index_name: details.assetIndex.id,
      auth_uuid: account.uuid,
      auth_access_token: account.accessToken || 'offline',
      user_type: account.type === 'microsoft' ? 'msa' : 'legacy',
      version_type: details.type,
      user_properties: '{}',
      launcher_name: 'LoraClient',
      launcher_version: '1.0.0',
      natives_directory: nativesDir,
      classpath,
      library_directory: librariesDir,
      resolution_width: resolution.width.toString(),
      resolution_height: resolution.height.toString(),
    };
  }

  private resolveJavaExecutable(javaHome: string): string {
    if (process.platform !== 'win32') {
      return path.join(javaHome, 'bin', 'java');
    }

    const javaExe = path.join(javaHome, 'bin', 'java.exe');
    if (fs.existsSync(javaExe)) {
      return javaExe;
    }

    return path.join(javaHome, 'bin', 'javaw.exe');
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
