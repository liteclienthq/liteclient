import { Collection } from '../collectionService';

export interface Exporter {
    id: string;
    name: string;
    description: string;

    /**
     * Export a collection to string format
     * @param collection The collection to export
     */
    export(collection: Collection): Promise<string>;
}
