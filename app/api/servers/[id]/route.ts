import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { UpdateServerData } from '@/lib/types';
import { verifyToken } from '@/lib/auth';

function getAuthToken(request: NextRequest): string | null {
  return request.cookies.get('auth-token')?.value || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM servers WHERE id = $1',
        [params.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 });
      }

      return NextResponse.json({ server: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData: UpdateServerData = await request.json();
    const client = await pool.connect();
    
    try {
      // Build dynamic query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      values.push(params.id);
      const query = `
        UPDATE servers 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 });
      }

      return NextResponse.json({ server: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAuthToken(request);
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM servers WHERE id = $1 RETURNING id',
        [params.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Server not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting server:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
