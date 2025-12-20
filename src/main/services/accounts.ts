import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { Account, MicrosoftAuthResult } from '../../shared/types';

interface AccountStore {
  accounts: Account[];
  selectedAccountId: string | null;
}

const store = new Store<AccountStore>({
  name: 'accounts',
  defaults: {
    accounts: [],
    selectedAccountId: null,
  },
});

export class AccountService {
  getAllAccounts(): Account[] {
    return store.get('accounts', []);
  }

  getAccount(id: string): Account | undefined {
    const accounts = this.getAllAccounts();
    return accounts.find(a => a.id === id);
  }

  getSelectedAccount(): Account | undefined {
    const selectedId = store.get('selectedAccountId');
    if (!selectedId) return undefined;
    return this.getAccount(selectedId);
  }

  setSelectedAccount(id: string): void {
    store.set('selectedAccountId', id);
  }

  createOfflineAccount(username: string): Account {
    const existingAccounts = this.getAllAccounts();
    const existing = existingAccounts.find(
      a => a.type === 'offline' && a.username.toLowerCase() === username.toLowerCase()
    );
    
    if (existing) {
      this.setSelectedAccount(existing.id);
      return existing;
    }

    const account: Account = {
      id: uuidv4(),
      username,
      type: 'offline',
      uuid: this.generateOfflineUUID(username),
    };

    const accounts = this.getAllAccounts();
    accounts.push(account);
    store.set('accounts', accounts);
    store.set('selectedAccountId', account.id);

    return account;
  }

  private generateOfflineUUID(username: string): string {
    const md5 = require('crypto').createHash('md5');
    const hash = md5.update(`OfflinePlayer:${username}`).digest('hex');
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      '3' + hash.substring(13, 16),
      hash.substring(16, 20),
      hash.substring(20, 32),
    ].join('-');
  }

  updateAccount(id: string, data: Partial<Account>): Account | null {
    const accounts = this.getAllAccounts();
    const index = accounts.findIndex(a => a.id === id);
    
    if (index === -1) return null;

    accounts[index] = { ...accounts[index], ...data };
    store.set('accounts', accounts);

    return accounts[index];
  }

  deleteAccount(id: string): boolean {
    const accounts = this.getAllAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    
    if (filtered.length === accounts.length) return false;

    store.set('accounts', filtered);

    const selectedId = store.get('selectedAccountId');
    if (selectedId === id) {
      store.set('selectedAccountId', filtered.length > 0 ? filtered[0].id : null);
    }

    return true;
  }

  hasAccounts(): boolean {
    return this.getAllAccounts().length > 0;
  }

  createMicrosoftAccount(authResult: MicrosoftAuthResult): Account {
    const existingAccounts = this.getAllAccounts();
    const existing = existingAccounts.find(
      a => a.type === 'microsoft' && a.uuid === authResult.uuid
    );

    if (existing) {
      const updated = this.updateAccount(existing.id, {
        username: authResult.username,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiresAt: Date.now() + authResult.expiresIn * 1000,
        skinUrl: authResult.skinUrl,
      });
      this.setSelectedAccount(existing.id);
      return updated || existing;
    }

    const account: Account = {
      id: uuidv4(),
      username: authResult.username,
      type: 'microsoft',
      uuid: authResult.uuid,
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      expiresAt: Date.now() + authResult.expiresIn * 1000,
      skinUrl: authResult.skinUrl,
    };

    const accounts = this.getAllAccounts();
    accounts.push(account);
    store.set('accounts', accounts);
    store.set('selectedAccountId', account.id);

    return account;
  }
}

export const accountService = new AccountService();
