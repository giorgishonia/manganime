# Manganime - Anime & Manga Streaming Platform

A modern anime and manga streaming platform built with Next.js, Supabase, and Framer Motion.

## Features

- 🔐 Authentication with NextAuth (Email/Password, Discord, Google)
- 📚 Custom anime and manga library
- 📱 Responsive design for all devices
- 🎬 Video streaming for anime episodes
- 📖 Manga reader
- 👤 User profiles with favorites, watchlists, and progress tracking
- 🔍 Advanced search functionality
- ✨ Modern UI with animations and transitions

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Authentication**: NextAuth.js
- **Icons**: Lucide Icons

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm
- Supabase account

### Environment Setup

1. Clone the repository
```bash
git clone <repository-url>
cd manganime
```

2. Install dependencies
```bash
npm install
# or
pnpm install
```

3. Set up environment variables
Create a `.env.local` file in the root directory with the following variables:

```
# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OAuth providers (optional)
# Discord
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Supabase Setup

1. Create a new Supabase project
2. Set up the database schema:
   - Navigate to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/schema.sql`
   - Run the SQL script to create all required tables and policies

### Running the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
├── app/                  # Next.js app router
│   ├── api/              # API routes
│   ├── anime/            # Anime pages
│   ├── manga/            # Manga pages
│   ├── profile/          # User profile pages
│   ├── login/            # Authentication pages
│   └── ...
├── components/           # React components
├── lib/                  # Utility functions and API clients
│   ├── supabase.ts       # Supabase client and types
│   ├── auth.ts           # Authentication utilities
│   └── content.ts        # Content management utilities
├── public/               # Static assets
├── styles/               # Global styles
├── types/                # TypeScript type definitions
└── supabase/             # Supabase configuration and migrations
    └── schema.sql        # Database schema
```

## Content Management

### Adding Anime/Manga Content

1. Log in as an admin user
2. Navigate to the admin dashboard
3. Add new anime or manga content with all required metadata
4. Upload episode or chapter files

### User Roles

- **Regular Users**: Can browse content, maintain watchlists, mark favorites, track progress
- **Admin Users**: Can add, edit, and delete content, manage episodes and chapters

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Framer Motion](https://www.framer.com/motion/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/) 