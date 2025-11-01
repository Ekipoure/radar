import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { verifyToken } from '@/lib/auth';

// GET site settings (public endpoint for displaying on main page)
export async function GET() {
  try {
    const result = await pool.query(
      'SELECT header_title, header_subtitle, header_tagline, footer_text, footer_enabled FROM site_settings WHERE id = 1'
    );

    if (result.rows.length === 0) {
      // Return default values if no settings exist
      return NextResponse.json({
        settings: {
          header_title: 'رادار مانیتورینگ',
          header_subtitle: 'سیستم نظارت بر سرورها',
          header_tagline: 'پایش هوشمند، تصمیم مطمئن',
          footer_text: '© ۱۴۰۳ سیستم رادار مانیتورینگ. تمامی حقوق محفوظ است.',
          footer_enabled: true
        }
      });
    }

    return NextResponse.json({
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site settings' },
      { status: 500 }
    );
  }
}

// PUT/PATCH site settings (requires authentication)
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { header_title, header_subtitle, header_tagline, footer_text, footer_enabled } = body;

    // Update site settings
    await pool.query(
      `UPDATE site_settings 
       SET 
         header_title = $1,
         header_subtitle = $2,
         header_tagline = $3,
         footer_text = $4,
         footer_enabled = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        header_title || null,
        header_subtitle || null,
        header_tagline || null,
        footer_text || null,
        footer_enabled !== undefined ? footer_enabled : true
      ]
    );

    return NextResponse.json({ message: 'Site settings updated successfully' });
  } catch (error) {
    console.error('Error updating site settings:', error);
    return NextResponse.json(
      { error: 'Failed to update site settings' },
      { status: 500 }
    );
  }
}

// Support PATCH method as well
export async function PATCH(request: NextRequest) {
  return PUT(request);
}

