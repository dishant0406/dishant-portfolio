'use client';

import { analytics } from '@/lib/analytics';
import { ExternalLink, FileText } from 'lucide-react';
import MarkdownToJSX from 'markdown-to-jsx';
import { ReactNode } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide } from 'swiper/react';

interface MarkdownProps {
  children: string;
  className?: string;
}

// Image Carousel Component using Swiper - shows 1.3 images, swipeable, no arrows
const ImageCarousel = ({ urls }: { urls: string[] }) => {
  return (
    <div className="my-3 -mx-1 overflow-hidden select-none">
      <Swiper
        spaceBetween={6}
        slidesPerView={1.3}
        grabCursor={true}
        className="!overflow-visible"
      >
        {urls.map((url, index) => (
          <SwiperSlide key={index}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-800 select-none"
            >
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-36 sm:h-44 object-cover select-none pointer-events-none"
                draggable={false}
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

// Single Image Component - centered
const SingleImage = ({ url }: { url: string }) => {
  return (
    <div className="my-3 flex justify-center select-none">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-800 select-none"
        style={{ maxWidth: '280px' }}
      >
        <img
          src={url}
          alt="Shared image"
          className="w-full h-auto object-cover select-none"
          style={{ maxHeight: '200px' }}
        />
      </a>
    </div>
  );
};

// Image Gallery Component - handles single or multiple images
const ImageGallery = ({ urls }: { urls: string[] }) => {
  if (urls.length === 0) return null;
  
  if (urls.length === 1) {
    return <SingleImage url={urls[0]} />;
  }
  
  return <ImageCarousel urls={urls} />;
};

// Resume/Document Embed Component - WhatsApp style
const ResumeEmbed = ({ url }: { url: string }) => {
  const fileName = 'Resume.pdf';
  const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'PDF';
  
  const handleClick = () => {
    analytics.resumeDownloaded();
  };
  
  return (
    <div className="my-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex items-stretch gap-0 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden hover:shadow-md transition-all group max-w-sm"
      >
        {/* File Icon Section */}
        <div className="flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 px-4 py-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        
        {/* File Info Section */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {fileName}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
              {fileExtension}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Document
            </span>
          </div>
        </div>
        
        {/* Action Section */}
        <div className="flex items-center px-3 border-l border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 group-hover:bg-gray-100 dark:group-hover:bg-neutral-700/50 transition-colors">
          <div className="flex flex-col items-center gap-1">
            <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
              Open
            </span>
          </div>
        </div>
      </a>
    </div>
  );
};

// Types for parsed content parts
type ContentPart = 
  | { type: 'text'; value: string }
  | { type: 'resume'; value: string }
  | { type: 'images'; value: string[] };

// Function to parse and extract embeds from content
// Supports: [RESUME:url], {{resume:url}}, <RESUME>url</RESUME>, and <IMG>url</IMG> formats
function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  
  // Combined pattern for resume and image tags
  const combinedPattern = /(?:\[RESUME:([^\]]+)\]|\{\{resume:([^}]+)\}\}|<RESUME>([^<]+)<\/RESUME>|(<IMG>(?:[^<]+)<\/IMG>)+)/gi;
  
  const matches = Array.from(content.matchAll(combinedPattern));
  
  if (matches.length === 0) {
    return [{ type: 'text', value: content }];
  }
  
  for (const match of matches) {
    const matchStart = match.index!;
    
    // Add text before this match
    if (matchStart > lastIndex) {
      const textBefore = content.substring(lastIndex, matchStart);
      if (textBefore.trim()) {
        parts.push({ type: 'text', value: textBefore });
      }
    }
    
    // Check if it's an image match (contains <IMG>)
    if (match[0].includes('<IMG>')) {
      // Extract all consecutive <IMG> tags
      const imgPattern = /<IMG>([^<]+)<\/IMG>/gi;
      const imgMatches = Array.from(match[0].matchAll(imgPattern));
      const imageUrls = imgMatches.map(m => m[1].trim()).filter(url => url);
      
      if (imageUrls.length > 0) {
        parts.push({ type: 'images', value: imageUrls });
      }
    } else {
      // It's a resume match
      const url = (match[1] || match[2] || match[3] || '').trim();
      if (url) {
        parts.push({ type: 'resume', value: url });
      }
    }
    
    lastIndex = matchStart + match[0].length;
  }
  
  // Add remaining text after last match
  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex);
    if (textAfter.trim()) {
      parts.push({ type: 'text', value: textAfter });
    }
  }
  
  return parts;
}

// Custom styled components for markdown rendering with dark mode support
const H1 = ({ children }: { children: ReactNode }) => (
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6 first:mt-0">{children}</h1>
);

const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5 first:mt-0">{children}</h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4 first:mt-0">{children}</h3>
);

const H4 = ({ children }: { children: ReactNode }) => (
  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">{children}</h4>
);

const Paragraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 last:mb-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{children}</p>
);

const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
);

const Em = ({ children }: { children: ReactNode }) => (
  <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
);

const UnorderedList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc ml-4 pl-1 space-y-1.5 mb-3 text-sm text-gray-700 dark:text-gray-300">{children}</ul>
);

const OrderedList = ({ children }: { children: ReactNode }) => (
  <ol className="list-decimal ml-4 pl-1 space-y-1.5 mb-3 text-sm text-gray-700 dark:text-gray-300">{children}</ol>
);

const ListItem = ({ children }: { children: ReactNode }) => (
  <li className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-1">{children}</li>
);

const Blockquote = ({ children }: { children: ReactNode }) => (
  <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-3 text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-neutral-800 rounded-r">
    {children}
  </blockquote>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">
    {children}
  </code>
);

const Pre = ({ children }: { children: ReactNode }) => (
  <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto mb-3 text-sm font-mono border border-gray-800 dark:border-neutral-700">
    {children}
  </pre>
);

const Link = ({ children, href }: { children: ReactNode; href?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline inline-block max-w-full"
    style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
  >
    {children}
  </a>
);

const Hr = () => <hr className="border-gray-200 dark:border-neutral-700 my-4" />;

const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto mb-3">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 text-sm">{children}</table>
  </div>
);

const Thead = ({ children }: { children: ReactNode }) => (
  <thead className="bg-gray-50 dark:bg-neutral-800">{children}</thead>
);

const Tbody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">{children}</tbody>
);

const Tr = ({ children }: { children: ReactNode }) => <tr>{children}</tr>;

const Th = ({ children }: { children: ReactNode }) => (
  <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">{children}</th>
);

const Td = ({ children }: { children: ReactNode }) => (
  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{children}</td>
);

const markdownOptions = {
  overrides: {
    h1: { component: H1 },
    h2: { component: H2 },
    h3: { component: H3 },
    h4: { component: H4 },
    p: { component: Paragraph },
    strong: { component: Strong },
    em: { component: Em },
    ul: { component: UnorderedList },
    ol: { component: OrderedList },
    li: { component: ListItem },
    blockquote: { component: Blockquote },
    code: { component: Code },
    pre: { component: Pre },
    a: { component: Link },
    hr: { component: Hr },
    table: { component: Table },
    thead: { component: Thead },
    tbody: { component: Tbody },
    tr: { component: Tr },
    th: { component: Th },
    td: { component: Td },
  },
};

export function Markdown({ children, className = '' }: MarkdownProps) {
  // Parse content to extract embeds
  const parts = parseContent(children);
  
  // If only text, render simple markdown
  if (parts.length === 1 && parts[0].type === 'text') {
    return (
      <div className={`markdown-content overflow-hidden ${className}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        <MarkdownToJSX options={markdownOptions}>{parts[0].value}</MarkdownToJSX>
      </div>
    );
  }
  
  // Render parts with embeds
  return (
    <div className={`markdown-content overflow-hidden ${className}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      {parts.map((part, index) => {
        if (part.type === 'resume') {
          return <ResumeEmbed key={`resume-${index}`} url={part.value} />;
        }
        
        if (part.type === 'images') {
          return <ImageGallery key={`images-${index}`} urls={part.value} />;
        }
        
        return (
          <MarkdownToJSX key={`text-${index}`} options={markdownOptions}>
            {part.value}
          </MarkdownToJSX>
        );
      })}
    </div>
  );
}

export default Markdown;
