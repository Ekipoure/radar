import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { UpdateAgentData } from '@/lib/types';
import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const agentId = parseInt(params.id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const updateData: UpdateAgentData = await request.json();

    const client = await pool.connect();
    
    try {
      // Build dynamic query based on provided fields
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(updateData.name);
      }
      if (updateData.server_ip !== undefined) {
        updateFields.push(`server_ip = $${paramCount++}`);
        values.push(updateData.server_ip);
      }
      if (updateData.username !== undefined) {
        updateFields.push(`username = $${paramCount++}`);
        values.push(updateData.username);
      }
      if (updateData.repo_url !== undefined) {
        updateFields.push(`repo_url = $${paramCount++}`);
        values.push(updateData.repo_url);
      }
      if (updateData.location !== undefined) {
        updateFields.push(`location = $${paramCount++}`);
        values.push(updateData.location);
      }
      if (updateData.port !== undefined) {
        updateFields.push(`port = $${paramCount++}`);
        values.push(updateData.port);
      }
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updateData.status);
      }
      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(updateData.is_active);
      }

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(agentId);

      const query = `
        UPDATE agents 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      const updatedAgent = result.rows[0];
      return NextResponse.json({ agent: updatedAgent });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating agent:', error);
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
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    const agentId = parseInt(params.id);
    if (isNaN(agentId)) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM agents WHERE id = $1 RETURNING *',
        [agentId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Agent deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
