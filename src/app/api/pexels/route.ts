import { NextResponse } from 'next/server'

const SUBJECT_FALLBACK_IMAGES: Record<string, string> = {
  cell: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80",
  biology: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80",
  microscope: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80",
  leaf: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&auto=format&fit=crop&q=80",
  plant: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&auto=format&fit=crop&q=80",
  photosynthesis: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&auto=format&fit=crop&q=80",
  physics: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80",
  quantum: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80",
  laser: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80",
  prism: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80",
  math: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80",
  calculus: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80",
  equation: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80",
  code: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  laptop: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  web: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  programming: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  coding: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  javascript: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
  history: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
  castle: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
  fortress: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
  old: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
  space: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
  galaxy: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
  earth: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
  globe: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
  book: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  books: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  study: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  education: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  library: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  notes: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80"
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || 'science'
  const queryLower = query.toLowerCase()

  try {
    const hasKey = process.env.PEXELS_API_KEY && 
                   process.env.PEXELS_API_KEY !== 'your-pexels-key' && 
                   !process.env.PEXELS_API_KEY.includes('dummy');

    if (!hasKey) {
      console.warn('Pexels API Key is not set or dummy. Returning LoremFlickr fallback.');
      const cleaned = queryLower.replace(/[^a-z0-9\s]/g, '').trim();
      const tags = cleaned.split(/\s+/).slice(0, 2).join(',');
      const imageUrl = `https://loremflickr.com/600/400/${encodeURIComponent(tags || 'study')}`;
      return NextResponse.json({ imageUrl })
    }
    
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: process.env.PEXELS_API_KEY || ''
      }
    })

    if (!response.ok) {
      console.error('Pexels API error status:', response.status)
      const cleaned = queryLower.replace(/[^a-z0-9\s]/g, '').trim();
      const tags = cleaned.split(/\s+/).slice(0, 2).join(',');
      const imageUrl = `https://loremflickr.com/600/400/${encodeURIComponent(tags || 'study')}`;
      return NextResponse.json({ imageUrl })
    }

    const data = await response.json()
    const imageUrl = data.photos?.[0]?.src?.landscape || data.photos?.[0]?.src?.large || ''
    
    if (!imageUrl) {
      const cleaned = queryLower.replace(/[^a-z0-9\s]/g, '').trim();
      const tags = cleaned.split(/\s+/).slice(0, 2).join(',');
      const fallbackUrl = `https://loremflickr.com/600/400/${encodeURIComponent(tags || 'study')}`;
      return NextResponse.json({ imageUrl: fallbackUrl })
    }

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Pexels API route error, falling back:', error)
    const cleaned = queryLower.replace(/[^a-z0-9\s]/g, '').trim();
    const tags = cleaned.split(/\s+/).slice(0, 2).join(',');
    const fallbackUrl = `https://loremflickr.com/600/400/${encodeURIComponent(tags || 'study')}`;
    return NextResponse.json({ imageUrl: fallbackUrl })
  }
}


