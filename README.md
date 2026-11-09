<div align="center">
  <img src="public/warden-cat-original.png" alt="Warden AI Logo" width="140" height="140" />
  <h1>Warden AI</h1>
  <p>A simple, privacy-respecting local roleplay and character chat client for web and Android.</p>
</div>

> **Note**: This app was assisted by Gemini.

---

## What is Warden AI?

Warden AI is a community-oriented, self-hostable roleplay interface. It is not an enterprise product and does not run a central backend to collect, monitor, or train on your private conversations. Instead, it runs as a client directly in your browser or as an Android app (via Capacitor), storing your data locally and connecting directly to your chosen AI providers using your own API keys.

---

## Real Features (What the App Actually Has)

- **Bring Your Own Key (BYOK)**:
  - Connect directly to **OpenRouter**, **Google Gemini**, **OpenAI**, or any **Custom OpenAI-compatible gateway / reverse proxy** (e.g. self-hosted Ollama, vLLM, or LM Studio).
  - Also includes a built-in offline simulation engine for testing formatting without consuming tokens.
  - API keys are saved locally on your device in browser storage and are never sent to any intermediary Warden server.

- **Character Cards & Community Formats**:
  - Browse community characters via Datacat and Janitor AI integration.
  - Import and export character cards using **SillyTavern PNG cards** (embedded chunk metadata), **CCv2 JSON**, and Janitor AI markdown.
  - Multi-scenario support: define alternate openings, AU hooks, and branching scenes for any character.
  - Full character creator with tags, content ratings (SFW, Mature, NSFW), avatar/cover URLs, and creator notes.

- **Encrypted `.warden` Backup & Restore**:
  - Export all your characters, personas, conversation history, and custom rule presets into a single encrypted `.warden` file.
  - Encrypted with client-side **AES-256** and password protection.
  - **API keys are strictly excluded** from the export file for your safety.
  - Safe import: restores cards and merges personas without overwriting existing data.

- **User Personas**:
  - Create multiple custom user personas with avatars, display names, pronouns, and descriptions.
  - Switch personas on the fly per chat so characters recognize who they are talking to.

- **Chat & Quality-of-Life Tools**:
  - Auto-scrolls to the latest message when opening a chat.
  - Custom system prompt presets and bot rules.
  - Live token counter and cost estimator supporting both **USD ($)** and **IDR (Rp)**.
  - Unified artwork gallery aggregating avatars, covers, and scenario images into a full HD lightbox with 1-tap image download.
  - Dark theme with custom-styled dropdown selectors (`CustomSelect`) and a pulsing cat indicator.

- **Mobile & Android Ready**:
  - Responsive mobile UI with bottom navigation.
  - Packaged with **Capacitor 8** for Android.
  - Native Android hardware back-button handling.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React icons
- **Animations**: Motion (spring layout transitions)
- **Mobile Wrapper**: Capacitor 8 (Android)
- **Encryption**: Pure JavaScript AES-256 via `crypto-js` (works on localhost, LAN IPs, and HTTPS)
- **Local Storage**: IndexedDB + `localStorage`

---

## Project Structure

```text
Wardenai/
├── android/                    # Native Android Capacitor project
│   └── app/src/main/
│       ├── AndroidManifest.xml # Android permissions and app configuration
│       └── assets/public/      # Bundled web assets
├── public/                     # Static icons, logos, and mascots
├── src/
│   ├── components/
│   │   ├── character/          # Character cards and preview modals
│   │   ├── common/             # CustomSelect, ImageLightboxModal, pulsing loader
│   │   ├── modals/             # EditProfileModal, WardenVaultModal, ReportModal
│   │   └── navigation/         # Header, sidebar, and mobile bottom bar
│   ├── services/
│   │   ├── aiProviderService.ts# BYOK adapters for Gemini, OpenRouter, OpenAI, Custom
│   │   ├── characterImportService.ts # SillyTavern PNG & JSON card parser
│   │   ├── storageService.ts   # Local IndexedDB & localStorage persistence
│   │   ├── tokenPriceService.ts# Token calculations (USD & IDR)
│   │   └── wardenVaultService.ts # Encrypted .warden export and import
│   ├── views/
│   │   ├── ChatView.tsx        # Chat interface with scenario and persona selection
│   │   ├── CharacterProfileView.tsx # Character details, gallery, and start chat
│   │   ├── CharacterStudioView.tsx  # Character creation tool
│   │   ├── DiscoverView.tsx    # Character discovery & library
│   │   ├── PersonaStudioView.tsx    # User persona manager
│   │   └── SettingsView.tsx    # Providers, vault backup, backgrounds, appearance
│   ├── App.tsx                 # Main application layout and view router
│   ├── main.tsx                # Application bootstrap
│   └── index.css               # Global styles and scrollbar definitions
├── capacitor.config.ts         # Capacitor configuration
├── package.json                # Project dependencies and build scripts
└── vite.config.ts              # Vite bundler configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- `npm`

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/JustBadThinker/wardenai.git
   cd wardenai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Add your API Key**:
   - Open the app.
   - Go to **Settings > Generation & Providers**.
   - Choose your provider (Google Gemini, OpenRouter, OpenAI, or Custom) and paste your key.

---

## Building the Android APK

1. **Build the web application and sync to Android**:
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

3. **Compile the APK**:
   - In Android Studio, ensure Android SDK and JDK 17+ are installed.
   - Build a debug APK via **Build > Build Bundle(s) / APK(s) > Build APK(s)**, or click **Run** with a connected device or emulator.

---

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. **Fork the repo** and create your branch:
   ```bash
   git checkout -b feature/my-improvement
   ```
2. **Make your changes** cleanly.
3. **Verify there are no TypeScript or build errors**:
   ```bash
   npm run lint
   npm run build
   ```
4. **Commit and open a Pull Request**:
   ```bash
   git commit -m "fix: resolve navigation scroll position"
   git push origin feature/my-improvement
   ```

---

## License

This project is licensed under the [MIT License](LICENSE).
