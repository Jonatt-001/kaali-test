exports.handler = async (event) => {
  // 1. Extract and clean slug from URL
  let slug = event.pathParameters?.slug || 
             new URL(event.rawUrl).pathname.split('/').pop()
  
  // Remove trailing slashes
  slug = slug.replace(/\/+$/, '').trim()

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const siteUrl = process.env.URL || 'https://your-site.netlify.app'
  const fullUrl = `${siteUrl}/article/${slug}`

  try {
    // 2. Fetch article from Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?slug=eq.${slug}&status=eq.published`,
      { 
        headers: { 
          apikey: SUPABASE_KEY, 
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        } 
      }
    )
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status} ${response.statusText}`)
    }
    
    const articles = await response.json()

    if (!articles || articles.length === 0) {
      return { 
        statusCode: 404, 
        headers: { 'Content-Type': 'text/html' }, 
        body: `<!DOCTYPE html><html><head><title>404 - Article Not Found</title></head><body style="font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center;"><h1>Article Not Found</h1><p style="color: #666;">The article you're looking for doesn't exist or has been removed.</p><a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px;">← Back to Home</a></body></html>` 
      }
    }

    const article = articles[0]

    // 3. Map Editor Fields to SEO Variables (with fallbacks for both column names)
    const title = article.seo_title || article.title || 'Untitled'
    const description = article.seo_description || article.excerpt || ''
    const keywords = article.seo_keywords || ''
    const category = article.category || 'General'
    const author = article.author || 'D I MAGAZINE'
    const type = article.type || 'article'
    const publishedDate = article.published_at || article.created_at
    const modifiedDate = article.updated_at || article.created_at
    
    // FIXED: Use correct column names (cover_image instead of featured_image, description instead of content)
    const content = article.description || article.content || ''
    const featuredImage = article.cover_image || article.featured_image

    // Handle Featured Image for Social Media
    let ogImage = `${siteUrl}/default-og.jpg` 
    if (featuredImage) {
      if (featuredImage.startsWith('http')) {
        ogImage = featuredImage
      } else if (!featuredImage.startsWith('data:image')) {
        ogImage = `${siteUrl}${featuredImage}`
      } else {
        // For base64 images, use a default OG image
        ogImage = `${siteUrl}/default-og.jpg`
      }
    }

    // Handle tags (could be array or string)
    let tagsArray = []
    if (article.tags) {
      if (typeof article.tags === 'string') {
        try { 
          tagsArray = JSON.parse(article.tags) 
        } catch { 
          tagsArray = article.tags.split(',').map(t => t.trim()).filter(t => t) 
        }
      } else if (Array.isArray(article.tags)) {
        tagsArray = article.tags
      }
    }

    // 4. Generate JSON-LD Schema
    const schema = {
      "@context": "https://schema.org",
      "@type": type === 'post' ? 'BlogPosting' : 'Article',
      "headline": title,
      "description": description,
      "keywords": keywords,
      "articleSection": category,
      "image": ogImage,
      "datePublished": publishedDate,
      "dateModified": modifiedDate,
      "author": { 
        "@type": "Person", 
        "name": author 
      },
      "publisher": {
        "@type": "Organization",
        "name": "D I MAGAZINE",
        "logo": { 
          "@type": "ImageObject", 
          "url": `${siteUrl}/logo.png` 
        }
      },
      "mainEntityOfPage": { 
        "@type": "WebPage", 
        "@id": fullUrl 
      }
    }

    // 5. Build Premium HTML with Proper Styling
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="author" content="${escapeHtml(author)}">
  <link rel="canonical" href="${fullUrl}">
  
  <!-- Open Graph / Facebook / LinkedIn -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="article:published_time" content="${publishedDate}">
  <meta property="article:modified_time" content="${modifiedDate}">
  <meta property="article:section" content="${escapeHtml(category)}">
  ${tagsArray.length ? `<meta property="article:tag" content="${escapeHtml(tagsArray.join(', '))}">` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${fullUrl}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- JSON-LD Schema -->
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.7;
      color: #0f172a;
      background: #ffffff;
    }
    .header {
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      padding: 18px 20px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header a {
      text-decoration: none;
      color: #0f172a;
      font-weight: 700;
      font-family: 'Unbounded', sans-serif;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .header a:hover { color: #f97316; }
    .article-wrapper {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 20px 60px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      text-decoration: none;
      margin-bottom: 24px;
      transition: color 0.2s;
    }
    .back-link:hover { color: #0f172a; }
    .article-title {
      font-family: 'Unbounded', sans-serif;
      font-size: clamp(1.8rem, 4vw, 2.5rem);
      font-weight: 800;
      line-height: 1.2;
      color: #0f172a;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .article-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      flex-wrap: wrap;
    }
    .meta-category {
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      color: #f97316;
      background: rgba(249, 115, 22, 0.1);
      padding: 6px 12px;
      border-radius: 6px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .meta-date {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
    .meta-author {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
    }
    .featured-image {
      width: 100%;
      max-height: 500px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 32px;
    }
    .article-content {
      font-size: 16px;
      line-height: 1.8;
      color: #1e293b;
    }
    .article-content p { margin-bottom: 20px; }
    .article-content h1, .article-content h2, .article-content h3 {
      font-family: 'Unbounded', sans-serif;
      color: #0f172a;
      margin: 32px 0 16px;
      font-weight: 700;
      line-height: 1.3;
    }
    .article-content h1 { font-size: 2rem; }
    .article-content h2 { font-size: 1.6rem; }
    .article-content h3 { font-size: 1.3rem; }
    .article-content img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 24px 0;
    }
    .article-content ul, .article-content ol {
      margin: 20px 0;
      padding-left: 24px;
    }
    .article-content li { margin-bottom: 12px; }
    .article-content blockquote {
      border-left: 4px solid #f97316;
      padding-left: 20px;
      margin: 24px 0;
      color: #475569;
      font-style: italic;
    }
    .article-content a {
      color: #2563eb;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .article-content a:hover { color: #1d4ed8; }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover { text-decoration: underline; }
    .share-buttons {
      display: flex;
      gap: 8px;
    }
    .share-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .share-btn:hover {
      background: #f8fafc;
      transform: translateY(-2px);
    }
    @media (max-width: 768px) {
      .article-wrapper { padding: 24px 16px 40px; }
      .article-title { font-size: 1.6rem; }
      .article-content { font-size: 15px; }
    }
  </style>
</head>
<body>
  <header class="header">
    <a href="/">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      DE IMAGE MAG
    </a>
  </header>

  <main class="article-wrapper">
    <a href="javascript:history.back()" class="back-link">← Back</a>
    
    <article>
      <header>
        <h1 class="article-title">${escapeHtml(article.title)}</h1>
        <div class="article-meta">
          <span class="meta-category">${escapeHtml(category)}</span>
          <span class="meta-date">${new Date(publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span class="meta-author">By ${escapeHtml(author)}</span>
        </div>
        ${featuredImage && !featuredImage.startsWith('data:image') ? `
          <img src="${featuredImage}" alt="${escapeHtml(title)}" class="featured-image" loading="eager">
        ` : ''}
      </header>

      <div class="article-content">
        ${content}
      </div>
      
      <footer class="footer">
        <a href="/">← Back to all articles</a>
        <div class="share-buttons">
          <button class="share-btn" onclick="sharePost('twitter')" title="Share on Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.3 1.7-2.3-.8.5-1.7.9-2.6 1.1A4.1 4.1 0 0015.5 4c-2.3 0-4.1 1.9-4.1 4.2 0 .3 0 .6.1.9-3.4-.2-6.4-1.8-8.4-4.3-.4.7-.6 1.5-.6 2.3 0 1.5.8 2.8 2 3.6-.7 0-1.3-.2-1.9-.5v.1c0 2.1 1.5 3.8 3.4 4.2-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.6 1.8 2.3 3.2 4.3 3.2A8.3 8.3 0 012 19.5a11.7 11.7 0 006.3 1.9c7.6 0 11.8-6.4 11.8-11.9v-.5c.8-.6 1.4-1.3 1.9-2.2z"/></svg>
          </button>
          <button class="share-btn" onclick="sharePost('facebook')" title="Share on Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.7v-3h2.7V9.6c0-2.7 1.6-4.2 4-4.2 1.2 0 2.4.2 2.4.2v2.7h-1.3c-1.3 0-1.7.8-1.7 1.6v2h3l-.5 3h-2.5v7A10 10 0 0022 12z"/></svg>
          </button>
          <button class="share-btn" onclick="sharePost('whatsapp')" title="Share on WhatsApp" style="background: #25D366; color: white; border: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3.9A11.8 11.8 0 0012.1 1C6 1 1 6 1 12.1c0 2.1.6 4.1 1.7 5.9L1 23l5.2-1.6c1.7.9 3.7 1.4 5.8 1.4 6.1 0 11.1-5 11.1-11.1 0-3-.1-5.9-3.1-7.8zM12 20.3c-1.8 0-3.6-.5-5.1-1.5l-.4-.2-3.1.9.9-3-.2-.4a8.3 8.3 0 01-1.3-4.5c0-4.6 3.7-8.3 8.3-8.3 2.2 0 4.3.9 5.9 2.4a8.3 8.3 0 012.4 5.9c0 4.6-3.7 8.3-8.3 8.3zm4.5-6.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.2-.4.1-.2-.1-.9-.3-1.7-1-.7-.6-1.1-1.3-1.3-1.5-.1-.2 0-.3.1-.4.1-.1.2-.2.3-.3.1-.1.2-.2.2-.3.1-.1 0-.3 0-.4s-.5-1.3-.7-1.8c-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.3 0-.5.2s-.7.7-.7 1.6.7 1.8.8 1.9c.1.1 1.4 2.2 3.3 3 .5.2.9.4 1.2.5.5.2 1 .2 1.3.1.4-.1 1.2-.5 1.4-.9.2-.4.2-.8.2-.9 0-.1-.2-.2-.4-.3z"/></svg>
          </button>
        </div>
      </footer>
    </article>
  </main>

  <script>
    function sharePost(platform) {
      const url = '${fullUrl}';
      const title = '${escapeJs(title)}';
      
      const urls = {
        twitter: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
        whatsapp: 'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url)
      };
      
      if (urls[platform]) {
        window.open(urls[platform], '_blank', 'width=600,height=400');
      }
    }
  </script>
</body>
</html>`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff'
      },
      body: html
    }

  } catch (error) {
    console.error('SSR Error:', error)
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><title>Error</title></head><body style="font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center;"><h1>Server Error</h1><p style="color: #666;">${escapeHtml(error.message)}</p><a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px;">← Back to Home</a></body></html>` 
    }
  }
}

// Helper functions
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeJs(text) {
  if (!text) return ''
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
}

