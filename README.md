<div align="center">
  <img src="public/warden-cat-original.png" alt="Warden AI Logo" width="160" height="160" />
  <h1>Warden AI</h1>
  <p><strong>Next-Generation Local-First AI Roleplay & Character Creation Platform</strong></p>
  <p><em>Zero Telemetry &bull; Multi-Scenario Storytelling &bull; SillyTavern CCv2 Protocol &bull; Universal BYOK &bull; Mobile-First (Capacitor 8)</em></p>

  <p>
    <a href="#key-features"><img src="https://img.shields.io/badge/Privacy-Zero%20Telemetry%20%2F%20Local--First-10b981?style=for-the-badge&logo=shield" alt="Zero Telemetry" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react" alt="React 19" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/TypeScript-7.0-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/Tailwind-v4.3-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS v4" /></a>
    <a href="#mobile-app-build-android"><img src="https://img.shields.io/badge/Capacitor-8.6%20(Android)-1192d3?style=for-the-badge&logo=capacitor" alt="Capacitor 8" /></a>
    <a href="#license"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="License" /></a>
  </p>
</div>

---

## 📖 Overview

**Warden AI** is a state-of-the-art, privacy-centric AI roleplay platform and character creation studio. Unlike corporate AI services that monitor, log, and train on your personal chats, Warden AI is engineered from the ground up on a **100% local-first, zero-telemetry architecture**:

- **Your Device, Your Vault**: All conversations, character cards, persona identities, and API credentials remain securely stored in your device's physical storage (IndexedDB and secure local vault).
- **Direct LLM Connections**: Your device connects directly to your chosen AI providers via Bring-Your-Own-Key (BYOK). Zero intermediary servers inspect or intercept your prompts.
- **Cross-Platform**: Runs seamlessly as a blazing-fast web app (Vite 8 + React 19) and as a hardware-accelerated native Android application via Capacitor 8 with 120fps spring physics.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
  - [1. Multi-Scenario Roleplay Engine](#1-multi-scenario-roleplay-engine)
  - [2. Universal BYOK & Deep Reasoning Controls](#2-universal-byok--deep-reasoning-controls)
  - [3. SillyTavern CCv2 Protocol & Community Catalogs](#3-sillytavern-ccv2-protocol--community-catalogs)
  - [4. Local-First Zero-Leak Architecture](#4-local-first-zero-leak-architecture)
  - [5. Character Studio & 11-Category Taxonomy](#5-character-studio--11-category-taxonomy)
  - [6. Community Reviews, Forking & Card Exports](#6-community-reviews-forking--card-exports)
  - [7. Native Mobile Experience (Capacitor 8)](#7-native-mobile-experience-capacitor-8)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Configuring API Keys](#configuring-api-keys)
  - [Running the Community Proxy (Optional)](#running-the-community-proxy-optional)
- [Mobile App Build (Android)](#-mobile-app-build-android)
- [Contributing Guidelines](#-contributing-guidelines)
  - [Code of Conduct & Safety](#code-of-conduct--safety)
  - [Branching & Commit Conventions](#branching--commit-conventions)
  - [Development Workflow](#development-workflow)
  - [Pull Request Checklist](#pull-request-checklist)
- [License](#-license)

---

## ✨ Key Features

### 1. Multi-Scenario Roleplay Engine
- **Non-Linear Storytelling**: Characters aren't limited to a single static greeting. Creators can bundle multiple alternate scenarios, time skips, alternate universes (AU), and branching plot hooks.
- **Interactive Persona Studio**: Switch between different user personas dynamically mid-story or set default personas per character with custom avatars, display names, pronouns, and backstories.
- **Dynamic Lorebooks & Worldbooks**: Keyword-triggered contextual memory injection seamlessly brings world lore, faction politics, and companion secrets into context when mentioned in conversation.
- **Checkpointed Narrative Memory**: Intelligent context compaction generates narrative recaps at conversational milestones without sacrificing nuanced character dynamics or overflowing prompt limits.
- **Swipe & Branch Regeneration**: Easily swipe left/right on any AI response to generate alternative branches, edit responses inline, or modify your previous dialogue.

### 2. Universal BYOK & Deep Reasoning Controls
- **Direct Provider Integration**: Bring your own keys for:
  - **Google Gemini**: Gemini 2.5 Flash, 2.5 Pro, 2.0 Flash Thinking, 1.5 Pro/Flash
  - **OpenAI**: GPT-4o, GPT-4o-mini, o1, o3-mini
  - **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
  - **DeepSeek**: DeepSeek-V3, DeepSeek-R1 (with live reasoning toggle)
  - **Groq**: Llama 3.3 70B, Mixtral 8x7B (ultra-low latency generation)
  - **Mistral AI**: Mistral Large, Codestral
  - **OpenRouter**: Access hundreds of community and open-weights models
  - **Local Endpoints**: Connect to local LLMs hosted on **Ollama**, **LM Studio**, or **vLLM** via custom OpenAI-compatible endpoints.
- **Live Thought & Reasoning Streaming**: Real-time rendering of model thinking tokens (`<thought>` / reasoning process) with collapsible thought panels, customizable reasoning budgets, and temperature sliders.
- **Real-Time Token & Cost Estimation**: Live prompt/completion token counting and pricing calculation to keep you informed of API spending.

### 3. SillyTavern CCv2 Protocol & Community Catalogs
- **Embedded Datacat Hub View**: Browse community character catalogs directly inside Warden with a native SillyTavern postMessage bridge, 1-tap card import, and zoomable responsive preview.
- **Janitor AI Integration**: Live community card feed with automatic card parsing, avatar preservation, and 1-click import.
- **PNG Chunk Metadata Engine**: Extracts and encodes character card metadata stored inside PNG chunks (`tEXt`, `zTXt`, `iTXt`), supporting:
  - Tavern Card V1 & V2 specifications
  - Character Card V3 standard
  - Native Warden AI Multi-Scenario schema
- **1-Click Card Exporter**:
  - Export as SillyTavern-compatible PNG character cards with embedded metadata.
  - Export as raw CCv2 JSON cards.
  - Export as Warden AI Native packages (`.json` with multi-scenario and lorebooks intact).
  - Export as copy-paste formatted text for Janitor AI character creator.

### 4. Local-First Zero-Leak Architecture
- **Zero Chat Telemetry**: Warden AI never uploads, logs, trains on, or sells your private conversations. All data lives in your browser / device storage.
- **Storage Vault & Auditor**: Built-in inspector under *Settings > Privacy & Security* lets you audit physical disk usage, inspect every stored key-value pair, and export/wipe your entire database in 1 click.
- **Direct API Dispatch**: AI network calls are made directly from your browser/device to provider endpoints (or through an optional local user proxy to bypass CORS when running in restrictive browser contexts).

### 5. Character Studio & 11-Category Taxonomy
- **Visual Character Studio**: Easily configure name, personality, appearance, scenario, greeting message, example dialogues, lorebook associations, and NSFW flags.
- **11-Category Taxonomy**:
  - 🎭 Anime & Manga
  - 🎮 Video Games
  - ⚔️ Fantasy & High Lore
  - 🚀 Sci-Fi & Cyberpunk
  - 💖 Romance & Drama
  - 🕯️ Horror & Mystery
  - ☕ Slice of Life
  - 📜 Historical & Mythological
  - 🤖 Helpers & Companions
  - 🌟 Original Characters (OC)
  - 🎲 Tabletop & RPGs

### 6. Community Reviews, Forking & Card Exports
- **5-Star Rating & Review System**: Rate and review community characters with verified creator badges and helpfulness votes.
- **Character Forking / Duplication**: Clone any public or imported character into your local library with 1 click to tweak prompts, add personal scenarios, or tune system instructions.
- **Creator Profiles**: Follow your favorite creators, browse their public roster, and share your own cards with the community.

### 7. Native Mobile Experience (Capacitor 8)
- **Capacitor 8 Android Build**: Compiled native Android wrapper with full hardware acceleration.
- **120fps Spring Animations**: Smooth page transitions and modal springs powered by Motion's `popLayout` engine.
- **Custom Opening Splash Screen**: Native boot animation featuring ambient glow bloom and spring scale entrance.
- **Global Quick Search & Scroll-To-Top**: Instant search modal accessible via floating action pill or keyboard shortcuts (`/` or `Ctrl+K`), with automatic scroll restoration.

---

## 🛠 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) | Modern concurrent UI and reactive component state |
| **Build Tool** | [Vite 8](https://vite.dev/) | Sub-second HMR and optimized production bundles |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Next-generation high-performance utility CSS |
| **Motion & Physics** | [Motion (Framer)](https://motion.dev/) | GPU-accelerated layout transitions and spring physics |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) | Native Android runtime, plugins, and bridge |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent SVG icon set |
| **Persistence** | [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) + `localStorage` | Local-first offline-capable data storage |
| **Auth (Optional)** | [Firebase Auth](https://firebase.google.com/) | Community creator sync and optional Google / Email login |
| **Card Protocol** | Custom CCv2 PNG Chunk Parser | SillyTavern V1/V2/V3 card parsing and PNG embedding |
| **Backend Proxy** | Express + `tsx` | Optional lightweight proxy for community card CORS handling |

---

## 📁 Project Structure

```text
Wardenai/
├── android/                          # Native Android project (Capacitor)
│   ├── app/src/main/
│   │   ├── java/ai/warden/app/       # Android MainActivity & WebView configuration
│   │   └── res/                      # Android splash screens, drawables & app icons
├── public/                           # Static assets, logos, and icons
│   ├── warden-cat-logo.png           # Transparent crisp white cat silhouette logo
│   ├── warden-cat-original.png       # Original full-resolution mascot asset
│   └── glowing-cat-icon.png          # Ambient glow app icon
├── src/
│   ├── components/
│   │   ├── character/                # Character cards, Datacat hub view, QuickSearchModal
│   │   ├── common/                   # AppSplashScreen, global loaders, modals
│   │   ├── modals/                   # CharacterImportModal, AuthModal, AccountRestrictedModal
│   │   └── navigation/               # TopHeader, Sidebar, MobileBottomBar, SlideOverDrawer
│   ├── services/
│   │   ├── aiProviderService.ts      # Multi-provider BYOK orchestration & reasoning controls
│   │   ├── characterImportService.ts # CCv2 PNG/JSON parser & metadata extractor
│   │   ├── communityCatalogService.ts# Community character feeds & Datacat catalog fetcher
│   │   ├── storageService.ts         # Local-first IndexedDB persistence layer
│   │   ├── tokenPriceService.ts      # Live model pricing & token cost calculations
│   │   └── firebaseAuth.ts           # Optional Firebase account authentication
│   ├── utils/
│   │   ├── cardExport.ts             # SillyTavern PNG chunk injector & JSON exporter
│   │   └── janitorExport.ts          # Janitor AI format converter
│   ├── views/
│   │   ├── ChatView.tsx              # Core roleplay chat engine with reasoning panels
│   │   ├── CharacterStudioView.tsx   # Character creation & multi-scenario designer
│   │   ├── DiscoverView.tsx          # Community character catalog & Datacat explorer
│   │   ├── PersonaStudioView.tsx     # Persona management & switching
│   │   ├── LorebooksView.tsx         # Keyword-triggered world lorebook editor
│   │   └── SettingsView.tsx          # Provider keys, appearance, privacy vault auditor
│   ├── App.tsx                       # Root application shell, tab routing & gestures
│   ├── index.css                     # Tailwind v4 theme definitions & layout rules
│   └── main.tsx                      # React root entry point
├── capacitor.config.json             # Capacitor mobile configuration
├── package.json                      # Project dependencies & npm scripts
├── server.ts                         # Optional community catalog proxy server
└── vite.config.ts                    # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.x or 20.x+ recommended)
- `npm` (comes with Node.js) or `pnpm`
- (For Android build) [Android Studio](https://developer.android.com/studio) with Android SDK and JDK 17+

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/JustBadThinker/wardenai.git
   cd wardenai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

### Configuring API Keys

Warden AI does not require you to configure keys in environment files. Simply:
1. Open the app in your browser or mobile phone.
2. Click the **Settings** tab in the sidebar or bottom navigation bar.
3. Select your desired AI provider (e.g., Google Gemini, OpenRouter, OpenAI, Anthropic, DeepSeek, Groq, or Local Ollama).
4. Paste your API key. Keys are saved strictly into your device's encrypted local storage.

### Running the Community Proxy (Optional)

When running inside strict browser environments where external community catalog sites (such as Janitor AI or Datacat) restrict direct cross-origin browser requests (CORS), you can run the built-in local proxy:

```bash
npm run proxy
```
This starts an Express-based relay on `http://localhost:3001` that strips CORS headers for catalog browsing.

---

## 📱 Mobile App Build (Android)

Warden AI includes a full native Android project managed via Capacitor 8.

1. **Build the production web bundle and sync to Android**:
   ```bash
   npm run cap:sync
   ```

2. **Open the project in Android Studio**:
   ```bash
   npm run cap:open
   ```

3. **Build & Run**:
   - In Android Studio, connect your physical Android device (via USB or Wi-Fi debugging) or start an Android Emulator.
   - Click the green **Run (Play)** button to compile and install the debug APK.

---

## 🤝 Contributing Guidelines

We welcome contributions from the open-source community! Whether you are fixing bugs, optimizing mobile gestures, adding new LLM provider adapters, or designing UI themes, here is how you can contribute.

### Code of Conduct & Safety
- **Strict 18+ Trust & Safety**: Warden AI maintains a zero-tolerance policy regarding underage depictions or prohibited content involving minors. All characters, personas, and scenarios contributed to the default catalog must depict adults aged 18 and older.
- **Privacy First**: Any contribution that attempts to introduce tracking pixels, telemetry SDKs, or cloud server data logging will be rejected immediately.

### Branching & Commit Conventions
We use the **Conventional Commits** specification:
- `feat:` A new user-facing feature (e.g., `feat(reasoning): add custom thinking budget slider`)
- `fix:` A bug fix (e.g., `fix(touch): restore horizontal swipe gestures on explore view`)
- `docs:` Documentation improvements (e.g., `docs: update setup instructions in README`)
- `perf:` Performance optimizations (e.g., `perf: optimize PNG chunk metadata decoding`)
- `refactor:` Code reorganization without behavioral change
- `chore:` Dependency bumps, tooling updates, or config changes

Branch naming format:
- `feature/your-feature-name`
- `bugfix/issue-description`

### Development Workflow

1. **Fork the repository** on GitHub.
2. **Clone your fork** and create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** cleanly:
   - Preserve existing comments and docstrings.
   - Use TypeScript strict types (avoid arbitrary `any`).
   - Adhere to Tailwind CSS v4 styling idioms.
4. **Run verification checks**:
   ```bash
   # Type check
   npm run lint

   # Build check
   npm run build
   ```
5. **Commit your changes**:
   ```bash
   git commit -m "feat(catalog): add tag filtering for multiple categories"
   ```
6. **Push to your fork** and submit a Pull Request against `main`.

### Pull Request Checklist
Before opening a PR, ensure:
- [ ] Code passes type check without errors (`npm run lint`).
- [ ] Production build succeeds cleanly (`npm run build`).
- [ ] Changes look and feel responsive on both Desktop (1920x1080) and Mobile (390x844) viewports.
- [ ] No personal API keys or `.env` secrets are accidentally committed.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Crafted with passion for open-source AI roleplay and uncompromised personal privacy.</sub>
</div>
