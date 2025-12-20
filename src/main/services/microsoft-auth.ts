import { BrowserWindow, shell } from 'electron';
import axios from 'axios';
import { Account, MicrosoftAuthResult } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const MICROSOFT_CLIENT_ID = '00000000402b5328';
const REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf';
const MICROSOFT_AUTH_URL = 'https://login.live.com/oauth20_authorize.srf';
const MICROSOFT_TOKEN_URL = 'https://login.live.com/oauth20_token.srf';
const XBOX_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MINECRAFT_AUTH_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MINECRAFT_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile';

export class MicrosoftAuthService {
  private authWindow: BrowserWindow | null = null;

  async loginWithMicrosoft(): Promise<MicrosoftAuthResult> {
    const authCode = await this.getMicrosoftAuthCode();
    const microsoftTokens = await this.getMicrosoftTokens(authCode);
    const xboxToken = await this.getXboxToken(microsoftTokens.access_token);
    const xstsToken = await this.getXSTSToken(xboxToken.Token);
    const minecraftAuth = await this.getMinecraftToken(xstsToken.Token, xstsToken.DisplayClaims.xui[0].uhs);
    const profile = await this.getMinecraftProfile(minecraftAuth.access_token);

    return {
      accessToken: minecraftAuth.access_token,
      refreshToken: microsoftTokens.refresh_token,
      expiresIn: minecraftAuth.expires_in,
      username: profile.name,
      uuid: profile.id,
      skinUrl: profile.skins?.[0]?.url,
    };
  }

  private getMicrosoftAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = new URL(MICROSOFT_AUTH_URL);
      authUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', 'XboxLive.signin offline_access');

      this.authWindow = new BrowserWindow({
        width: 500,
        height: 650,
        show: true,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      this.authWindow.setMenu(null);
      this.authWindow.loadURL(authUrl.toString());

      this.authWindow.webContents.on('will-redirect', (event, url) => {
        this.handleRedirect(url, resolve, reject);
      });

      this.authWindow.webContents.on('will-navigate', (event, url) => {
        this.handleRedirect(url, resolve, reject);
      });

      this.authWindow.on('closed', () => {
        this.authWindow = null;
        reject(new Error('Kimlik doğrulama penceresi kapatıldı'));
      });
    });
  }

  private handleRedirect(
    url: string,
    resolve: (code: string) => void,
    reject: (error: Error) => void
  ): void {
    if (url.startsWith(REDIRECT_URI)) {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (this.authWindow) {
        this.authWindow.close();
        this.authWindow = null;
      }

      if (error) {
        reject(new Error(`Microsoft kimlik doğrulama hatası: ${error}`));
      } else if (code) {
        resolve(code);
      } else {
        reject(new Error('Kimlik doğrulama kodu alınamadı'));
      }
    }
  }

  private async getMicrosoftTokens(code: string): Promise<{ access_token: string; refresh_token: string }> {
    const params = new URLSearchParams();
    params.append('client_id', MICROSOFT_CLIENT_ID);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', REDIRECT_URI);

    const response = await axios.post(MICROSOFT_TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }

  async refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const params = new URLSearchParams();
    params.append('client_id', MICROSOFT_CLIENT_ID);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await axios.post(MICROSOFT_TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }

  private async getXboxToken(accessToken: string): Promise<{ Token: string; DisplayClaims: any }> {
    const response = await axios.post(XBOX_AUTH_URL, {
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${accessToken}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    return response.data;
  }

  private async getXSTSToken(xboxToken: string): Promise<{ Token: string; DisplayClaims: { xui: Array<{ uhs: string }> } }> {
    const response = await axios.post(XSTS_AUTH_URL, {
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xboxToken],
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
    }, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    return response.data;
  }

  private async getMinecraftToken(xstsToken: string, userHash: string): Promise<{ access_token: string; expires_in: number }> {
    const response = await axios.post(MINECRAFT_AUTH_URL, {
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  }

  private async getMinecraftProfile(accessToken: string): Promise<{ id: string; name: string; skins?: Array<{ url: string }> }> {
    const response = await axios.get(MINECRAFT_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  }

  async refreshAccount(account: Account): Promise<Account | null> {
    if (account.type !== 'microsoft' || !account.refreshToken) {
      return null;
    }

    try {
      const tokens = await this.refreshMicrosoftToken(account.refreshToken);
      const xboxToken = await this.getXboxToken(tokens.access_token);
      const xstsToken = await this.getXSTSToken(xboxToken.Token);
      const minecraftAuth = await this.getMinecraftToken(xstsToken.Token, xstsToken.DisplayClaims.xui[0].uhs);
      const profile = await this.getMinecraftProfile(minecraftAuth.access_token);

      return {
        ...account,
        accessToken: minecraftAuth.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + minecraftAuth.expires_in * 1000,
        username: profile.name,
        uuid: profile.id,
        skinUrl: profile.skins?.[0]?.url,
      };
    } catch {
      return null;
    }
  }

  async getSkinUrl(uuid: string): Promise<string | null> {
    try {
      const response = await axios.get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      const properties = response.data.properties?.find((p: any) => p.name === 'textures');
      if (properties) {
        const decoded = JSON.parse(Buffer.from(properties.value, 'base64').toString('utf-8'));
        return decoded.textures?.SKIN?.url || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const microsoftAuthService = new MicrosoftAuthService();
