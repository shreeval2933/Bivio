import { prisma } from '../../shared/prisma';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { sendTicketReplyEmail } from '../../shared/mailer';
import crypto from 'crypto';

let isTableInitialized = false;

async function ensureTableExists() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
          CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED');
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "ticket_number" TEXT NOT NULL UNIQUE,
        "issue_type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
        "admin_reply" TEXT,
        "replied_by_admin_id" UUID,
        "replied_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    isTableInitialized = true;
  } catch (err) {
    console.error('ensureTableExists error:', err);
  }
}

export const supportService = {
  async submitTicket(userId: string, input: { issueType: string; description: string; subject?: string }) {
    await ensureTableExists();
    if (!input.description || !input.description.trim()) {
      throw new BadRequestError('Issue description is required');
    }

    const ticketNumber = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;

    const id = crypto.randomUUID();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "support_tickets" ("id", "user_id", "ticket_number", "issue_type", "description", "status", "created_at", "updated_at")
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, 'OPEN'::"TicketStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *;`,
      id,
      userId,
      ticketNumber,
      input.issueType || 'General',
      input.description.trim()
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true },
    });

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      ticketNumber: row.ticket_number,
      issueType: row.issue_type,
      description: row.description,
      status: row.status,
      adminReply: row.admin_reply,
      repliedAt: row.replied_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user,
    };
  },

  async getMyTickets(userId: string) {
    await ensureTableExists();
    try {
      if ((prisma as any).supportTicket?.findMany) {
        return await (prisma as any).supportTicket.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          include: {
            repliedByAdmin: {
              select: {
                fullName: true,
              },
            },
          },
        });
      }
    } catch (err) {
      console.warn('Prisma getMyTickets error, falling back to raw SQL:', err);
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        st.id,
        st.user_id as "userId",
        st.ticket_number as "ticketNumber",
        st.issue_type as "issueType",
        st.description,
        st.status,
        st.admin_reply as "adminReply",
        st.replied_by_admin_id as "repliedByAdminId",
        st.replied_at as "repliedAt",
        st.created_at as "createdAt",
        st.updated_at as "updatedAt",
        CASE WHEN admin_u.id IS NOT NULL THEN json_build_object('fullName', admin_u.full_name) ELSE NULL END as "repliedByAdmin"
      FROM "support_tickets" st
      LEFT JOIN "users" admin_u ON admin_u.id = st.replied_by_admin_id
      WHERE st.user_id = $1::uuid
      ORDER BY st.created_at DESC;`,
      userId
    );

    return rows;
  },

  async listAdminTickets(status?: string) {
    await ensureTableExists();
    const filter = status && status !== 'ALL' && status !== '?' ? status : null;

    try {
      if ((prisma as any).supportTicket?.findMany) {
        const where: any = {};
        if (filter) where.status = filter;
        return await (prisma as any).supportTicket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                profileImage: true,
              },
            },
            repliedByAdmin: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        });
      }
    } catch (err) {
      console.warn('Prisma listAdminTickets error, falling back to raw SQL:', err);
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        st.id,
        st.user_id as "userId",
        st.ticket_number as "ticketNumber",
        st.issue_type as "issueType",
        st.description,
        st.status,
        st.admin_reply as "adminReply",
        st.replied_by_admin_id as "repliedByAdminId",
        st.replied_at as "repliedAt",
        st.created_at as "createdAt",
        st.updated_at as "updatedAt",
        json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email, 'role', u.role, 'profileImage', u.profile_image) as "user",
        CASE WHEN admin_u.id IS NOT NULL THEN json_build_object('id', admin_u.id, 'fullName', admin_u.full_name) ELSE NULL END as "repliedByAdmin"
      FROM "support_tickets" st
      JOIN "users" u ON u.id = st.user_id
      LEFT JOIN "users" admin_u ON admin_u.id = st.replied_by_admin_id
      WHERE ($1::text IS NULL OR st.status::text = $1)
      ORDER BY st.created_at DESC;`,
      filter
    );

    return rows;
  },

  async getTicketById(ticketId: string) {
    await ensureTableExists();
    try {
      if ((prisma as any).supportTicket?.findUnique) {
        const ticket = await (prisma as any).supportTicket.findUnique({
          where: { id: ticketId },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                profileImage: true,
              },
            },
            repliedByAdmin: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        });
        if (ticket) return ticket;
      }
    } catch (err) {
      console.warn('Prisma getTicketById error, falling back to raw SQL:', err);
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        st.id,
        st.user_id as "userId",
        st.ticket_number as "ticketNumber",
        st.issue_type as "issueType",
        st.description,
        st.status,
        st.admin_reply as "adminReply",
        st.replied_by_admin_id as "repliedByAdminId",
        st.replied_at as "repliedAt",
        st.created_at as "createdAt",
        st.updated_at as "updatedAt",
        json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email, 'role', u.role, 'profileImage', u.profile_image) as "user",
        CASE WHEN admin_u.id IS NOT NULL THEN json_build_object('id', admin_u.id, 'fullName', admin_u.full_name) ELSE NULL END as "repliedByAdmin"
      FROM "support_tickets" st
      JOIN "users" u ON u.id = st.user_id
      LEFT JOIN "users" admin_u ON admin_u.id = st.replied_by_admin_id
      WHERE st.id = $1::uuid;`,
      ticketId
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundError('Support ticket not found');
    }

    return rows[0];
  },

  async replyTicket(adminUserId: string, ticketId: string, input: { reply: string; status?: string }) {
    await ensureTableExists();
    if (!input.reply || !input.reply.trim()) {
      throw new BadRequestError('Admin reply message is required');
    }

    let ticket: any = null;
    try {
      ticket = await this.getTicketById(ticketId);
    } catch {
      throw new NotFoundError('Support ticket not found');
    }

    const statusValue = input.status || 'RESOLVED';

    // Direct SQL update
    await prisma.$executeRawUnsafe(
      `UPDATE "support_tickets"
       SET 
         admin_reply = $1,
         replied_by_admin_id = $2::uuid,
         replied_at = NOW(),
         status = $3::"TicketStatus",
         updated_at = NOW()
       WHERE id = $4::uuid;`,
      input.reply.trim(),
      adminUserId,
      statusValue,
      ticketId
    );

    const updatedTicket = await this.getTicketById(ticketId);

    // 1. Send HTML Email to user's registered email
    let userEmail = ticket.user?.email;
    let userName = ticket.user?.fullName || 'User';

    if (!userEmail && typeof ticket.user === 'string') {
      try {
        const parsed = JSON.parse(ticket.user);
        userEmail = parsed.email;
        userName = parsed.fullName || userName;
      } catch {}
    }

    if (!userEmail && (ticket.userId || ticket.user_id)) {
      const u = await prisma.user.findUnique({
        where: { id: ticket.userId || ticket.user_id },
      });
      if (u) {
        userEmail = u.email;
        userName = u.fullName || userName;
      }
    }

    if (userEmail) {
      // Dispatch email in background non-blocking
      sendTicketReplyEmail({
        to: userEmail,
        userName,
        ticketNumber: ticket.ticketNumber || ticket.ticket_number,
        issueType: ticket.issueType || ticket.issue_type,
        userQuestion: ticket.description,
        adminAnswer: input.reply.trim(),
      }).catch((err) => {
        console.error('Background email dispatch failed:', err);
      });
    }

    // 2. Create In-App Notification (background)
    const targetUserId = ticket.userId || ticket.user?.id || ticket.user_id;
    if (targetUserId) {
      prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'SYSTEM',
          priority: 'HIGH',
          title: `Support Ticket #${ticket.ticketNumber || ticket.ticket_number} Resolved`,
          body: `An administrator has replied to your inquiry regarding ${ticket.issueType || ticket.issue_type}: "${input.reply.trim().slice(0, 100)}..."`,
          actionUrl: ticket.user?.role === 'RECRUITER' ? '/recruiter/help' : '/help',
        },
      }).catch((e) => {
        console.error('Failed to create in-app notification:', e);
      });
    }

    return updatedTicket;
  },
};
