/**
 * Sanitizer Utility
 * 
 * Provides XSS sanitization and input cleaning functions.
 */

import * as xss from 'xss';

/**
 * Custom XSS filter options
 */
const CUSTOM_XSS_OPTIONS: IFilterXSSOptions = {
  whiteList: {
    // Allow basic text formatting
    b: [],
    i: [],
    u: [],
    em: [],
    strong: [],
    p: [],
    br: [],
    // Allow links with safe protocols
    a: ['href', 'title', 'target'],
    // Allow lists
    ul: [],
    ol: [],
    li: [],
    // Allow code blocks
    code: [],
    pre: [],
    // Allow images with safe sources
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  onTag: (tag, html, options) => {
    // Remove all script tags
    if (tag === 'script') {
      return '';
    }
    // Remove event handlers
    if (html.includes('onerror') || html.includes('onclick') || html.includes('onload')) {
      return '';
    }
    return html;
  },
  onAttr: (name, value, options) => {
    // Remove javascript: protocol
    if (value.toLowerCase().includes('javascript:')) {
      return '';
    }
    // Remove data: protocol for potentially dangerous content
    if (name === 'href' && value.toLowerCase().startsWith('data:')) {
      return '';
    }
    return `${name}="${value}"`;
  },
  css: {
    whiteList: {
      'color': true,
      'background-color': true,
      'font-size': true,
      'font-weight': true,
      'text-align': true,
      'margin': true,
      'padding': true,
      'border': true,
    },
  },
};

/**
 * Sanitize HTML string to prevent XSS attacks
 */
export function sanitizeXSS(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return xss(value, CUSTOM_XSS_OPTIONS);
}

/**
 * Sanitize multiple fields in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeXSS(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeXSS(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Remove HTML tags from string
 */
export function stripHtmlTags(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return value.replace(/<[^>]*>/g, '');
}

/**
 * Encode HTML special characters
 */
export function encodeHTML(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return value.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return email;
  }

  // Remove whitespace and convert to lowercase
  return email.trim().toLowerCase();
}

/**
 * Sanitize URL to prevent XSS and other attacks
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }

    return parsedUrl.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize file name to prevent directory traversal
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return fileName;
  }

  // Remove path separators and hidden files
  return fileName
    .replace(/[\/\\]/g, '')
    .replace(/^\./g, '')
    .trim();
}

/**
 * Truncate string to maximum length
 */
export function truncateString(value: string, maxLength: number): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return value.substring(0, maxLength) + '...';
}
