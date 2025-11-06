/**
 * Strip HTML tags and return plain text
 * Works in both browser and server environments
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Check if we're in a browser environment
  if (typeof document !== 'undefined') {
    // Create a temporary DOM element to parse HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    
    // Get text content and clean it up
    let text = tmp.textContent || tmp.innerText || '';
    
    // Remove extra whitespace and newlines
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  } else {
    // Server-side: use regex to strip HTML tags
    let text = html
      // Remove script and style tags with their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Remove extra whitespace and newlines
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  }
}

/**
 * Generate SEO-friendly meta title from article title
 * Optimal length: 50-60 characters
 */
export function generateMetaTitle(title: string, maxLength: number = 60): string {
  if (!title) return '';
  
  // Strip any HTML if present
  const cleanTitle = stripHtml(title).trim();
  
  if (cleanTitle.length <= maxLength) {
    return cleanTitle;
  }
  
  // Truncate at word boundary
  const truncated = cleanTitle.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    // If we can find a good word boundary, use it
    return truncated.substring(0, lastSpace) + '...';
  }
  
  // Otherwise, truncate at character boundary
  return truncated + '...';
}

/**
 * Generate SEO-friendly meta description from excerpt or content
 * Optimal length: 150-160 characters
 */
export function generateMetaDescription(
  excerpt?: string,
  content?: string,
  maxLength: number = 160
): string {
  // Prefer excerpt if available
  let source = excerpt || content || '';
  
  if (!source) return '';
  
  // Strip HTML
  const cleanText = stripHtml(source).trim();
  
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  
  // Truncate at word boundary near the end
  const truncated = cleanText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    // If we can find a good word boundary, use it
    return truncated.substring(0, lastSpace) + '...';
  }
  
  // Otherwise, truncate at character boundary
  return truncated + '...';
}

/**
 * Extract plain text from HTML content (first paragraph or first few sentences)
 */
export function extractSummaryFromContent(content: string, maxLength: number = 160): string {
  if (!content) return '';
  
  // Strip HTML
  const cleanText = stripHtml(content).trim();
  
  // Try to get first sentence or first paragraph
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g);
  
  if (sentences && sentences.length > 0) {
    let summary = '';
    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence;
      } else {
        break;
      }
    }
    
    if (summary) {
      return summary.trim();
    }
  }
  
  // Fallback: just truncate
  return generateMetaDescription(cleanText, undefined, maxLength);
}

