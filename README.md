# MyMoney - Admin Panel

A Next.js application with Supabase integration, optimized for mobile devices with a clean, responsive UI using Tailwind CSS.

## Features

- Next.js 14 with App Router
- TypeScript
- Supabase authentication
- Tailwind CSS for responsive design
- Mobile-first approach
- Admin panel at `/admin`

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. The environment variables are already configured in `.env.local`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Admin Panel

Access the admin panel at `/admin`. You'll need to create a user in your Supabase project first.

## Project Structure

```
├── app/
│   ├── admin/
│   │   ├── page.tsx          # Admin login page
│   │   └── dashboard/
│   │       └── page.tsx      # Admin dashboard
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── lib/
│   └── supabase.ts           # Supabase client
└── .env.local                 # Environment variables
```

## Supabase Setup

Make sure you have:
1. Created a Supabase project
2. Set up authentication in your Supabase dashboard
3. Created at least one user for admin access

The app uses Supabase Auth for authentication. You can customize the login to use a custom users table if needed.

