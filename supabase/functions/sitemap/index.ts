import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SITE_URL = 'https://startworking.in'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'index'

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        if (type === 'index') {
            return serveIndex()
        } else if (type === 'pages') {
            return servePages()
        } else if (type === 'blogs') {
            return await serveBlogs(supabase)
        } else if (type === 'govt-jobs') {
            return await serveGovtJobs(supabase)
        }

        return new Response('Not Found', { status: 404 })
    } catch (error) {
        console.error('Sitemap error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }
})

function serveIndex() {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-blogs.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-government-jobs.xml</loc>
  </sitemap>
</sitemapindex>`
    return xmlResponse(xml)
}

function servePages() {
    const pages = [
        { path: '/', priority: '1.0', changefreq: 'daily' },
        { path: '/about', priority: '0.8', changefreq: 'monthly' },
        { path: '/contact', priority: '0.8', changefreq: 'monthly' },
        { path: '/pricing', priority: '0.8', changefreq: 'monthly' },
        { path: '/blog', priority: '0.9', changefreq: 'daily' },
        { path: '/government-jobs', priority: '0.9', changefreq: 'daily' }
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')}
</urlset>`
    return xmlResponse(xml)
}

async function serveBlogs(supabase: any) {
    const { data: blogs, error } = await supabase
        .from('blogs')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

    if (error) throw error

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${blogs?.map((blog: any) => `
  <url>
    <loc>${SITE_URL}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.updated_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('').trim() || ''}
</urlset>`
    return xmlResponse(xml)
}

async function serveGovtJobs(supabase: any) {
    const { data: jobs, error } = await supabase
        .from('govt_jobs')
        .select('slug, updated_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    if (error) throw error

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${jobs?.map((job: any) => `
  <url>
    <loc>${SITE_URL}/government-jobs/${job.slug}</loc>
    <lastmod>${new Date(job.updated_at).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('').trim() || ''}
</urlset>`
    return xmlResponse(xml)
}

function xmlResponse(xml: string) {
    return new Response(xml.trim(), {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600',
            ...corsHeaders
        }
    })
}
