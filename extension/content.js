// content.js - Scrapes page context for passive tracking

// Listen for requests from the background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_content_context") {
    sendResponse(extractContext());
  }
  return true;
});

function extractContext() {
  const context = {
    url: window.location.href,
    title: document.title,
    description: '',
    author: '',
    platform: window.location.hostname,
    contentType: 'article'
  };

  // Try to get meta description
  const metaDesc = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
  if (metaDesc) {
    context.description = metaDesc.getAttribute('content') || '';
  }

  // YouTube specific
  if (context.url.includes('youtube.com/watch')) {
    context.contentType = 'video';
    const channelName = document.querySelector('#text.ytd-channel-name');
    if (channelName) context.author = channelName.textContent.trim();
  } 
  // Twitter/X specific
  else if (context.url.includes('twitter.com') || context.url.includes('x.com')) {
    context.contentType = 'social_feed';
  }
  // Reddit specific
  else if (context.url.includes('reddit.com')) {
    context.contentType = 'forum';
  }

  // For generic articles, grab the first few paragraphs if description is weak
  if (context.description.length < 50 && context.contentType === 'article') {
    const paragraphs = Array.from(document.querySelectorAll('p')).slice(0, 3);
    context.description = paragraphs.map(p => p.textContent.trim()).join(' ').substring(0, 500);
  }

  return context;
}
