'use client';

import { analytics } from '@/lib/analytics';
import { ExternalLink, FileText } from 'lucide-react';
import MarkdownToJSX from 'markdown-to-jsx';
import React, { ReactNode } from 'react';
import 'swiper/css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { JsonRendererEmbed } from './JsonRendererEmbed';
import type { JsonRendererResult } from '@/json-render/types';

interface MarkdownProps {
  children: string;
  className?: string;
  jsonRendererLookup?: Record<string, JsonRendererResult>;
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
              className="block rounded-lg overflow-hidden bg-muted select-none"
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

// Image Gallery Component - always uses carousel for consistent display
const ImageGallery = ({ urls }: { urls: string[] }) => {
  if (urls.length === 0) return null;
  
  // Always use carousel for consistent styling
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
        className="flex items-stretch gap-0 bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group max-w-sm"
      >
        {/* File Icon Section */}
        <div className="flex items-center justify-center bg-[linear-gradient(135deg,rgba(var(--color-primary),0.95),rgba(var(--color-info),0.9))] px-4 py-4">
          <FileText className="w-8 h-8 text-primary-foreground" />
        </div>
        
        {/* File Info Section */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">
              {fileName}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {fileExtension}
            </span>
            <span className="text-xs text-muted-foreground">
              Document
            </span>
          </div>
        </div>
        
        {/* Action Section */}
        <div className="flex items-center px-3 border-l border-border bg-secondary/60 group-hover:bg-secondary transition-colors">
          <div className="flex flex-col items-center gap-1">
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-link transition-colors" />
            <span className="text-[10px] text-muted-foreground group-hover:text-link transition-colors">
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
  | { type: 'images'; value: string[] }
  | { type: 'json-renderer'; value: string };

// Function to parse and extract embeds from content
// Supports: [RESUME:url], {{resume:url}}, <RESUME>url</RESUME>, and <IMG>url</IMG> formats
function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  
  // Combined pattern for resume and image tags
  const combinedPattern = /(?:\[RESUME:([^\]]+)\]|\{\{resume:([^}]+)\}\}|<RESUME>([^<]+)<\/RESUME>|(<IMG>(?:[^<]+)<\/IMG>)+|<JSONRenderer>([^<]+)<\/JSONRenderer>)/gi;
  
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
    } else if (match[0].includes('<JSONRenderer>')) {
      const jsonRendererId = (match[5] || '').trim();
      if (jsonRendererId) {
        parts.push({ type: 'json-renderer', value: jsonRendererId });
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
  <h1 className="text-2xl font-bold text-foreground mb-4 mt-6 first:mt-0">{children}</h1>
);

const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold text-foreground mb-3 mt-5 first:mt-0">{children}</h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h3>
);

const H4 = ({ children }: { children: ReactNode }) => (
  <h4 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">{children}</h4>
);

const Paragraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-foreground/90 leading-relaxed mb-3 last:mb-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{children}</p>
);

const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-foreground">{children}</strong>
);

const Em = ({ children }: { children: ReactNode }) => (
  <em className="italic text-foreground/90">{children}</em>
);

const UnorderedList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc ml-4 pl-1 space-y-1.5 mb-3 text-sm text-foreground/90">{children}</ul>
);

const OrderedList = ({ children }: { children: ReactNode }) => (
  <ol className="list-decimal ml-4 pl-1 space-y-1.5 mb-3 text-sm text-foreground/90">{children}</ol>
);

// List item that handles embedded images - always uses ImageGallery for consistent styling
const ListItem = ({ children }: { children: ReactNode }) => {
  // Check if children contains images - we need to extract them for gallery/carousel
  const childArray = React.Children.toArray(children);
  const imageUrls: string[] = [];
  const otherChildren: ReactNode[] = [];
  
  // Process children to separate images from text
  childArray.forEach((child) => {
    if (React.isValidElement(child)) {
      // Check if it's our Img component or a native img
      const childType = child.type as { name?: string } | string;
      const typeName = typeof childType === 'function' ? childType.name : childType;
      
      if (typeName === 'Img' || typeName === 'img') {
        const src = (child.props as { src?: string }).src;
        if (src) {
          imageUrls.push(src);
        }
      } else {
        otherChildren.push(child);
      }
    } else {
      // Keep text nodes and other content
      otherChildren.push(child);
    }
  });
  
  // If we have any images, render them using ImageGallery (handles single or multiple)
  if (imageUrls.length > 0) {
    return (
      <li className="text-sm text-foreground/90 leading-relaxed pl-1">
        {otherChildren}
        <ImageGallery urls={imageUrls} />
      </li>
    );
  }
  
  // No images - render normally
  return (
    <li className="text-sm text-foreground/90 leading-relaxed pl-1">{children}</li>
  );
};

const Blockquote = ({ children }: { children: ReactNode }) => (
  <blockquote className="border-l-4 border-border pl-4 py-2 my-3 text-muted-foreground italic bg-secondary rounded-r">
    {children}
  </blockquote>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="bg-muted text-foreground/90 px-1.5 py-0.5 rounded text-sm font-mono">
    {children}
  </code>
);

const Pre = ({ children }: { children: ReactNode }) => (
  <pre className="bg-code-bg text-code-fg p-4 rounded-lg overflow-x-auto mb-3 text-sm font-mono border border-border">
    {children}
  </pre>
);

const Link = ({ children, href }: { children: ReactNode; href?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-link hover:text-link-hover underline inline-block max-w-full"
    style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
  >
    {children}
  </a>
);

const Hr = () => <hr className="border-border my-4" />;

const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto mb-4 -mx-2 px-2">
    <div className="inline-block min-w-full align-middle">
      <div className="overflow-hidden border border-border rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">{children}</table>
      </div>
    </div>
  </div>
);

const Thead = ({ children }: { children: ReactNode }) => (
  <thead className="bg-muted">{children}</thead>
);

const Tbody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-border bg-card">{children}</tbody>
);

const Tr = ({ children }: { children: ReactNode }) => (
  <tr className="hover:bg-secondary/60 transition-colors">{children}</tr>
);

const Th = ({ children }: { children: ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/90 uppercase tracking-wider whitespace-nowrap border-b border-border">
    {children}
  </th>
);

const Td = ({ children }: { children: ReactNode }) => (
  <td className="px-4 py-3 text-foreground whitespace-nowrap">
    {children}
  </td>
);

// Custom image component that renders nicely
const Img = ({ src, alt }: { src?: string; alt?: string }) => {
  if (!src) return null;
  return (
    <span className="inline-block my-1 mr-1">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg overflow-hidden bg-muted"
      >
        <img
          src={src}
          alt={alt || 'Image'}
          className="w-auto h-32 sm:h-40 object-cover"
          style={{ maxWidth: '200px' }}
        />
      </a>
    </span>
  );
};

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
    img: { component: Img },
    hr: { component: Hr },
    table: { component: Table },
    thead: { component: Thead },
    tbody: { component: Tbody },
    tr: { component: Tr },
    th: { component: Th },
    td: { component: Td },
  },
};

export function Markdown({ children, className = '', jsonRendererLookup }: MarkdownProps) {
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

        if (part.type === 'json-renderer') {
          const result = jsonRendererLookup?.[part.value];
          if (!result) {
            return (
              <div key={`json-renderer-${index}`} className="my-4 rounded-xl border border-dashed border-border/70 px-4 py-3 text-xs text-muted-foreground">
                JSON renderer output pending: {part.value}
              </div>
            );
          }
          return <JsonRendererEmbed key={`json-renderer-${index}`} result={result} />;
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
