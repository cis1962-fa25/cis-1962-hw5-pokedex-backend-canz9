import express from 'express';
import cors from 'cors';
import { connectRedis } from './redisClient';
import { pokemonRouter } from './routes/pokemon';
import { boxRouter } from './routes/box';
import * as auth from './auth'; 
import jwt from 'jsonwebtoken'; 

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());


const JWT_SECRET = process.env.JWT_TOKEN_SECRET ?? 'dev-secret';

// Auth
app.post('/token', (req, res) => {
    const { user } = req.body;

    if (!user || typeof user !== 'string') {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Missing or invalid "user" in request body',
        });
        return;
    }

    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
});

// Pokemon routes (no auth)
app.use('/pokemon', pokemonRouter);

// Box routes (auth required)
app.use('/box', auth.authMiddleware, boxRouter);

// Global error handler (simple version)
app.use(
    (
        err: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
    ) => {
        console.error(err);
        res.status(500).json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
        });
    },
);

async function start() {
    await connectRedis();
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
}

start().catch((err) => {
    console.error('Failed to start server', err);
});