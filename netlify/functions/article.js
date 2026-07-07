import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async (req, context) => {
  try {
    // Extract slug from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts[0] !== 'article' || !pathParts[1]) {
      return new Response('Not found', { status: 404 });
    }
    
    const slug = pathParts[1];
    
    // Fetch article from database
    const { data: article, error } = await supabase
      .from('content')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    
    if (error || !article) {
      return new Response(render404(slug), { 
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // Render full HTML with SEO
    const html = renderArticle(article);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Robots-Tag': 'index, follow'
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response('Server error', { status: 500 });
  }
};

function renderArticle(article) {
  const { 
    title, 
    seo_title, 
    excerpt, 
    body, 
    author, 
    category, 
    slug, 
    featured_image, 
    created_at, 
    updated_at,
    tags 
  } = article;
  
  const canonicalUrl = `https://deimage.com.ng/article/${slug}/`;
  const publishDate = new Date(created_at).toISOString();
  const modDate = new Date(updated_at || created_at).toISOString();
  const seoDescription = excerpt || cleanText(body, 155);
  const image = featured_image || 'https://deimage.com.ng/assets/og-default.jpg';
  const authorName = author || 'De Image Magazine';
  const categoryDisplay = category || 'General';
  
  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "headline": seo_title || title,
    "description": seoDescription,
    "image": image,
    "datePublished": publishDate,
    "dateModified": modDate,
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "publisher": {
      "@type": "Organization",
      "name": "De Image Magazine",
      "logo": {
        "@type": "ImageObject",
        "url": "https://deimage.com.ng/logo.png"
      }
    },
    "articleSection": categoryDisplay
  };
  
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://deimage.com.ng/" },
      { "@type": "ListItem", "position": 2, "name": "Articles", "item": "https://deimage.com.ng/article/" },
      { "@type": "ListItem", "position": 3, "name": title }
    ]
  };
  
  const tagsMeta = tags && tags.length 
    ? tags.map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n')
    : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${escapeHtml(seo_title || title)} | De Image Magazine</title>
<meta name="description" content="${escapeHtml(seoDescription)}">

<link rel="canonical" href="${canonicalUrl}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(seo_title || title)}">
<meta property="og:description" content="${escapeHtml(seoDescription)}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:site_name" content="De Image Magazine">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta property="article:published_time" content="${publishDate}">
<meta property="article:modified_time" content="${modDate}">
<meta property="article:author" content="${escapeHtml(authorName)}">
<meta property="article:section" content="${escapeHtml(categoryDisplay)}">
${tagsMeta}

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(seo_title || title)}">
<meta name="twitter:description" content="${escapeHtml(seoDescription)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:site" content="@deimagemag">
<meta name="twitter:creator" content="@deimagemag">

<!-- Additional SEO -->
<meta name="author" content="${escapeHtml(authorName)}">
<meta name="publisher" content="De Image Magazine">
<meta name="geo.region" content="NG">
<meta name="geo.placename" content="Nigeria">
<meta name="language" content="English">
<meta name="rating" content="general">

<!-- Theme & Icons -->
<meta name="theme-color" content="#020617">
<link rel="icon" href="https://deimage.com.ng/favicon.ico">
<link rel="apple-touch-icon" href="https://deimage.com.ng/apple-touch-icon.png">

<!-- Preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<!-- JSON-LD Schema -->
<script type="application/ld+json">
${JSON.stringify(newsArticleSchema, null, 2)}
</script>

<script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1.6;
  color: #1e293b;
  background: #fff;
}

#menu-container {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 20px 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  font-family: 'Unbounded', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: #0f172a;
  text-decoration: none;
}

.nav-logo span { color: #f97316; }

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-links a {
  text-decoration: none;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-links a:hover { color: #f97316; }

.article-wrapper {
  max-width: 640px;
  margin: 16px auto 32px;
  padding: 0 16px;
}

.article-title {
  font-family: 'Unbounded', sans-serif;
  font-weight: 700;
  font-size: clamp(1.4rem, 2.8vw, 1.9rem);
  line-height: 1.3;
  letter-spacing: -0.5px;
  color: #0f172a;
  margin-bottom: 8px;
}

.article-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.meta-date {
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0.4px;
}

.meta-category {
  font-size: 9px;
  font-weight: 700;
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: 0.2s ease;
  margin-bottom: 14px;
  text-decoration: none;
}

.back-btn:hover {
  color: #0f172a;
  transform: translateX(-2px);
}

.article-image {
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: contain;
  border-radius: 12px;
  margin-bottom: 20px;
  background: #f1f5f9;
  display: block;
}

.article-content {
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1.7;
  font-size: 14.5px;
  color: #1e293b;
}

.article-content p { margin-bottom: 14px; }

.article-content img {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
  height: auto;
}

.article-content h1,
.article-content h2,
.article-content h3 {
  font-family: 'Unbounded', sans-serif;
  color: #0f172a;
  margin: 24px 0 12px;
  font-weight: 800;
}

.article-content h1 { font-size: 1.7rem; }
.article-content h2 { font-size: 1.3rem; }
.article-content h3 { font-size: 1.05rem; }

.article-content ul,
.article-content ol {
  margin: 14px 0;
  padding-left: 1rem;
}

.article-content li {
  margin-bottom: 8px;
  line-height: 1.7;
}

.article-content blockquote {
  border-left: 4px solid #DC2626;
  padding-left: 14px;
  margin: 18px 0;
  color: #475569;
  font-style: italic;
  font-size: 14px;
}

.author-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 24px 0 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.author-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.author-name {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.author-role {
  font-size: 10px;
  color: #64748b;
  letter-spacing: 0.3px;
}

.share-bar {
  display: flex;
  gap: 8px;
  margin: 16px 0 24px;
}

.share-btn {
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #fff;
  transition: 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-btn:hover { background: #f8fafc; }

.share-whatsapp {
  background: #25D366;
  color: #fff;
  border: none;
}

.article-content a,
.article-content a:visited {
  color: #2563eb;
  text-decoration: underline;
  text-decoration-color: rgba(37, 99, 235, 0.4);
  text-underline-offset: 3px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.article-content a:hover {
  color: #1d4ed8;
  text-decoration-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
}

footer {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #fff;
  padding: 40px 20px 20px;
  margin-top: 60px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.footer-grid {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 30px;
}

.footer-brand {
  grid-column: 1 / -1;
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 30px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.footer-brand .nav-logo {
  font-family: 'Unbounded', sans-serif;
  font-size: 1.4rem;
  font-weight: 900;
  margin-bottom: 12px;
  color: #fff;
}

.footer-brand .nav-logo span { color: #f97316; }

.footer-brand p {
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.7;
  max-width: 500px;
  margin: 0 auto;
}

.footer-col h4 {
  font-family: 'Unbounded', sans-serif;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.footer-col a {
  display: block;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 13px;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.footer-col a:hover {
  color: #f97316;
  transform: translateX(4px);
}

.footer-bottom {
  max-width: 900px;
  margin: 40px auto 0;
  padding: 20px 0 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

#progressBar {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 0%;
  background: #DC2626;
  z-index: 9999;
  transition: width 0.1s linear;
}

@media (max-width: 768px) {
  .footer-grid { grid-template-columns: 1fr; gap: 30px; }
  .nav-links { display: none; }
  .article-wrapper { padding: 0 14px; margin: 12px auto 24px; }
  .article-title { font-size: 1.3rem; }
  .article-image { max-height: 250px; margin-bottom: 16px; }
}

html { scroll-behavior: smooth; }
::selection { background: #f97316; color: white; }
</style>
</head>

<body>

<div id="progressBar"></div>

<div id="menu-container">
  <div class="nav-wrapper">
    <a href="https://deimage.com.ng/" class="nav-logo">DE IMAGE<span>★</span>MAG</a>
    <div class="nav-links">
      <a href="https://deimage.com.ng/">Home</a>
      <a href="https://deimage.com.ng/?category=politics">Politics</a>
      <a href="https://deimage.com.ng/?category=business">Business</a>
      <a href="https://deimage.com.ng/?category=technology">Technology</a>
      <a href="https://deimage.com.ng/?category=entertainment">Entertainment</a>
    </div>
  </div>
</div>

<div class="article-wrapper">

<a href="javascript:history.back()" class="back-btn">← Back</a>

<h1 class="article-title">${escapeHtml(title)}</h1>

<div class="article-meta-row">
  <span class="meta-date">${formatDate(updated_at || created_at)}</span>
  <span class="meta-category">${escapeHtml(categoryDisplay)}</span>
</div>

${featured_image ? `<img src="${featured_image}" alt="${escapeHtml(title)}" class="article-image" loading="eager">` : ''}

<div class="author-box">
  <img class="author-avatar" src="https://i.postimg.cc/13JJdwM6/IMG-8276.png" alt="${escapeHtml(authorName)}">
  <div>
    <div class="author-name">${escapeHtml(authorName)}</div>
    <div class="author-role">Writer • DE IMAGE MAG</div>
  </div>
</div>

<div class="share-bar">
  <button class="share-btn" onclick="sharePost('twitter')" title="Share on Twitter">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.3 1.7-2.3-.8.5-1.7.9-2.6 1.1A4.1 4.1 0 0015.5 4c-2.3 0-4.1 1.9-4.1 4.2 0 .3 0 .6.1.9-3.4-.2-6.4-1.8-8.4-4.3-.4.7-.6 1.5-.6 2.3 0 1.5.8 2.8 2 3.6-.7 0-1.3-.2-1.9-.5v.1c0 2.1 1.5 3.8 3.4 4.2-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.6 1.8 2.3 3.2 4.3 3.2A8.3 8.3 0 012 19.5a11.7 11.7 0 006.3 1.9c7.6 0 11.8-6.4 11.8-11.9v-.5c.8-.6 1.4-1.3 1.9-2.2z"/>
    </svg>
  </button>

  <button class="share-btn" onclick="sharePost('facebook')" title="Share on Facebook">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.7v-3h2.7V9.6c0-2.7 1.6-4.2 4-4.2 1.2 0 2.4.2 2.4.2v2.7h-1.3c-1.3 0-1.7.8-1.7 1.6v2h3l-.5 3h-2.5v7A10 10 0 0022 12z"/>
    </svg>
  </button>

  <button class="share-btn share-whatsapp" onclick="sharePost('whatsapp')" title="Share on WhatsApp">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 3.9A11.8 11.8 0 0012.1 1C6 1 1 6 1 12.1c0 2.1.6 4.1 1.7 5.9L1 23l5.2-1.6c1.7.9 3.7 1.4 5.8 1.4 6.1 0 11.1-5 11.1-11.1 0-3-.1-5.9-3.1-7.8zM12 20.3c-1.8 0-3.6-.5-5.1-1.5l-.4-.2-3.1.9.9-3-.2-.4a8.3 8.3 0 01-1.3-4.5c0-4.6 3.7-8.3 8.3-8.3 2.2 0 4.3.9 5.9 2.4a8.3 8.3 0 012.4 5.9c0 4.6-3.7 8.3-8.3 8.3zm4.5-6.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.2-.4.1-.2-.1-.9-.3-1.7-1-.7-.6-1.1-1.3-1.3-1.5-.1-.2 0-.3.1-.4.1-.1.2-.2.3-.3.1-.1.2-.2.2-.3.1-.1 0-.3 0-.4s-.5-1.3-.7-1.8c-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.3 0-.5.2s-.7.7-.7 1.6.7 1.8.8 1.9c.1.1 1.4 2.2 3.3 3 .5.2.9.4 1.2.5.5.2 1 .2 1.3.1.4-.1 1.2-.5 1.4-.9.2-.4.2-.8.2-.9 0-.1-.2-.2-.4-.3z"/>
    </svg>
  </button>

  <button class="share-btn" onclick="copyLink()" title="Copy Link">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.9 12a5 5 0 015-5h3v2h-3a3 3 0 000 6h3v2h-3a5 5 0 01-5-5zm7-1h2v2h-2v-2zm4.1-4h-3v2h3a3 3 0 010 6h-3v2h3a5 5 0 000-10z"/>
    </svg>
  </button>
</div>

<div class="article-content">
${body || ''}
</div>

</div>

<footer>
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="nav-logo">DE IMAGE<span>★</span>MAG</div>
      <p>Your source for global news, culture, and insight. We deliver stories that matter — fast, clear, and reliable.</p>
    </div>
    <div class="footer-col">
      <h4>✦ Sections</h4>
      <a href="https://deimage.com.ng/">Home</a>
      <a href="https://deimage.com.ng/?category=politics">Politics</a>
      <a href="https://deimage.com.ng/?category=business">Business</a>
      <a href="https://deimage.com.ng/?category=technology">Technology</a>
      <a href="https://deimage.com.ng/?category=entertainment">Entertainment</a>
    </div>
    <div class="footer-col">
      <h4>◆ Company</h4>
      <a href="https://deimage.com.ng/about/">About</a>
      <a href="https://deimage.com.ng/contact/">Contact</a>
      <a href="https://deimage.com.ng/advertise/">Advertise</a>
    </div>
    <div class="footer-col">
      <h4>✦ Legal</h4>
      <a href="https://deimage.com.ng/privacy/">Privacy Policy</a>
      <a href="https://deimage.com.ng/terms/">Terms of Use</a>
      <a href="https://deimage.com.ng/editorial-policy/">Editorial Policy</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2026 De Image Magazine // All rights reserved</p>
  </div>
</footer>

<script>
function sharePost(platform) {
  const url = window.location.href;
  const title = document.querySelector('.article-title').innerText;

  const urls = {
    twitter: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
    whatsapp: 'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url)
  };

  if (urls[platform]) {
    window.open(urls[platform], '_blank', 'width=600,height=400');
  }
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('Link copied to clipboard!');
  });
}

window.addEventListener('scroll', () => {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  document.getElementById("progressBar").style.width = scrolled + "%";
});
</script>

</body>
</html>`;
}

function render404(slug) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Article Not Found | De Image Magazine</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <h1>Article Not Found</h1>
  <p>The article "${slug}" could not be found.</p>
  <a href="https://deimage.com.ng/">Return to homepage</a>
</body>
</html>`;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function cleanText(html, limit = 155) {
  if (!html) return '';
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > limit 
    ? text.substring(0, limit).replace(/\s+\S*$/, '') + '...'
    : text;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export const config = {
  path: "/article/*"
};

