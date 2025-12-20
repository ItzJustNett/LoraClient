# LoraClient - Modern Minecraft Launcher

<p align="center">
  <img src="https://img.shields.io/badge/Electron-22+-blue.svg" alt="Electron">
  <img src="https://img.shields.io/badge/React-18+-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-4.9+-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/Platform-Windows%20|%20macOS%20|%20Linux-lightgrey.svg" alt="Platform">
</p>

<div align="center">
  
**[🇺🇸 English](#english)** | **[🇹🇷 Türkçe](#türkçe)**

</div>

---

## English

**LoraClient** is a modern **offline Minecraft launcher** that combines the powerful features of TLauncher with the sleek design of Lunar Client.

### ✨ Key Features

- 🔥 **Offline Operation** - No Microsoft/Mojang account required
- 🎨 **Modern Design** - Lunar Client inspired minimalist dark theme  
- 📦 **Modrinth Integration** - Easy mod search, download and management
- ⚡ **Optimized Performance** - Fast startup and low resource usage
- 🔧 **Easy Installation** - Drag-and-drop mod loading
- 🚀 **Multi-Platform** - Windows, macOS, Linux support

### 🚀 Quick Start

#### Requirements
- **Node.js** 16+ and **npm** 8+
- **Java** 17+ (for Minecraft)

#### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/loraclient
cd loraclient

# Install dependencies
npm install

# Run in development mode
npm run dev

# Production build
npm run build

# Start the desktop application
npm start
```

### 🛠️ Technology Stack

- **Desktop Framework**: Electron 22+
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State Management**: Zustand
- **Build Tool**: Webpack 5
- **Package Manager**: npm

### 📁 Project Structure

```
LoraClient/
├── src/
│   ├── main/           # Electron main process
│   │   └── index.ts    # Main application file
│   ├── preload/        # Secure IPC bridge
│   │   └── preload.ts  # Preload script
│   ├── renderer/       # React application
│   │   ├── App.tsx     # Main React component
│   │   ├── components/ # UI components
│   │   └── styles/     # CSS files
│   └── shared/         # Shared types and utilities
├── webpack.*.config.js # Webpack configurations
└── package.json        # Project dependencies
```

### 🎯 Development Goals

#### ✅ Completed
- [x] Basic Electron + React setup
- [x] Modern UI design (Lunar Client inspired)
- [x] Custom window controls
- [x] TypeScript support
- [x] Webpack build system

#### 🚧 In Development
- [ ] Minecraft version management
- [ ] Modrinth API integration
- [ ] Mod download system
- [ ] Profile management
- [ ] Java detection

#### 🔮 Future Plans
- [ ] CurseForge support
- [ ] Resource pack management  
- [ ] Shader support
- [ ] Auto-updater
- [ ] Multi-language

### 📋 Commands

```bash
# Development (run all processes)
npm run dev

# Main process only
npm run dev:main

# Preload script only  
npm run dev:preload

# Renderer only (React)
npm run dev:renderer

# Production build
npm run build

# Start Electron app
npm start

# Run tests
npm test

# Linting
npm run lint
npm run lint:fix

# Create Electron package
npm run pack

# Create installer
npm run dist
```

### 🤝 Contributing

1. **Fork** the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

---

## Türkçe

**LoraClient**, TLauncher'ın güçlü özelliklerini Lunar Client'ın şık tasarımıyla birleştiren modern bir **offline Minecraft launcher**'ıdır.

### ✨ Öne Çıkan Özellikler

- 🔥 **Offline Çalışma** - Microsoft/Mojang hesabı gerektirmez
- 🎨 **Modern Tasarım** - Lunar Client tarzı minimalist koyu tema  
- 📦 **Modrinth Entegrasyonu** - Kolay mod arama, indirme ve yönetimi
- ⚡ **Optimize Performans** - Hızlı başlatma ve düşük kaynak kullanımı
- 🔧 **Kolay Kurulum** - Sürükle-bırak mod yükleme
- 🚀 **Çoklu Platform** - Windows, macOS, Linux desteği

### 🚀 Hızlı Başlangıç

#### Gereksinimler
- **Node.js** 16+ ve **npm** 8+
- **Java** 17+ (Minecraft için)

#### Kurulum
```bash
# Projeyi klonla
git clone https://github.com/yourusername/loraclient
cd loraclient

# Dependencies'leri yükle
npm install

# Geliştirme modunda çalıştır
npm run dev

# Production build
npm run build

# Masaüstü uygulamasını çalıştır
npm start
```

### 🛠️ Teknoloji Stack

- **Desktop Framework**: Electron 22+
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State Management**: Zustand
- **Build Tool**: Webpack 5
- **Package Manager**: npm

### 📁 Proje Yapısı

```
LoraClient/
├── src/
│   ├── main/           # Electron ana süreç
│   │   └── index.ts    # Ana uygulama dosyası
│   ├── preload/        # Güvenli IPC köprüsü
│   │   └── preload.ts  # Preload script
│   ├── renderer/       # React uygulaması
│   │   ├── App.tsx     # Ana React komponenti
│   │   ├── components/ # UI bileşenleri
│   │   └── styles/     # CSS dosyaları
│   └── shared/         # Ortak tipler ve utilities
├── webpack.*.config.js # Webpack konfigürasyonları
└── package.json        # Proje bağımlılıkları
```

### 🎯 Geliştirme Hedefleri

#### ✅ Tamamlanan
- [x] Temel Electron + React kurulumu
- [x] Modern UI tasarımı (Lunar Client tarzı)
- [x] Custom window controls
- [x] TypeScript desteği
- [x] Webpack build sistemi

#### 🚧 Geliştirme Aşamasında
- [ ] Minecraft version yönetimi
- [ ] Modrinth API entegrasyonu
- [ ] Mod indirme sistemi
- [ ] Profil yönetimi
- [ ] Java detection

#### 🔮 Gelecek Planları
- [ ] CurseForge desteği
- [ ] Resource pack yönetimi  
- [ ] Shader desteği
- [ ] Auto-updater
- [ ] Multi-language

### 📋 Komutlar

```bash
# Geliştirme (tüm süreçleri çalıştır)
npm run dev

# Sadece main process
npm run dev:main

# Sadece preload script  
npm run dev:preload

# Sadece renderer (React)
npm run dev:renderer

# Production build
npm run build

# Electron uygulamasını çalıştır
npm start

# Test çalıştır
npm test

# Linting
npm run lint
npm run lint:fix

# Electron paketi oluştur
npm run pack

# Installer oluştur
npm run dist
```

### 🤝 Katkıda Bulunma

1. **Fork** edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. **Pull Request** açın

⭐ **Projeyi beğendiyseniz star vermeyi unutmayın!** | **If you like the project, don't forget to star it!**
