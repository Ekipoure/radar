import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { Banner, CreateBannerData } from '@/lib/types';

// GET /api/banners - Get all banners
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM banners 
        ORDER BY created_at DESC
      `);
      
      const banners: Banner[] = result.rows;
      
      return NextResponse.json({ banners });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت بنرها' },
      { status: 500 }
    );
  }
}

// POST /api/banners - Create a new banner
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const body: CreateBannerData = await request.json();
    const { text, speed = 10, color = '#FFFFFF', background_color = '#3B82F6', font_size = 24 } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'متن بنر الزامی است' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO banners (text, speed, color, background_color, font_size)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [text.trim(), speed, color, background_color, font_size]);
      
      const banner: Banner = result.rows[0];
      
      return NextResponse.json({ banner }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      { error: 'خطا در ایجاد بنر' },
      { status: 500 }
    );
  }
}
