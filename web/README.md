# MindFuel Web

A modern mental wellness dashboard designed to help users track and analyze their digital consumption habits. MindFuel provides actionable insights into how your digital "diet" affects your mood and mental energy.

## Features

- **AI Wellness Coach**: Personalized coaching based on your consumption patterns.
- **Mental Logs**: Detailed tracking of digital content (social media, news, educational, etc.).
- **Smart Insights**: Advanced analysis of mood trends and correlations between content and wellbeing.
- **Real-time Streaming**: Instant AI feedback using token streaming for a responsive experience.
- **Security & Privacy**: Built-in prompt injection protection and secure session management.

## Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org) (App Router)
- **Language**: TypeScript
- **Backend**: [Supabase](https://supabase.com) (Auth, Database, Edge Functions)
- **AI Integration**: Groq & Google Gemini via LangChain/LangGraph
- **Styling**: Tailwind CSS
- **Database ORM**: Prisma

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   Copy `.env.example` to `.env.local` and fill in your keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Visit**: [http://localhost:3000](http://localhost:3000)

## Project Structure

- `/app`: Next.js pages and API routes.
- `/components`: Reusable UI components (Dashboard, Insights, Coaching).
- `/lib`: Core logic, including AI agents, security filters, and Supabase client.
- `/supabase`: Database migrations and configuration.
- `/dev-scripts`: Utility scripts for maintenance and testing.
