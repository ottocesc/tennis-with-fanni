# tennis-with-fanni
Webpage for tennis coach
Tennis with Fanni - Website
===========================

Simple Node/Express website for a tennis coach with:
- Coach intro page
- Events gallery with owner upload (images/videos + short story)
- Contact form that emails the coach

Requirements
------------
- Node.js 18+

Setup
-----
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill values:
   - `ADMIN_KEY` for uploading/deleting events (used in the Owner form)
   - SMTP credentials and `COACH_EMAIL` to enable contact emails

Run
---
```bash
npm start
```
App runs at `http://localhost:3000`.

Notes
-----
- Uploaded files are stored in `uploads/` and referenced by `/uploads/...` URLs.
- Events are stored in a simple `events.json` file for demo purposes.
- The owner panel to upload posts is under the Events section (expand “Owner: Add a new post”).