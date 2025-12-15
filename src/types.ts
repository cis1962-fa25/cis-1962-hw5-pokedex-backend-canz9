export type PokemonType = {
    name: string;  // uppercase (e.g. "FIRE")
    color: string; // hex color
};

export type PokemonMove = {
    name: string;
    power?: number; // undefined if power is 0 or null
    type: PokemonType;
};

export type Pokemon = {
    id: number;
    name: string;
    description: string;
    types: PokemonType[];
    moves: PokemonMove[];
    sprites: {
        front_default: string;
        back_default: string;
        front_shiny: string;
        back_shiny: string;
    };
    stats: {
        hp: number;
        speed: number;
        attack: number;
        defense: number;
        specialAttack: number;
        specialDefense: number;
    };
};

export type BoxEntry = {
    id: string;
    createdAt: string;
    level: number;
    location: string;
    notes?: string;
    pokemonId: number;
};

export type InsertBoxEntry = Omit<BoxEntry, 'id'>;

export type UpdateBoxEntry = Partial<InsertBoxEntry>;

// For auth
export type JwtPayloadUser = {
    user: string; // pennkey
};