import * as assert from 'assert';
import { substituteVariables, substituteVariablesInRequest } from '../extension/utils/variableSubstitution';

suite('Variable Substitution Test Suite', () => {

	suite('substituteVariables', () => {
		test('substitutes single variable', () => {
			const result = substituteVariables('Hello {{name}}!', { name: 'World' });
			assert.strictEqual(result, 'Hello World!');
		});

		test('substitutes multiple variables', () => {
			const result = substituteVariables('{{greeting}} {{name}}!', { greeting: 'Hello', name: 'World' });
			assert.strictEqual(result, 'Hello World!');
		});

		test('leaves unmatched placeholders as-is', () => {
			const result = substituteVariables('Hello {{name}}!', {});
			assert.strictEqual(result, 'Hello {{name}}!');
		});
	});

	suite('substituteVariablesInRequest - raw body', () => {
		test('substitutes variables in raw body value', () => {
			const request = {
				url: 'https://api.example.com',
				body: {
					mode: 'raw',
					rawType: 'json',
					value: '{"token": "{{authToken}}"}'
				}
			};
			const result = substituteVariablesInRequest(request, { authToken: 'secret123' });
			assert.strictEqual(result.body.value, '{"token": "secret123"}');
		});
	});

	suite('substituteVariablesInRequest - form-data body', () => {
		test('substitutes variables in form-data keys and values', () => {
			const request = {
				url: 'https://api.example.com',
				body: {
					mode: 'form-data',
					rows: [
						{ id: '1', key: '{{keyVar}}', type: 'text', value: '{{valueVar}}', active: true },
						{ id: '2', key: 'static', type: 'text', value: 'staticValue', active: true }
					]
				}
			};
			const result = substituteVariablesInRequest(request, { keyVar: 'username', valueVar: 'john' });
			assert.strictEqual(result.body.rows[0].key, 'username');
			assert.strictEqual(result.body.rows[0].value, 'john');
			assert.strictEqual(result.body.rows[1].key, 'static');
			assert.strictEqual(result.body.rows[1].value, 'staticValue');
		});

		test('does not substitute in inactive form-data rows', () => {
			const request = {
				url: 'https://api.example.com',
				body: {
					mode: 'form-data',
					rows: [
						{ id: '1', key: '{{keyVar}}', type: 'text', value: '{{valueVar}}', active: false }
					]
				}
			};
			const result = substituteVariablesInRequest(request, { keyVar: 'username', valueVar: 'john' });
			assert.strictEqual(result.body.rows[0].key, '{{keyVar}}');
			assert.strictEqual(result.body.rows[0].value, '{{valueVar}}');
		});

		test('does not substitute in file type form-data values', () => {
			const request = {
				url: 'https://api.example.com',
				body: {
					mode: 'form-data',
					rows: [
						{ id: '1', key: 'file', type: 'file', value: '{{path}}', active: true }
					]
				}
			};
			const result = substituteVariablesInRequest(request, { path: '/some/path' });
			assert.strictEqual(result.body.rows[0].value, '{{path}}');
		});
	});

	suite('substituteVariablesInRequest - x-www-form-urlencoded body', () => {
		test('substitutes variables in urlencoded keys and values', () => {
			const request = {
				url: 'https://api.example.com',
				body: {
					mode: 'x-www-form-urlencoded',
					rows: [
						{ id: '1', key: '{{keyVar}}', value: '{{valueVar}}', active: true },
						{ id: '2', key: 'grant_type', value: 'password', active: true }
					]
				}
			};
			const result = substituteVariablesInRequest(request, { keyVar: 'username', valueVar: 'john' });
			assert.strictEqual(result.body.rows[0].key, 'username');
			assert.strictEqual(result.body.rows[0].value, 'john');
			assert.strictEqual(result.body.rows[1].key, 'grant_type');
			assert.strictEqual(result.body.rows[1].value, 'password');
		});

		test('does not substitute in inactive urlencoded rows', () => {
			const request = {
				url: 'https://api.example.com',
				body: {
					mode: 'x-www-form-urlencoded',
					rows: [
						{ id: '1', key: '{{keyVar}}', value: '{{valueVar}}', active: false }
					]
				}
			};
			const result = substituteVariablesInRequest(request, { keyVar: 'username', valueVar: 'john' });
			assert.strictEqual(result.body.rows[0].key, '{{keyVar}}');
			assert.strictEqual(result.body.rows[0].value, '{{valueVar}}');
		});
	});
});
