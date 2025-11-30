import { HomePage } from '@/components';
import { getThreadById } from '@/lib/get-thread';
import type { Metadata } from 'next';
import { Suspense } from 'react';

// OG Image URL
const ogImage = 'https://cdn.jsdelivr.net/gh/dishant0406/images-repo@master/dishantsharma.webp';

// Default metadata
const defaultMetadata: Metadata = {
  title: 'Dishant Sharma | Full Stack Developer',
  description: "Interactive portfolio of Dishant Sharma - Full Stack Developer. Chat with me to learn about my projects, skills, and experience.",
  keywords: ['Dishant Sharma', 'Portfolio', 'Full Stack Developer', 'React', 'Next.js', 'TypeScript'],
  openGraph: {
    title: 'Dishant Sharma | Full Stack Developer',
    description: 'Interactive portfolio - Chat with me to learn about my projects, skills, and experience.',
    type: 'website',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Dishant Sharma - Full Stack Developer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dishant Sharma | Full Stack Developer',
    description: 'Interactive portfolio - Chat with me to learn about my projects, skills, and experience.',
    images: [ogImage],
  },
};

// Generate metadata based on chat ID in URL
export async function generateMetadata({ 
  searchParams 
}: { 
  searchParams: Promise<{ chat?: string }> 
}): Promise<Metadata> {
  const params = await searchParams;
  const chatId = params?.chat;

  // If no chat ID, return default metadata
  if (!chatId) {
    return defaultMetadata;
  }

  try {
    // Fetch thread data from Mastra memory
    const thread = await getThreadById(chatId);

    if (!thread) {
      return defaultMetadata;
    }

    const title = thread.title 
      ? `${thread.title} | Dishant Sharma` 
      : 'Chat with Dishant Sharma';
    
    const description = thread.description || 
      'A conversation about my projects, skills, and experience.';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return defaultMetadata;
  }
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
    </div>
  );
}

// Server Component - wraps the client HomePage with Suspense
export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePage />
    </Suspense>
  );
}
