# Flow State Facilitator - Backend

AI-driven Flow State Facilitator backend built with Next.js, MongoDB Atlas, AWS S3, Groq API, and Hugging Face.

## Tech Stack

- **Framework**: Next.js 14 (TypeScript)
- **Database**: MongoDB Atlas
- **Authentication**: NextAuth.js
- **Storage**: AWS S3
- **AI/LLM**: Groq API
- **ML**: Hugging Face API
- **Runtime**: Node.js

## Features

- User authentication and registration
- Flow session tracking and management
- Real-time intervention logging
- Analytics and insights generation
- Media upload to S3
- AI-powered flow analysis (Groq)
- ML-based fatigue prediction (Hugging Face)
- User-specific settings and preferences

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- AWS account with S3 bucket
- Groq API key
- Hugging Face API key

### Installation

1. Navigate to the backend directory:
```powershell
cd backend
```

2. Install dependencies:
```powershell
npm install
```

3. Create `.env` file (copy from `.env.example`):
```powershell
Copy-Item .env.example .env
```

4. Update `.env` with your credentials:
```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=generate_a_random_secret_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
```

5. Run the development server:
```powershell
npm run dev
```

The API will be available at `http://localhost:3001`.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/signin` - Sign in (NextAuth)
- `POST /api/auth/signout` - Sign out

### Flow Sessions
- `GET /api/sessions` - Get all sessions (authenticated)
- `POST /api/sessions` - Create new session
- `GET /api/sessions/[id]` - Get specific session
- `PATCH /api/sessions/[id]` - Update session
- `DELETE /api/sessions/[id]` - Delete session

### Analytics
- `GET /api/analytics?period=week` - Get analytics (week/month/year/all)

### Interventions
- `GET /api/interventions` - Get all interventions
- `POST /api/interventions` - Create intervention
- `PATCH /api/interventions` - Update intervention

### Settings
- `GET /api/settings` - Get user settings
- `PATCH /api/settings` - Update settings

### Media
- `GET /api/media/upload?filename=...&contentType=...` - Get signed upload URL
- `POST /api/media/upload` - Save media metadata after upload

### AI & ML
- `POST /api/ai/chat` - AI chat and flow analysis (Groq)
- `POST /api/ml` - ML operations (Hugging Face)

## Database Models

- **User**: User authentication and profile
- **FlowSession**: Flow state sessions with metrics
- **Intervention**: Break/intervention tracking
- **UserSettings**: User preferences and configuration
- **Media**: S3 media references

## Development

```powershell
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## Deployment

1. Set environment variables on your hosting platform
2. Build the project: `npm run build`
3. Start the server: `npm start`

### Recommended Platforms
- Vercel (seamless Next.js deployment)
- Railway
- AWS EC2 with PM2
- Docker container

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── sessions/
│   │   ├── analytics/
│   │   ├── interventions/
│   │   ├── settings/
│   │   ├── media/
│   │   ├── ai/
│   │   └── ml/
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── mongodb.ts
│   ├── auth.ts
│   ├── middleware.ts
│   ├── s3.ts
│   ├── groq.ts
│   └── huggingface.ts
├── models/
│   ├── User.ts
│   ├── FlowSession.ts
│   ├── Intervention.ts
│   ├── UserSettings.ts
│   └── Media.ts
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.example
```

## Security Notes

- Never commit `.env` file
- Use strong `NEXTAUTH_SECRET`
- Implement rate limiting for production
- Use HTTPS in production
- Validate all user inputs
- Implement proper CORS policies

## License

MIT
