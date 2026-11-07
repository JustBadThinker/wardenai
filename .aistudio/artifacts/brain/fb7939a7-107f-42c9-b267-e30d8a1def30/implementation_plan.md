# Warden AI — Community Platform, Firebase Auth, Private Investigation & Mobile-First Architecture

A production-grade, privacy-first AI roleplay community platform, creation studio, and multi-provider engine. Warden AI fuses the character-first depth of Janitor AI with clean, minimalist aesthetics, mobile-first touch ergonomics, Firebase Authentication, server-enforced role-based access control (RBAC), multi-scenario character creation, an extensible 11-category tagging matrix, user profiles with relational following, publishing and moderation queues, age-gated content safety, private conversation isolation, and a strictly audited two-person Restricted Investigation workflow.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The extended platform architecture synthesizes all verified specifications into an integrated, production-ready blueprint:
>
> - **Firebase Authentication & Identity Management**: Native support for **Continue with Google** and **Email/Password** via official Firebase SDK, email verification, self-service password reset/rotation, session revocation, and backend Firebase ID token verification. Authoritative user roles (`user`, `moderator`, `admin`) are stored securely on the backend / custom claims, never in client storage.
> - **Mobile-First Responsive Architecture**: Designed for narrow viewports starting at **320 CSS pixels** up to **1440px+** desktops. Features a 5-tab mobile bottom bar (`Home`, `Discover`, `Chats`, `Studio`, `Profile`) with slide-over drawers for secondary tools (`Lorebooks`, `Bookmarks`, `Settings`, `Moderation`), eliminating unintended horizontal overflow, cramped code boxes, or clipped touch targets.
> - **Private Conversation Isolation & Restricted Investigation Protocol**: User chats are strictly confidential and completely omitted from public discovery, creator profiles, routine analytics, and general moderation dashboards. In serious safety incidents, an independent **Restricted Investigation Module** requires separation of duties (the requester cannot approve their own request), strict time-limited access, message-scoped boundaries, and tamper-evident audit logging.
> - **Flexible Multi-Scenario Character Engine ($0 \dots N$)**: Creators define an arbitrary number of roleplay scenarios per character (e.g., `First Meeting`, `Rivalry Reignited`, `Alternate Universe Standoff`), each with custom greetings, prompt instructions, and cover art. Users select their desired scenario when launching a chat.
> - **Granular 11-Category Extensible Tagging Matrix**: Independent combinable tags across Character Gender, Romance & Attraction, Personality, Relationship Dynamics, Power Dynamics, Genre, Character Species, Scenario & Setting, Roleplay Style, Content Rating, and Additional Themes, with toggleable `Match ALL` (AND) and `Match ANY` (OR) search logic.
> - **Publishing Lifecycle & Content Safety Governance**: Explicit publishing states (`Draft` $\rightarrow$ `Pending Review` $\rightarrow$ `Published` $\rightarrow$ `Changes Requested` $\rightarrow$ `Rejected`). Policy-sensitive edits trigger automatic re-review. SFW default discovery with Gaussian blur overlays and a server-enforced age verification confirmation gate for Mature and NSFW content.
> - **BYOK Multi-Provider Engine**: Unified provider adapter supporting OpenAI, OpenRouter, Anthropic, Google Gemini, and custom OpenAI-compatible endpoints with client-side credential encryption, real-time connection testing, and an instant high-fidelity local simulation fallback.

---

### 1. Overview & Core Concept

Warden AI provides an open, privacy-respecting creative ecosystem where creators can design living characters with multiple narrative scenarios, roleplayers can converse using custom user personas and world lorebooks, and the community operates safely under transparent, accountable moderation.

#### Core Value Pillars
- **Uncompromised User Privacy**: Private roleplay is sacred. Platform staff and automated systems cannot read chats unless a user explicitly submits messages as report evidence or an emergency restricted investigation is approved by two independent authorities.
- **Zero Provider Lock-In**: Decoupled prompt assembly allowing users to bring their own API keys (OpenAI, OpenRouter, Anthropic, Gemini, local Ollama/vLLM) with parameter tuning (temperature, top-p, max tokens, context window).
- **Mobile-First Creative Studio**: Rich character and scenario creation that works just as smoothly on a 360px smartphone as on a dual-monitor desktop workstation.

---

### 2. User Experience & Visual Design

#### Mobile-First Navigation & Responsive System
- **Mobile Viewports ($320\text{px}$–$767\text{px}$)**:
  - **Bottom Navigation Bar**: Fixed high-contrast 5-tab strip (`Home`, `Discover`, `Chats`, `Create`, `Profile`) with $\ge 44\text{px}$ touch targets.
  - **Slide-Over Secondary Drawer**: Tapped from the top header; houses `Lorebooks`, `Bookmarks`, `Security Settings`, `Provider Management`, and role-gated `Moderation Console` / `Restricted Investigation Queue`.
  - **Touch-Optimized Filters**: Bottom sheet drawer for the 11-category tag matrix with clear AND/OR toggles and sticky "Apply Filters" button.
  - **Chat Layout**: Sticky top bar with character status, full-height scrolling conversation bubble stream with responsive markdown, and bottom message composer pinned directly above the mobile keyboard.
- **Tablet & Desktop Viewports ($768\text{px}$–$1440\text{px}+$ )**:
  - **Collapsible Sidebar**: Workspace navigation with quick statistics, recent chats, and user profile card.
  - **Multi-Column Studios**: Live preview pane alongside form editors, tabbed scenario accordions, and split-column JSON export/import.

#### Visual Aesthetics & Styling Discipline
- **Canvas & Surface Palette (60-30-10 Rule)**:
  - 60% Dominant Canvas: Deep obsidian `#0B0F19` in dark mode (default) / crisp `#FFFFFF` neutral in light mode.
  - 30% Structural Surfaces: Flat cards `#111827`, hairline dividers (`border-neutral-800`), and muted text `#9CA3AF`.
  - 10% High-Intent Accent: Royal Indigo `#6366F1` and Electric Violet `#8B5CF6` for active CTA states, focused inputs, and primary navigation indicators.
- **Zero-Pill Metadata & Clean Typography**:
  - Display Font: `Plus Jakarta Sans` / `Outfit` for confident editorial headers.
  - Body Font: `DM Sans` / `Public Sans` for sustained roleplay reading comfort.
  - Tabular Numerals: Tabular monospace figures (`tabular-nums`) for token usage counters, interaction stats, and generation latencies.
  - Card metadata is displayed as clean unboxed text with subtle typographic separators (`·` or `/`).

#### Content Rating & Adult Safety Posture
- SFW content is displayed openly to all visitors and search engines.
- Mature and NSFW content is obscured by default behind a Gaussian blur (`blur-xl`), an age-verification warning shield, and an explicit "Click to Confirm Age (18+)" gate.
- Logged-out or unverified accounts cannot view or publish adult-only content.

---

### 3. Key Product Decisions & Security Architecture

#### 1. Firebase Authentication with Server-Enforced RBAC
- *Identity Layer*: Firebase Authentication manages credentials, OAuth flows (Google), email verification, and password resets.
- *Authorization Layer*: Backend services decode Firebase ID tokens, verify cryptographic signatures, and enforce role checks (`user`, `moderator`, `admin`) against server records. Client storage manipulation cannot grant unauthorized permissions.

#### 2. Private Conversation Protection & Two-Person Investigation Protocol
- *Zero Routine Access*: Private conversation records are stored in a segregated table inaccessible to standard moderation endpoints or public APIs.
- *Evidence Submission*: When a user files a report against another user, they explicitly select specific messages. Only the selected excerpts are attached as immutable evidence snapshots.
- *Restricted Investigation Flow*:
  1. *Request*: A verified safety incident prompts a moderator to draft an Investigation Request specifying `caseId`, `reason`, `suspectedPolicyViolation`, `targetConversationId`, and `messageRange`.
  2. *Evaluation*: Independent automated and human checks confirm whether less intrusive methods exist.
  3. *Two-Person Approval*: An independent Administrator reviews and approves the request. The requester cannot approve their own case.
  4. *Time-Limited Scope*: Access is strictly read-only, limited to the approved message range, and automatically expires after a configured window (e.g., 24 hours).
  5. *Audit Trail*: Every query, view, and export is written to an immutable `AuditLog` recording actor ID, IP, timestamp, and target scope.

#### 3. Arbitrary Multi-Scenario Engine ($0 \dots N$)
- Instead of forcing characters into a fixed 3-scenario structure, characters have an editable collection of scenarios.
- Each scenario has a unique ID, title, description, custom opening hook, scenario-specific prompt instructions, and display order.
- Starting a chat creates a conversation linked directly to the selected `scenarioId`, locking narrative context without retroactively altering previous conversations.

---

### 4. Technical Architecture & Data Strategy

#### System & Service Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            Mobile-First Client SPA                               │
│  ┌───────────────────────────────┬─────────────────────────────────────────────┐ │
│  │ Mobile App Shell              │ Desktop Viewports                           │ │
│  │ - 5-Tab Bottom Bar (320px+)   │ - Collapsible Workspace Sidebar             │ │
│  │ - Slide-Over Secondary Menu   │ - Multi-Column Studio & Live Preview        │ │
│  │ - Filter Bottom Sheet         │ - Split-Screen Roleplay Chat                │ │
│  └───────────────────────────────┴─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ Views: Home, 11-Category Discover, Character Profile, Multi-Scenario Studio,│ │
│  │ Chat (Streaming/Branching), Personas, Lorebooks, Moderation, Investigations │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST API / SSE Streaming / Firebase Auth
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                                   Backend API                                    │
│  ┌──────────────────────┬──────────────────────┬───────────────────────────────┐ │
│  │ Auth & Token Guard   │ Publishing & Mod     │ Restricted Investigation      │ │
│  │ - Firebase Token Dec │ - Review Queue       │ - Two-Person Approval Engine  │ │
│  │ - Server RBAC Enforce│ - Revision History   │ - Message-Scoped Grants (TTL) │ │
│  │ - Password Policy    │ - Content Reports    │ - Tamper-Evident Audit Logger │ │
│  └──────────────────────┴──────────────────────┴───────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┬───────────────────────────────┐ │
│  │ BYOK AI Multi-Provider Adapter              │ Discovery & 11-Tag Matcher    │ │
│  │ - OpenAI, OpenRouter, Anthropic, Gemini     │ - AND (Match All) / OR (Any)  │ │
│  │ - Scenario + Persona + Lorebook Assembly    │ - Autocomplete & Slug Index   │ │
│  └─────────────────────────────────────────────┴───────────────────────────────┘ │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                         Relational Database Schema                               │
│  - users & user_profiles             - character_tags & canonical_tags (11 cats) │
│  - roles & user_roles                - follow_relationships (unique constraint)  │
│  - characters & character_scenarios  - bookmarks & collections                   │
│  - character_revisions               - conversations & messages (Private-Segreg) │
│  - personas & lorebooks              - investigation_cases & audit_logs          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Core Relational Data Models & TypeScript Interfaces

```typescript
// Authentication & Roles
export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  username: string;
  role: UserRole;
  isEmailVerified: boolean;
  isAgeVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  bannerUrl?: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  publishedCharacterCount: number;
  blurNsfw: boolean;
  isNsfwAllowed: boolean;
}

// Character & Multi-Scenario
export type PublicationStatus = 
  | 'draft' 
  | 'pending_review' 
  | 'published' 
  | 'changes_requested' 
  | 'rejected' 
  | 'unpublished' 
  | 'removed';

export interface CharacterScenario {
  id: string;
  characterId: string;
  title: string;
  description: string;
  openingMessage: string;
  scenarioInstructions: string;
  imageUrl?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  creatorId: string;
  name: string;
  avatarUrl: string;
  coverUrl?: string;
  shortDescription: string;
  personality: string;
  background: string;
  systemPrompt: string;
  exampleDialogue: string;
  creatorNotes?: string;
  contentRating: 'SFW' | 'Mature' | 'NSFW';
  visibility: 'public' | 'unlisted' | 'private';
  publicationStatus: PublicationStatus;
  scenarios: CharacterScenario[];
  tagSlugs: string[];
  likeCount: number;
  bookmarkCount: number;
  chatCount: number;
  createdAt: string;
  updatedAt: string;
}

// Private Conversations & Evidence Snapshots
export interface ChatMessage {
  id: string;
  sender: 'user' | 'character' | 'system';
  personaId?: string;
  content: string;
  timestamp: string;
  tokenCount?: number;
}

export interface Conversation {
  id: string;
  userId: string; // Strictly private to owner
  characterId: string;
  scenarioId?: string;
  personaId: string;
  providerId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportEvidenceItem {
  messageId: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: 'character' | 'scenario' | 'user' | 'conversation';
  targetId: string;
  category: 'hate' | 'harassment' | 'nsfw_mismatch' | 'illegal' | 'spam';
  description: string;
  evidenceMessages?: ReportEvidenceItem[];
  status: 'pending' | 'resolved' | 'dismissed';
  assignedModeratorId?: string;
  createdAt: string;
  resolvedAt?: string;
}

// Restricted Investigation Protocol
export interface RestrictedInvestigation {
  id: string;
  caseReference: string;
  reason: string;
  suspectedViolation: string;
  requestingInvestigatorId: string;
  approvingAuthorityId?: string;
  targetUserId: string;
  targetConversationId: string;
  allowedMessageRange?: { startMessageId: string; endMessageId: string };
  status: 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'closed';
  expiresAt?: string;
  createdAt: string;
  approvedAt?: string;
  closedAt?: string;
  closureReason?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>; // Excludes sensitive message bodies & credentials
  timestamp: string;
}
```

---

### 5. Step-by-Step Implementation Roadmap

#### Phase 1: Community Foundation, Storage & Seed State
- Implement the consolidated `CommunityDataService` managing Users, Profiles, Characters, Scenarios, Follows, Reports, Investigations, and Conversations.
- Pre-seed 3 active authenticated accounts:
  1. `admin_elena` (Administrator)
  2. `mod_marcus` (Moderator)
  3. `creator_ren` (Regular User / Creator)
- Pre-seed 5 richly detailed characters with multiple scenarios across the 11-category taxonomy.

#### Phase 2: Firebase Authentication & Security Pages
- Build responsive Login, Registration, Password Reset, and Security Settings views.
- Implement **Continue with Google** and **Email & Password** flows via Firebase SDK with clear error states and demo toggle fallback.
- Implement session overview, password change reauthentication, and active device simulation.

#### Phase 3: Mobile-First Responsive Shell & Navigation
- Build the 5-tab mobile bottom bar (`Home`, `Discover`, `Chats`, `Create`, `Profile`) for viewports $\le 768\text{px}$.
- Implement the slide-over secondary drawer for `Lorebooks`, `Bookmarks`, `Settings`, and role-gated `Moderation` / `Investigation` tools.
- Implement full desktop progressive enhancement with collapsible sidebar.

#### Phase 4: Granular 11-Category Discover & Mobile Filter Sheet
- Build responsive Discover catalog with search autocomplete and sorting.
- Implement the mobile-friendly bottom sheet filter drawer covering the 11 categories.
- Implement the `Match ALL` (AND) vs `Match ANY` (OR) boolean filter switch and removable active tag chips.

#### Phase 5: Multi-Scenario Character Creation Studio
- Expand Studio to support $0 \dots N$ scenarios with touch-friendly cards, reordering, custom opening messages, and scenario prompt rules.
- Support Basic and Advanced modes, tag autocomplete with duplicate prevention, live mobile preview, and JSON import/export.
- Implement draft saving, publication submission, and revision tracking.

#### Phase 6: Publishing Lifecycle & Moderation Dashboard
- Build the dedicated Moderation Dashboard for moderators/admins:
  - Pending character submissions with full scenario preview and content rating check.
  - Action modals: Approve, Request Changes (with creator notes), Reject.
  - Reported content queue with attached message evidence review.

#### Phase 7: Private Conversation Isolation & Restricted Investigation Module
- Ensure private conversations are strictly isolated and never rendered in standard moderation lists.
- Build the user reporting modal allowing users to select specific message excerpts as evidence.
- Build the dedicated Restricted Investigation module:
  - Investigator drafts request (case reference, target conversation, message scope).
  - Independent Administrator approves/rejects (enforcing separation of duties).
  - Time-limited, message-scoped read-only investigation viewer.
  - Tamper-evident audit log recorder.

#### Phase 8: Mobile-First Roleplay Chat & BYOK Multi-Provider Engine
- Implement scenario selection modal when initiating chat from character profiles.
- Build distraction-free chat with streaming responses, dialogue formatting, message rerolls, editing, and persona switching.
- Support BYOK provider configuration (OpenAI, OpenRouter, Anthropic, Gemini, custom endpoints) + local roleplay simulation engine.
- Pin message composer cleanly above mobile virtual keyboard.

#### Phase 9: User Profiles, Following & Age-Gate Protection
- Build creator profile pages (`/@username`) with avatar, banner, bio, stats, and public character gallery.
- Implement persistent follow/unfollow with real-time counter updates.
- Implement Gaussian blur overlays and 18+ age verification gate for Mature and NSFW content.

#### Phase 10: Verification & Quality Assurance
- Test viewports across 320px, 360px, 390px, 768px, 1024px, and 1440px to ensure zero horizontal scroll leaks.
- Verify security boundaries: user chats inaccessible without approved investigation; requester cannot approve own case; non-admins cannot assign roles.
- Run `compile_applet` and verify clean build with zero errors.
