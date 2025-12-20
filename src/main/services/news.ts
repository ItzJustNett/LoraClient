import axios from 'axios';
import { NewsItem } from '../../shared/types';

const MINECRAFT_NEWS_URL = 'https://launchercontent.mojang.com/news.json';

export class NewsService {
  private cachedNews: NewsItem[] = [];
  private lastFetch: number = 0;
  private cacheTimeout = 5 * 60 * 1000;

  async getNews(): Promise<NewsItem[]> {
    const now = Date.now();
    if (this.cachedNews.length > 0 && now - this.lastFetch < this.cacheTimeout) {
      return this.cachedNews;
    }

    try {
      const response = await axios.get(MINECRAFT_NEWS_URL, { timeout: 10000 });
      const entries = response.data.entries || [];

      this.cachedNews = entries.slice(0, 10).map((entry: any, index: number) => ({
        id: entry.id || `news-${index}`,
        title: entry.title || 'Minecraft Haberi',
        description: entry.text || entry.body || '',
        imageUrl: entry.playPageImage?.url 
          ? `https://launchercontent.mojang.com${entry.playPageImage.url}`
          : entry.newsPageImage?.url
            ? `https://launchercontent.mojang.com${entry.newsPageImage.url}`
            : undefined,
        date: entry.date || new Date().toISOString(),
        url: entry.readMoreLink || entry.linkUrl || undefined,
        category: this.categorizeNews(entry),
      }));

      this.lastFetch = now;
      return this.cachedNews;
    } catch {
      return this.getDefaultNews();
    }
  }

  private categorizeNews(entry: any): 'update' | 'news' | 'event' {
    const title = (entry.title || '').toLowerCase();
    const tag = (entry.tag || '').toLowerCase();

    if (title.includes('snapshot') || title.includes('release') || tag.includes('patch')) {
      return 'update';
    }
    if (title.includes('event') || title.includes('live') || tag.includes('event')) {
      return 'event';
    }
    return 'news';
  }

  private getDefaultNews(): NewsItem[] {
    return [
      {
        id: 'welcome',
        title: 'LoraClient\'a Hosgeldiniz!',
        description: 'Modern ve hizli Minecraft launcher deneyimi icin dogru yerdesiniz.',
        date: new Date().toISOString(),
        category: 'news',
      },
      {
        id: 'offline',
        title: 'Cevrimdisi Mod',
        description: 'Internet baglantisi olmadan da oyun oynayabilirsiniz.',
        date: new Date().toISOString(),
        category: 'news',
      },
    ];
  }

  async getLatestVersion(): Promise<{ id: string; type: string } | null> {
    try {
      const response = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
      return {
        id: response.data.latest.release,
        type: 'release',
      };
    } catch {
      return null;
    }
  }
}

export const newsService = new NewsService();
