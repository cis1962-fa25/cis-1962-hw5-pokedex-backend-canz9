import { Router } from 'express';
import Pokedex from 'pokedex-promise-v2';
import type { Pokemon, PokemonMove, PokemonType } from '../types';
import { pokemonListQuerySchema } from '../validation';

const P = new Pokedex();
export const pokemonRouter = Router();

/**
 * Helper: map PokeAPI types to our PokemonType
 */
function makePokemonType(apiType: any): PokemonType {
    const name = (apiType.type?.name ?? '').toUpperCase();
    const color = '#AAAAAA';
    return { name, color };
}

/**
 * Helper: build a full Pokemon object by name using multiple API calls
 */
async function getPokemonByNameFull(name: string): Promise<Pokemon> {
    const [pokemonData, speciesData] = await Promise.all([
        P.getPokemonByName(name),
        P.getPokemonSpeciesByName(name),
    ]);

    const flavor = speciesData.flavor_text_entries.find(
        (entry: any) => entry.language.name === 'en',
    );
    const description: string = flavor
        ? flavor.flavor_text.replace(/\n/g, ' ')
        : '';

    // Types
    const types: PokemonType[] = pokemonData.types.map((t: any) =>
        makePokemonType(t),
    );

    // Stats
    const statsMap: Record<string, number> = {};
    for (const stat of pokemonData.stats) {
        statsMap[stat.stat.name] = stat.base_stat;
    }

    const moveRefs = pokemonData.moves.slice(0, 10); // e.g., first 10
    const moveNames = moveRefs.map((m: any) => m.move.name);

    const moveDetails = await Promise.all(
        moveNames.map((mn: string) => P.getMoveByName(mn)),
    );

    const moves: PokemonMove[] = moveDetails.map((m: any) => {
        const type: PokemonType = {
            name: (m.type.name ?? '').toUpperCase(),
            color: '#AAAAAA',
        };

        const power =
            typeof m.power === 'number' && m.power > 0 ? m.power : undefined;

        // English name if available
        const englishNameEntry = m.names.find(
            (n: any) => n.language.name === 'en',
        );
        const name = englishNameEntry?.name ?? m.name;

        return {
            name,
            power,
            type,
        };
    });

    const pokemon: Pokemon = {
        id: pokemonData.id,
        name: speciesData.names.find((n: any) => n.language.name === 'en')
            ?.name ?? pokemonData.name,
        description,
        types,
        moves,
        sprites: {
            front_default: pokemonData.sprites.front_default ?? "",
            back_default: pokemonData.sprites.back_default ?? "",
            front_shiny: pokemonData.sprites.front_shiny ?? "",
            back_shiny: pokemonData.sprites.back_shiny ?? "",
        },

        stats: {
            hp: statsMap.hp ?? 0,
            speed: statsMap.speed ?? 0,
            attack: statsMap.attack ?? 0,
            defense: statsMap.defense ?? 0,
            specialAttack: statsMap['special-attack'] ?? 0,
            specialDefense: statsMap['special-defense'] ?? 0,
        },
    };

    return pokemon;
}

/**
 * GET /pokemon/ - list pokemon with pagination
 */
pokemonRouter.get('/', async (req, res) => {
    const parseResult = pokemonListQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Invalid limit or offset',
        });
        return;
    }

    const { limit, offset } = parseResult.data;

    const list = await P.getPokemonsList({ limit, offset });
    const results = list.results ?? [];

    const pokemons = await Promise.all(
        results.map((r: any) => getPokemonByNameFull(r.name)),
    );

    res.json(pokemons);
});

/**
 * GET /pokemon/:name - get pokemon by name
 */
pokemonRouter.get('/:name', async (req, res) => {
    const { name } = req.params;
    if (!name) {
        res.status(400).json({
            code: 'BAD_REQUEST',
            message: 'Missing name',
        });
        return;
    }

    try {
        const pokemon = await getPokemonByNameFull(name);
        res.json(pokemon);
    } catch (err: any) {
        // Pokedex-promise-v2 throws when not found
        res.status(404).json({
            code: 'NOT_FOUND',
            message: 'Pokemon not found',
        });
    }
});