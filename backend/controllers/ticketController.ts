import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { SupportTicket, SupportMessage } from '../models/types';

export class TicketController {
  public static async getUserTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const tickets = db.supportTickets
        .filter(t => t.userId === user.id)
        .map(t => {
          const messages = db.supportMessages.filter(m => m.ticketId === t.id);
          return {
            ...t,
            messageCount: messages.length,
            lastMessage: messages.length > 0 ? messages[messages.length - 1].message : undefined,
          };
        });

      tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      res.json({ tickets });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch tickets.' });
    }
  }

  public static async getTicketById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { id } = req.params;
      const ticket = db.supportTickets.find(t => t.id === id);

      if (!ticket) {
        res.status(404).json({ error: 'Support ticket not found.' });
        return;
      }

      // Check if ticket belongs to user or if user is admin
      if (ticket.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER ADMIN') {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }

      const messages = db.supportMessages.filter(m => m.ticketId === ticket.id);
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      res.json({ ticket: { ...ticket, messages } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load ticket.' });
    }
  }

  public static async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { subject, category, message, priority } = req.body;
      if (!subject || !message) {
        res.status(400).json({ error: 'Subject and message are required.' });
        return;
      }

      const ticketId = `TCK-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      const newTicket: SupportTicket = {
        id: ticketId,
        userId: user.id,
        username: user.username,
        subject: subject.trim(),
        category: category || 'General',
        priority: priority || 'Medium',
        status: 'OPEN',
        createdAt: now,
        updatedAt: now,
      };

      const initialMessage: SupportMessage = {
        id: `MSG-${Date.now()}`,
        ticketId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.username,
        message: message.trim(),
        createdAt: now,
      };

      db.supportTickets.unshift(newTicket);
      db.supportMessages.push(initialMessage);
      db.logActivity(user.id, user.username, 'TICKET_CREATE', `Opened ticket ${ticketId}: ${subject}`);
      db.save();

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully.',
        ticket: { ...newTicket, messages: [initialMessage] },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create ticket.' });
    }
  }

  public static async replyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { id } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Reply message cannot be empty.' });
        return;
      }

      const ticket = db.supportTickets.find(t => t.id === id);
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found.' });
        return;
      }

      if (ticket.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER ADMIN') {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }

      const now = new Date().toISOString();
      const newMsg: SupportMessage = {
        id: `MSG-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        ticketId: ticket.id,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.role === 'ADMIN' ? 'Nexa Support' : user.username,
        message: message.trim(),
        createdAt: now,
      };

      db.supportMessages.push(newMsg);
      ticket.updatedAt = now;
      if (user.role === 'ADMIN' || user.role === 'SUPER ADMIN') {
        ticket.status = 'PENDING'; // Awaiting user response
      } else {
        ticket.status = 'OPEN';
      }
      db.save();

      res.json({
        success: true,
        message: newMsg,
        ticketStatus: ticket.status,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to post reply.' });
    }
  }

  public static async closeTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { id } = req.params;
      const ticket = db.supportTickets.find(t => t.id === id);
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found.' });
        return;
      }

      if (ticket.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER ADMIN') {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }

      ticket.status = 'CLOSED';
      ticket.updatedAt = new Date().toISOString();
      db.save();

      res.json({ success: true, message: 'Ticket marked as closed.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to close ticket.' });
    }
  }
}
