import express from 'express';
import cors from 'cors';
import { connectRedis } from './redisClient';
import { pokemonRouter } from './routes/pokemon';
import { boxRouter } from './routes/box';
import { authMiddleware, tokenHandler } from './auth';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// Health check (optional)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Auth
app.post('/token', tokenHandler);

// Pokemon routes (no auth)
app.use('/pokemon', pokemonRouter);

// Box routes (auth required)
app.use('/box', authMiddleware, boxRouter);

// Global error handler (simple version)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
    });
});

async function start() {
    await connectRedis();
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}

start().catch((err) => {
    console.error('Failed to start server', err);
});