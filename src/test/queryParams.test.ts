/// <reference types="mocha" />

import * as assert from 'assert';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { HttpRequestService } from '../extension/services/httpRequestService';
import { serializeQueryParams } from '../shared/queryParams';

suite('Query parameter serialization', () => {
    test('preserves dollar-prefixed keys and encodes values normally', () => {
        assert.strictEqual(
            serializeQueryParams([
                { key: '$filter', value: "name eq 'value'", active: true },
                { key: '$expand', value: 'details', active: true },
                { key: 'ignored', value: 'value', active: false },
            ]),
            '$filter=name+eq+%27value%27&$expand=details'
        );
    });

    test('does not preserve dollar signs from query values', () => {
        assert.strictEqual(
            serializeQueryParams([{ key: '$filter', value: '$expand', active: true }]),
            '$filter=%24expand'
        );
    });

    test('sends a literal dollar-prefixed query key over HTTP', async () => {
        let receivedUrl: string | undefined;
        const server = createServer((request, response) => {
            receivedUrl = request.url;
            response.end('ok');
        });

        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

        try {
            const { port } = server.address() as AddressInfo;
            const query = serializeQueryParams([
                { key: '$filter', value: "name eq 'value'", active: true },
            ]);
            const result = await HttpRequestService.sendRequest({
                method: 'GET',
                url: `http://127.0.0.1:${port}/items?${query}`,
            });

            assert.strictEqual(result.isError, false);
            assert.strictEqual(receivedUrl, "/items?$filter=name+eq+%27value%27");
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve());
            });
        }
    });
});
