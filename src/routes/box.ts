import { Router } from 'express';
import { createId } from '@paralleldrive/cuid2';
import { redisClient } from '../redisClient';
import type { BoxEntry, InsertBoxEntry, UpdateBoxEntry } from '../types';
import { insertBoxEntrySchema, updateBoxEntrySchema } from '../validation';
import type { AuthedRequest } from '../auth';

export const boxRouter = Router();

function makeKey(user: string, id: string): string {
    return `${user}:pokedex:${id}`;
}

function requireUser(req: AuthedRequest, res: any): string | null {
    const user = req.user;
    if (!user) {
        res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid token',
        });
        return null;
    }
    return user;
}

function requireId(req: AuthedRequest, res: any): string | null {
    const id = req.params.id;
    if (!id) {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Missing Box entry id',
        });
        return null;
    }
    return id;
}

async function getEntryForUser(user: string, id: string): Promise<BoxEntry | null> {
    const key = makeKey(user, id);
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as BoxEntry;
}

/**
 * GET /box/ - list all Box entry IDs for authenticated user
 */
boxRouter.get('/', async (req: AuthedRequest, res) => {
    const user = requireUser(req, res);
    if (!user) return;

    const pattern = `${user}:pokedex:*`;
    const keys = await redisClient.keys(pattern);

    const ids = keys
        .map((key) => key.split(':').pop())
        .filter((x): x is string => Boolean(x));

    res.json(ids);
});

/**
 * POST /box/ - create a new Box entry
 */
boxRouter.post('/', async (req: AuthedRequest, res) => {
    const user = requireUser(req, res);
    if (!user) return;

    const parseResult = insertBoxEntrySchema.safeParse(req.body);
    if (!parseResult.success) {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Invalid Box entry data',
        });
        return;
    }

    const data = parseResult.data as InsertBoxEntry;
    const id = createId();

    const entry: BoxEntry = {
        id,
        ...data,
    };

    const key = makeKey(user, id);
    await redisClient.set(key, JSON.stringify(entry));

    res.status(201).json(entry);
});

/**
 * GET /box/:id - get a specific Box entry
 */
boxRouter.get('/:id', async (req: AuthedRequest, res) => {
    const user = requireUser(req, res);
    if (!user) return;

    const id = requireId(req, res);
    if (!id) return;

    const entry = await getEntryForUser(user, id);
    if (!entry) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Box entry not found',
        });
        return;
    }

    res.json(entry);
});

/**
 * PUT /box/:id - update a Box entry
 */
boxRouter.put('/:id', async (req: AuthedRequest, res) => {
    const user = requireUser(req, res);
    if (!user) return;

    const id = requireId(req, res);
    if (!id) return;

    const existing = await getEntryForUser(user, id);
    if (!existing) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Box entry not found',
        });
        return;
    }

    const parseResult = updateBoxEntrySchema.safeParse(req.body);
    if (!parseResult.success) {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Invalid Box entry update',
        });
        return;
    }

    const updates = parseResult.data as UpdateBoxEntry;
    const updated: BoxEntry = { ...existing, ...updates };

    const key = makeKey(user, id);
    await redisClient.set(key, JSON.stringify(updated));

    res.json(updated);
});

/**
 * DELETE /box/:id - delete a specific Box entry
 */
boxRouter.delete('/:id', async (req: AuthedRequest, res) => {
    const user = requireUser(req, res);
    if (!user) return;

    const id = requireId(req, res);
    if (!id) return;

    const existing = await getEntryForUser(user, id);
    if (!existing) {
        res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Box entry not found',
        });
        return;
    }

    const key = makeKey(user, id);
    await redisClient.del(key);

    res.status(204).send();
});

/**
 * DELETE /box/ - clear all Box entries for authenticated user
 */
boxRouter.delete('/', async (req: AuthedRequest, res) => {
    const user = requireUser(req, res);
    if (!user) return;

    const pattern = `${user}:pokedex:*`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
        await redisClient.del(keys);
    }

    res.status(204).send();
});