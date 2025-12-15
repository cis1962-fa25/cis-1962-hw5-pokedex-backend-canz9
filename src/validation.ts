import { z } from 'zod';
import type { InsertBoxEntry, UpdateBoxEntry } from './types';

export const insertBoxEntrySchema = z.object({
    createdAt: z.string().datetime(), // ISO 8601
    level: z.number().int().min(1).max(100),
    location: z.string().min(1),
    notes: z.string().optional(),
    pokemonId: z.number().int().positive(),
});

export const updateBoxEntrySchema = insertBoxEntrySchema.partial();

export type InsertBoxEntryInput = z.infer<typeof insertBoxEntrySchema>;
export type UpdateBoxEntryInput = z.infer<typeof updateBoxEntrySchema>;

// Pokemon list query
export const pokemonListQuerySchema = z.object({
    limit: z
        .string()
        .transform((v) => Number(v))
        .pipe(z.number().int().positive()),
    offset: z
        .string()
        .transform((v) => Number(v))
        .pipe(z.number().int().min(0)),
});