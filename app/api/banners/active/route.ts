import { NextResponse } from 'next/server';
import pool from '@/lib/database';
import { Banner } from '@/lib/types';

// GET /api/banners/active - Get only active banners for public display
export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM banners 
        WHERE is_active = true
        ORDER BY created_at DESC
      `);
      
      const banners: Banner[] = result.rows;
      
      return NextResponse.json({ banners });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching active banners:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت بنرهای فعال' },
      { status: 500 }
    );
  }
}
