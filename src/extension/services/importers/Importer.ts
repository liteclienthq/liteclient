import { Collection } from '../collectionService';

export interface Importer {
    id: string;
    name: string;
    description: string;

    /**
     * Can this importer handle the given content?
     * @param content File content as string/json
     */
    canImport(content: unknown): boolean;

    /**
     * Import content into Canonical Collection format
     * @param content File content
     */
    import(content: unknown): Promise<Collection[]>;
}
