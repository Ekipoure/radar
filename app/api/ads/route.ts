import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { Ad, CreateAdData } from '@/lib/types';

// GET /api/ads - Get all ads
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = 'SELECT * FROM ads';
    const params: any[] = [];

    if (activeOnly) {
      query += ' WHERE is_active = $1 ORDER BY created_at DESC';
      params.push(true);
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);
    const ads: Ad[] = result.rows;

    return NextResponse.json({ ads });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ads' },
      { status: 500 }
    );
  }
}

// POST /api/ads - Create a new ad
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const { title, image_url, link_url }: CreateAdData = body;

    // Validate required fields
    if (!title || !image_url) {
      return NextResponse.json(
        { error: 'Title and image URL are required' },
        { status: 400 }
      );
    }

    // Validate image URL: allow absolute URLs and server-relative uploads path
    const isRelativeUploadPath = typeof image_url === 'string' && (image_url.startsWith('/uploads/') || image_url.startsWith('/api/uploads/'));
    if (!isRelativeUploadPath) {
      try {
        // Throws only if not a valid absolute URL
        new URL(image_url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid image URL format' },
          { status: 400 }
        );
      }
    }

    // Validate link URL if provided
    if (link_url) {
      try {
        new URL(link_url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid link URL format' },
          { status: 400 }
        );
      }
    }

    const result = await pool.query(
      'INSERT INTO ads (title, image_url, link_url) VALUES ($1, $2, $3) RETURNING *',
      [title, image_url, link_url || null]
    );

    const newAd: Ad = result.rows[0];

    return NextResponse.json({ ad: newAd }, { status: 201 });
  } catch (error) {
    console.error('Error creating ad:', error);
    return NextResponse.json(
      { error: 'Failed to create ad' },
      { status: 500 }
    );
  }
}
