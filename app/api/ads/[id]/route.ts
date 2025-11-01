import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { UpdateAdData } from '@/lib/types';

// GET /api/ads/[id] - Get a specific ad
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ad ID' },
        { status: 400 }
      );
    }

    const result = await pool.query('SELECT * FROM ads WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ad not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ad: result.rows[0] });
  } catch (error) {
    console.error('Error fetching ad:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad' },
      { status: 500 }
    );
  }
}

// PUT /api/ads/[id] - Update a specific ad
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ad ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, image_url, link_url, is_active }: UpdateAdData = body;

    // Check if ad exists
    const existingAd = await pool.query('SELECT * FROM ads WHERE id = $1', [id]);
    if (existingAd.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ad not found' },
        { status: 404 }
      );
    }

    // Validate URLs if provided
    if (image_url) {
      const isRelativeUploadPath = typeof image_url === 'string' && (image_url.startsWith('/uploads/') || image_url.startsWith('/api/uploads/'));
      if (!isRelativeUploadPath) {
        try {
          new URL(image_url);
        } catch {
          return NextResponse.json(
            { error: 'Invalid image URL format' },
            { status: 400 }
          );
        }
      }
    }

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

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (image_url !== undefined) {
      updateFields.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }
    if (link_url !== undefined) {
      updateFields.push(`link_url = $${paramCount++}`);
      values.push(link_url);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE ads SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    return NextResponse.json({ ad: result.rows[0] });
  } catch (error) {
    console.error('Error updating ad:', error);
    return NextResponse.json(
      { error: 'Failed to update ad' },
      { status: 500 }
    );
  }
}

// DELETE /api/ads/[id] - Delete a specific ad
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ad ID' },
        { status: 400 }
      );
    }

    // Check if ad exists
    const existingAd = await pool.query('SELECT * FROM ads WHERE id = $1', [id]);
    if (existingAd.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ad not found' },
        { status: 404 }
      );
    }

    await pool.query('DELETE FROM ads WHERE id = $1', [id]);

    return NextResponse.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    return NextResponse.json(
      { error: 'Failed to delete ad' },
      { status: 500 }
    );
  }
}
