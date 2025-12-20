export const tr = {
  common: {
    play: 'Oyna',
    create: 'Oluştur',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    refresh: 'Yenile',
    clear: 'Temizle',
    close: 'Kapat',
    loading: 'Yükleniyor...',
    selected: 'Seçili',
    or: 'veya',
    beta: 'BETA',
    systemReady: 'Sistem hazır',
  },

  nav: {
    home: 'Ana Sayfa',
    profiles: 'Profiller',
    versions: 'Sürümler',
    settings: 'Ayarlar',
  },

  sidebar: {
    addAccount: 'Hesap Ekle',
    login: 'Giriş yapın',
    microsoft: 'Microsoft',
    offline: 'Çevrimdışı',
  },

  home: {
    title: 'Ana Sayfa',
    subtitle: 'Oyuna hızlıca başlayın',
    quickStart: 'Hızlı Başlat',
    otherProfiles: 'Diğer Profiller',
    logs: 'Loglar',
    launching: 'Başlatılıyor',
    createProfile: 'Yeni profil oluştur',
    startPlaying: 'Minecraft oynamaya başlayın',
  },

  profiles: {
    title: 'Profiller',
    subtitle: 'Oyun profillerinizi yönetin',
    newProfile: 'Yeni Profil',
    noProfiles: 'Henüz profil oluşturmadınız',
    createFirst: 'İlk profilini oluştur',
    openFolder: 'Klasörü Aç',
    editProfile: 'Profili Düzenle',
  },

  versions: {
    title: 'İndirilen Sürümler',
    subtitle: 'Yüklü Minecraft sürümlerini yönetin',
    noVersions: 'Henüz indirilen sürüm yok',
  },

  settings: {
    title: 'Ayarlar',
    subtitle: 'Launcher ayarlarını yapılandırın',
    defaultMemory: 'Varsayılan Bellek',
    minRam: 'Minimum RAM (MB)',
    maxRam: 'Maksimum RAM (MB)',
    application: 'Uygulama',
    closeOnLaunch: 'Oyun başladığında launcher\'ı kapat',
    closeOnLaunchDesc: 'Oyun açıldığında launcher kapanır',
    minimizeOnLaunch: 'Oyun başladığında simge durumuna küçült',
    minimizeOnLaunchDesc: 'Launcher arka planda çalışır',
    showSnapshots: 'Snapshot sürümleri göster',
    showSnapshotsDesc: 'Sürüm seçerken snapshot\'ları gösterir',
    folders: 'Klasörler',
    about: 'Hakkında',
    aboutText: 'LoraClient v1.0.0 - Modern Minecraft Launcher',
    language: 'Dil',
    languageDesc: 'Arayüz dilini seçin',
  },

  account: {
    title: 'Hesap Yönetimi',
    savedAccounts: 'Kayıtlı Hesaplar',
    addNew: 'Yeni Hesap Ekle',
    microsoftLogin: 'Microsoft ile Giriş',
    loggingIn: 'Giriş yapılıyor...',
    offlineUsername: 'Çevrimdışı kullanıcı adı',
    addOffline: 'Çevrimdışı Hesap Ekle',
    loginFailed: 'Microsoft girişi başarısız',
  },

  profile: {
    title: 'Yeni Profil',
    editTitle: 'Profili Düzenle',
    name: 'Profil Adı',
    namePlaceholder: 'Profil adı',
    minecraftVersion: 'Minecraft Sürümü',
    modLoader: 'Mod Loader',
    selectVersion: 'Sürüm seçin',
    stable: 'Stabil',
    minRam: 'Min RAM (MB)',
    maxRam: 'Max RAM (MB)',
  },

  logs: {
    title: 'Oyun Logları',
    noLogs: 'Henüz log yok',
  },

  time: {
    neverPlayed: 'Hiç oynamadı',
    justNow: 'Az önce',
    hoursAgo: '{count} saat önce',
    daysAgo: '{count} gün önce',
    weeksAgo: '{count} hafta önce',
  },

  errors: {
    selectProfile: 'Lütfen bir profil seçin',
  },
};

export type TranslationKeys = typeof tr;
