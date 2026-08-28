import { NextResponse } from 'next/server';

/**
 * Proxy for the iTunes Search API.
 * Avoids direct client-side calls which are subject to CORS policy changes.
 * Results are cached for 60 seconds to reduce external API load.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = searchParams.get('limit') ?? '4';

  if (!q || !q.trim()) {
    return NextResponse.json({ error: 'Missing query parameter: q' }, { status: 400 });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q.trim())}&limit=${limit}&entity=song`;
    const res = await fetch(url, {
      next: { revalidate: 60 }, // cache identical queries for 60s
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `iTunes API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to reach iTunes API' }, { status: 502 });
  }
}
