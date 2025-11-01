import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';
import { Banner, UpdateBannerData } from '@/lib/types';

// GET /api/banners/[id] - Get a specific banner
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM banners WHERE id = $1
      `, [params.id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'بنر یافت نشد' },
          { status: 404 }
        );
      }
      
      const banner: Banner = result.rows[0];
      return NextResponse.json({ banner });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت بنر' },
      { status: 500 }
    );
  }
}

// PUT /api/banners/[id] - Update a banner
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const body: UpdateBannerData = await request.json();
    const { text, speed, color, background_color, font_size, is_active } = body;

    const client = await pool.connect();
    
    try {
      // Check if banner exists
      const checkResult = await client.query(`
        SELECT id FROM banners WHERE id = $1
      `, [params.id]);
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'بنر یافت نشد' },
          { status: 404 }
        );
      }

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (text !== undefined) {
        updateFields.push(`text = $${paramCount}`);
        values.push(text.trim());
        paramCount++;
      }

      if (speed !== undefined) {
        updateFields.push(`speed = $${paramCount}`);
        values.push(speed);
        paramCount++;
      }

      if (color !== undefined) {
        updateFields.push(`color = $${paramCount}`);
        values.push(color);
        paramCount++;
      }

      if (background_color !== undefined) {
        updateFields.push(`background_color = $${paramCount}`);
        values.push(background_color);
        paramCount++;
      }

      if (font_size !== undefined) {
        updateFields.push(`font_size = $${paramCount}`);
        values.push(font_size);
        paramCount++;
      }

      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount}`);
        values.push(is_active);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' },
          { status: 400 }
        );
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(params.id);

      const result = await client.query(`
        UPDATE banners 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      const banner: Banner = result.rows[0];
      return NextResponse.json({ banner });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { error: 'خطا در به‌روزرسانی بنر' },
      { status: 500 }
    );
  }
}

// DELETE /api/banners/[id] - Delete a banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        DELETE FROM banners WHERE id = $1 RETURNING *
      `, [params.id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'بنر یافت نشد' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ message: 'بنر با موفقیت حذف شد' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'خطا در حذف بنر' },
      { status: 500 }
    );
  }
}
