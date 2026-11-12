import 'dotenv/config';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import rateLimit from 'express-rate-limit';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import { requireAuth } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = 3000;

app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 20,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const toNumber = (value, fieldName = 'value') => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return number;
};

const formatDate = (date) => new Date(date).toISOString().slice(0, 10);

const getNextRecurringDate = (currentDate, frequency, dayOfMonth) => {
  const start = new Date(`${currentDate}T00:00:00`);
  const monthDay = Number(dayOfMonth ?? start.getDate());

  if (frequency === 'daily') {
    const next = new Date(start);
    next.setDate(start.getDate() + 1);
    return formatDate(next);
  }

  if (frequency === 'weekly') {
    const next = new Date(start);
    next.setDate(start.getDate() + 7);
    return formatDate(next);
  }

  if (frequency === 'monthly') {
    const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(monthDay, maxDay));
    return formatDate(next);
  }

  if (frequency === 'yearly') {
    const next = new Date(start);
    next.setFullYear(start.getFullYear() + 1);
    return formatDate(next);
  }

  return currentDate;
};

const getMonthRange = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    end: `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`,
  };
};

// Auth routes (public)
app.use('/api/auth', authLimiter, createAuthRouter(prisma));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'expense-tracker-api' });
});

app.get('/api/dashboard/summary', requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
    });

    const totalIncome = transactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalExpenses = transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const monthRange = getMonthRange();
    const monthlyTransactions = transactions.filter(
      (transaction) => transaction.date >= monthRange.start && transaction.date <= monthRange.end,
    );

    const monthlyIncome = monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const monthlyExpenses = monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const categoryTotals = monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
        return acc;
      }, {});

    const biggestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] ?? null;

    const savingsGoals = await prisma.savingsGoal.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
    const savingsSummary = savingsGoals.map((goal) => ({
      ...goal,
      progressPercent: goal.targetAmount > 0 ? Math.min((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100, 100) : 0,
      remaining: Math.max(Number(goal.targetAmount) - Number(goal.currentAmount), 0),
    }));

    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: { userId: req.userId, isActive: true },
      orderBy: { nextDate: 'asc' },
    });

    res.json({
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses,
      biggestCategory: biggestCategory ? { category: biggestCategory[0], amount: biggestCategory[1] } : null,
      savingsGoals: savingsSummary,
      recurringTransactions,
      recentTransactions: transactions.slice(0, 5),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// GET /api/transactions
app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions
app.post('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { description, amount, type, category, date } = req.body;
    if (!description || !amount || !type || !category || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const parsedAmount = toNumber(amount, 'amount');
    const transaction = await prisma.transaction.create({
      data: {
        description: String(description).trim(),
        amount: parsedAmount,
        type: String(type).toLowerCase(),
        category: String(category).trim(),
        date: String(date),
        userId: req.userId,
      },
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create transaction' });
  }
});

// PATCH /api/transactions/:id
app.patch('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid transaction ID' });

    const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    const { description, amount, type, category, date } = req.body;
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(description !== undefined && { description: String(description).trim() }),
        ...(amount !== undefined && { amount: toNumber(amount, 'amount') }),
        ...(type !== undefined && { type: String(type).toLowerCase() }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(date !== undefined && { date: String(date) }),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid transaction ID' });

    const transaction = await prisma.transaction.findFirst({ where: { id, userId: req.userId } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// GET /api/budgets
app.get('/api/budgets', requireAuth, async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({ where: { userId: req.userId } });
    res.json(budgets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST /api/budgets — create or update
app.post('/api/budgets', requireAuth, async (req, res) => {
  try {
    const { category, amount } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'Category and amount required' });

    const parsedAmount = toNumber(amount, 'amount');
    const budget = await prisma.budget.upsert({
      where: { userId_category: { userId: req.userId, category: String(category).trim() } },
      update: { amount: parsedAmount },
      create: { category: String(category).trim(), amount: parsedAmount, userId: req.userId },
    });
    res.status(201).json(budget);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to save budget' });
  }
});

// DELETE /api/budgets/:id
app.delete('/api/budgets/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid budget ID' });

    const budget = await prisma.budget.findFirst({ where: { id, userId: req.userId } });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    await prisma.budget.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

app.get('/api/savings-goals', requireAuth, async (req, res) => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch {
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

app.post('/api/savings-goals', requireAuth, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, category, targetDate, notes } = req.body;

    if (!name || !targetAmount) {
      return res.status(400).json({ error: 'Name and target amount are required' });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.userId,
        name: String(name).trim(),
        targetAmount: toNumber(targetAmount, 'targetAmount'),
        currentAmount: currentAmount !== undefined ? toNumber(currentAmount, 'currentAmount') : 0,
        category: category ? String(category).trim() : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create savings goal' });
  }
});

app.patch('/api/savings-goals/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid savings goal ID' });

    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Savings goal not found' });

    const { name, targetAmount, currentAmount, category, targetDate, notes } = req.body;
    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(targetAmount !== undefined && { targetAmount: toNumber(targetAmount, 'targetAmount') }),
        ...(currentAmount !== undefined && { currentAmount: toNumber(currentAmount, 'currentAmount') }),
        ...(category !== undefined && { category: category ? String(category).trim() : null }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update savings goal' });
  }
});

app.delete('/api/savings-goals/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid savings goal ID' });

    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Savings goal not found' });

    await prisma.savingsGoal.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
});

app.get('/api/recurring-transactions', requireAuth, async (req, res) => {
  try {
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { nextDate: 'asc' },
    });
    res.json(recurring);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recurring transactions' });
  }
});

app.post('/api/recurring-transactions', requireAuth, async (req, res) => {
  try {
    const { description, amount, type, category, frequency, dayOfMonth, nextDate } = req.body;
    if (!description || !amount || !type || !category || !frequency) {
      return res.status(400).json({ error: 'Description, amount, type, category, and frequency are required' });
    }

    const parsedAmount = toNumber(amount, 'amount');
    const next = nextDate || new Date().toISOString().slice(0, 10);
    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: req.userId,
        description: String(description).trim(),
        amount: parsedAmount,
        type: String(type).toLowerCase(),
        category: String(category).trim(),
        frequency: String(frequency).toLowerCase(),
        dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : null,
        nextDate: String(next),
        isActive: true,
      },
    });

    res.status(201).json(recurring);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create recurring transaction' });
  }
});

app.patch('/api/recurring-transactions/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recurring transaction ID' });

    const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

    const { description, amount, type, category, frequency, dayOfMonth, nextDate, isActive } = req.body;
    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(description !== undefined && { description: String(description).trim() }),
        ...(amount !== undefined && { amount: toNumber(amount, 'amount') }),
        ...(type !== undefined && { type: String(type).toLowerCase() }),
        ...(category !== undefined && { category: String(category).trim() }),
        ...(frequency !== undefined && { frequency: String(frequency).toLowerCase() }),
        ...(dayOfMonth !== undefined && { dayOfMonth: Number(dayOfMonth) }),
        ...(nextDate !== undefined && { nextDate: String(nextDate) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update recurring transaction' });
  }
});

app.delete('/api/recurring-transactions/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recurring transaction ID' });

    const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

    await prisma.recurringTransaction.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete recurring transaction' });
  }
});

app.post('/api/recurring-transactions/:id/process', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recurring transaction ID' });

    const recurring = await prisma.recurringTransaction.findFirst({ where: { id, userId: req.userId } });
    if (!recurring) return res.status(404).json({ error: 'Recurring transaction not found' });

    if (!recurring.isActive) {
      return res.status(400).json({ error: 'Recurring transaction is inactive' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId,
        description: recurring.description,
        amount: recurring.amount,
        type: recurring.type,
        category: recurring.category,
        date: recurring.nextDate,
      },
    });

    const updatedRecurring = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        lastGeneratedAt: new Date(),
        nextDate: getNextRecurringDate(recurring.nextDate, recurring.frequency, recurring.dayOfMonth),
      },
    });

    res.status(201).json({ transaction, recurring: updatedRecurring });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process recurring transaction' });
  }
});

app.post('/api/recurring-transactions/process-due', requireAuth, async (req, res) => {
  try {
    const dueRecurring = await prisma.recurringTransaction.findMany({
      where: { userId: req.userId, isActive: true, nextDate: { lte: new Date().toISOString().slice(0, 10) } },
    });

    const results = [];
    for (const recurring of dueRecurring) {
      const transaction = await prisma.transaction.create({
        data: {
          userId: req.userId,
          description: recurring.description,
          amount: recurring.amount,
          type: recurring.type,
          category: recurring.category,
          date: recurring.nextDate,
        },
      });

      const updatedRecurring = await prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: {
          lastGeneratedAt: new Date(),
          nextDate: getNextRecurringDate(recurring.nextDate, recurring.frequency, recurring.dayOfMonth),
        },
      });

      results.push({ transaction, recurring: updatedRecurring });
    }

    res.json({ processed: results.length, items: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process due recurring transactions' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
