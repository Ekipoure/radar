import { NextResponse } from 'next/server';
import pool from '@/lib/database';
import { Banner } from '@/lib/types';

// Force dynamic rendering - prevent static generation and caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/banners/active - Get only active banners for public display
export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // Use parameterized query for better security and compatibility
      const result = await client.query(`
        SELECT * FROM banners 
        WHERE is_active = $1
        ORDER BY created_at DESC
      `, [true]);
      
      const banners: Banner[] = result.rows || [];
      
      // Always return a valid response with banners array
      const res = NextResponse.json({ banners });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    } catch (dbError) {
      console.error('[API] Database error fetching active banners:', dbError);
      // Return empty array on database error, don't fail completely
      const res = NextResponse.json({ banners: [] });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Error fetching active banners:', error);
    // Always return a valid JSON response with banners array
    const res = NextResponse.json({ banners: [] });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }
}
