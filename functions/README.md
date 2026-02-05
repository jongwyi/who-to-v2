# WHO2MEET Cloud Functions

## Setup

### 1. Install dependencies

```bash
cd functions && npm install
```

### 2. Configure Resend API Key

Get your API key from [resend.com](https://resend.com) and set it:

```bash
firebase functions:config:set resend.api_key="re_xxxxxxxx"
```

Or use environment variable `RESEND_API_KEY` (set in Firebase Console > Functions > Environment variables).

### 3. Deploy

```bash
firebase deploy --only functions
```

## sendTeamResultsEmail

Callable function that sends team matching results to an email address.

- **HTML email**: Full team data with styling (inline CSS for email client compatibility)
- **Screenshot**: Placeholder for future implementation (Puppeteer or external API)
- **Validation**: Email format, session code (6 chars), session existence, teams presence

