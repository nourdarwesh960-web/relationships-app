# Relationships App (مساحتنا الخاصة)

React (Vite) frontend + Google Apps Script backend + Google Sheets database. Private couples sanctuary with full features in Arabic (RTL) and English (LTR).

## Features Implemented
1. **Authentication & Session**:
   - Secure registration with SHA-256 (1200 rounds) salt hashing.
   - Login, logout, session restoration with 30-day bearer tokens.
   - Profile management, custom avatar selection, password change, and safe account deletion.
   - Fallback Google OAuth ID-token verification support.
2. **Two-Person Partnership Connection**:
   - Relationship start date, 8-character unique invite code with 7-day expiration.
   - Pairing validation (prevents self-join, expired codes, third-party joins).
   - Cancel invitation and clean unlinking/disconnecting.
3. **Memories & Photo Gallery**:
   - Story documentation with categories (Trip, Firsts, Date Night, Celebration, Daily Magic).
   - Tagging, favorites filter, and privacy levels (Shared with Partner vs Private to Author).
   - Photo upload with MIME validation (JPEG, PNG, WebP, GIF).
   - Cover photo assignment and full-screen Lightbox viewer with captions and navigation.
4. **Free Typing & Collaborative Scratchpad**:
   - Rich text formatting controls (Bold, Italic, Headings, Lists, Quotes, Code).
   - Live word and character counter.
   - Debounced auto-save to Google Apps Script backend.
   - Offline local draft backup in `localStorage` and draft restoration.
   - Optimistic concurrency control & conflict detection.
5. **Love Letters & Time Capsules**:
   - Custom envelope and stationery themes (Classic Ivory, Romantic Blush, Vintage Parchment, Golden Sunset).
   - Immediate delivery or scheduled time capsules.
   - Strict time capsule lock enforcement: recipients cannot read letters until the delivery timestamp arrives!
   - Sender can cancel or reschedule pending capsules before delivery.
   - Read receipts (`isRead`, `readAt`).
6. **Calendar & Milestones**:
   - Month view with event markers and Agenda view.
   - Automatic milestone calculations (100 days, 1 year, 500 days, etc.).
   - Event categorization and recurrences (Yearly, Monthly, Weekly, One-time).
   - Countdown timer to next upcoming celebration or anniversary.
7. **Shared Wishlist & Bucket List**:
   - Categorized wishes (Gifts, Travel, Activities, Home, Other) with priority levels (High, Medium, Low).
   - Price estimation and external links.
   - One-click status lifecycle (Idea → Planned → Purchased → Completed).
8. **Watch Together & Listen Together**:
   - Low-latency synchronized video/audio player (YouTube API + direct HTTPS audio streams).
   - Shared playlist queue: add items, play immediately, reorder, and remove.
   - Live partner presence detection and auto-drift correction.
9. **Discovery & Real Activity Log**:
   - Chronological couple timeline logging every shared memory, letter, wish, and event.
   - Relationship insights and stats counter.
   - Daily conversation prompts with one-click "Record as Memory" shortcut.
10. **Onboarding & Design**:
    - Guided onboarding modal for new partners.
    - Professional, romantic landing page with feature previews.
    - Responsive dark emerald theme with full Arabic RTL and English LTR typography.

## Commands
```powershell
Set-Location "D:\RelationshipsApp-v2"
npm install          # Install dependencies
npm test             # Run backend test suite (21 test groups passing)
npm run build        # Build production bundle with Vite
```

## Backend Deployment (Google Apps Script)
1. Open your Apps Script project at `script.google.com`.
2. Replace `Code.gs` with the updated code from `apps-script/Code.gs`.
3. In *Project Settings > Script Properties*, ensure `SPREADSHEET_ID` is set to your Google Sheet ID.
4. Click **Deploy > Manage deployments > Edit > New version**, and deploy as a Web App (Execute as: Me, Who has access: Anyone).
