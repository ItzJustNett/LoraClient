import { app } from 'electron';
import * as path from 'path';

type AppPathName = 'appData' | 'home' | 'userData';

export function getAppPathSafe(name: AppPathName): string {
  try {
    if (app && typeof app.getPath === 'function') {
      return app.getPath(name);
    }
  } catch {}

  const home = process.env.HOME || process.env.USERPROFILE || process.cwd();
  const appData = process.env.APPDATA || process.env.LOCALAPPDATA || home;

  if (name === 'home') return home;
  if (name === 'userData') return path.join(appData, 'LoraClient');
  return appData;
}
