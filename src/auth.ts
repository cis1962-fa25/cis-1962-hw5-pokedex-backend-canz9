import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayloadUser } from './types';

const JWT_SECRET = process.env.JWT_TOKEN_SECRET ?? 'dev-secret';

// POST /token
export function tokenHandler(req: Request, res: Response): void {
    const { user } = req.body;

    if (!user || typeof user !== 'string') {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Missing or invalid "user" in request body',
        });
        return;
    }

    const payload: JwtPayloadUser = { user };
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '1h',
    });

    res.status(201).json({ token });
}
export interface AuthedRequest extends Request {
    user?: string; // pennkey
}

export function authMiddleware(
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
): void {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Missing Authorization header',
        });
        return;
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Invalid Authorization header format',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadUser;
        if (!decoded.user) {
            throw new Error('Missing user in token');
        }
        req.user = decoded.user;
        next();
    } catch {
        res.status(401).json({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
        });
    }
}