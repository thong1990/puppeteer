# Email OTP Retriever (IMAP)

A Bun + Hono API application that retrieves OTP (One-Time Password) codes from email accounts using IMAP protocol and reference codes. Supports multiple email providers and accounts for redundancy.

## Features

- ✅ Multiple email account support (Gmail, Outlook, Yahoo, iCloud, etc.)
- ✅ Direct IMAP connection (no OAuth required)
- ✅ 5-character reference code matching
- ✅ Smart OTP extraction from email content
- ✅ Parallel account searching for speed
- ✅ RESTful API with Hono framework
- ✅ Built-in CORS and logging middleware
- ✅ TypeScript support with full type safety
- ✅ Configurable timeout and search parameters

## Prerequisites

- Bun runtime
- Email accounts with IMAP access enabled
- App passwords for email providers (Gmail, Outlook, etc.)

## Installation

1. Clone the repository and install dependencies:
```bash
bun install
```

2. Copy the environment configuration:
```bash
cp .env.example .env
```

3. Configure your email IMAP credentials in `.env`

## Email Setup

### Gmail
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use your email and the generated app password

### Outlook/Hotmail
1. Enable 2-factor authentication
2. Generate an App Password in your Microsoft account security settings
3. Use `outlook.office365.com` as the IMAP host

### Yahoo
1. Enable 2-factor authentication
2. Generate an App Password in Yahoo Account Security
3. Use `imap.mail.yahoo.com` as the IMAP host

### Other Providers
Most email providers support IMAP. Check their documentation for IMAP settings.

## Configuration

Update your `.env` file with IMAP credentials:

```env
PORT=3000

# Gmail Account 1
IMAP_HOST_1=imap.gmail.com
IMAP_PORT_1=993
IMAP_SECURE_1=true
EMAIL_USER_1=your-email@gmail.com
EMAIL_PASS_1=your-app-password

# Outlook Account 2
IMAP_HOST_2=outlook.office365.com
IMAP_PORT_2=993
IMAP_SECURE_2=true
EMAIL_USER_2=your-email@outlook.com
EMAIL_PASS_2=your-app-password
```

## Running the Application

### Development mode (with hot reload):
```bash
bun run dev
```

### Production mode:
```bash
bun run start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### GET /
Health check endpoint

### GET /accounts
List active email accounts (without credentials)

### POST /otp
Retrieve OTP using reference code

Request body:
```json
{
  "referenceCode": "ABC12",
  "accountIds": ["account1", "account2"],
  "timeout": 30000
}
```

Response:
```json
{
  "success": true,
  "otp": "123456",
  "accountId": "account1",
  "email": "account1@gmail.com",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /otp/:referenceCode
Retrieve OTP using GET request

Query parameters:
- `accounts`: Comma-separated account IDs (optional)
- `timeout`: Timeout in milliseconds (optional)

Example: `GET /otp/ABC12?accounts=account1,account2&timeout=30000`

## How It Works

1. **IMAP Connection**: Direct connection to email servers using IMAP protocol
2. **Reference Code Matching**: Searches for emails containing your 5-character reference code
3. **Multiple Accounts**: Searches all active email accounts in parallel for faster results
4. **OTP Extraction**: Uses regex patterns to extract common OTP formats (4-8 digits/characters)
5. **Smart Search**: Only looks in emails from the last 10 minutes to avoid old codes
6. **Timeout Protection**: Configurable timeouts prevent hanging connections

## OTP Patterns Supported

- 6-digit numeric codes (e.g., `123456`)
- 4-digit numeric codes (e.g., `1234`)
- 5-8 character alphanumeric codes (e.g., `ABC123`)

## Error Handling

The API includes comprehensive error handling for:
- Invalid reference codes
- Missing IMAP credentials
- IMAP connection failures
- Authentication errors
- Email parsing errors
- Network timeouts
- Mailbox access issues

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables in production
- Use app passwords instead of regular passwords
- Regularly rotate your app passwords
- Consider implementing rate limiting for production use
- Ensure IMAP connections are properly closed

## Development

Built with:
- **Bun**: Fast JavaScript runtime
- **Hono**: Lightweight web framework  
- **TypeScript**: Type safety
- **ImapFlow**: Modern IMAP client for Node.js

## Advantages of IMAP over Gmail API

- ✅ **No OAuth setup required** - Just use email and app password
- ✅ **Works with any email provider** - Not limited to Gmail
- ✅ **Direct connection** - No intermediary API calls
- ✅ **Real-time access** - Direct IMAP protocol
- ✅ **Simpler configuration** - Standard IMAP settings
- ✅ **Better reliability** - No API rate limits or token expiration
