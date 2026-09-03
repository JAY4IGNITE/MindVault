import DOMPurify from 'dompurify';

const sanitizerConfig = {
  ALLOWED_TAGS: [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
    'ul',
    'ol',
    'li',
    'br',
    'code',
    'pre',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'span',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id'],
};

export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';

  // Ensure external links have rel="noopener noreferrer"
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return DOMPurify.sanitize(dirty, sanitizerConfig) as string;
};
