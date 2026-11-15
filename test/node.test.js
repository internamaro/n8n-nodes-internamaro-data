// Tests run against the built files in dist/ (npm test builds first). HTTP is mocked.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { InternamaroData } = require('../dist/nodes/InternamaroData/InternamaroData.node.js');
const { operationMeta, actorProperties } = require('../dist/nodes/InternamaroData/actors.js');
const { buildActorInput, toList } = require('../dist/nodes/InternamaroData/input.js');

function context(params, { response = [{ ok: true }], fail = null, continueOnFail = false, items = 1 } = {}) {
	const calls = [];
	return {
		calls,
		ctx: {
			getInputData: () => Array.from({ length: items }, () => ({ json: {} })),
			getNodeParameter: (name, _i, fallback) => (name in params ? params[name] : fallback),
			getNode: () => ({ name: 'Internamaro Data', type: 'internamaroData', typeVersion: 1 }),
			continueOnFail: () => continueOnFail,
			helpers: {
				httpRequestWithAuthentication: async function (credName, opts) {
					calls.push({ credName, opts });
					if (fail) throw fail;
					return response;
				},
			},
		},
	};
}

test('one operation per chosen Actor, all under user ucchiii', () => {
	const ops = Object.keys(operationMeta).sort();
	assert.deepEqual(ops, [
		'bulkHttpRequest',
		'checkDomainAvailability',
		'excelToJson',
		'filterRows',
		'flattenJson',
		'htmlToMarkdown',
		'removeDuplicates',
	]);
	for (const m of Object.values(operationMeta)) assert.match(m.actorId, /^ucchiii~[a-z0-9-]+$/);
	const names = actorProperties.map((p) => p.name);
	assert.equal(new Set(names).size, names.length, 'parameter names are unique');
});

test('toList splits commas and new lines', () => {
	assert.deepEqual(toList('a.com, b.com\nc.com\n\n'), ['a.com', 'b.com', 'c.com']);
	assert.deepEqual(toList(['x', ' ']), ['x']);
});

test('buildActorInput maps fields, parses JSON and refuses empty sources', () => {
	const meta = operationMeta.bulkHttpRequest;
	const ok = buildActorInput(meta, {
		bulkHttpRequest_requests: '[{"url":"https://example.com"}]',
		bulkHttpRequest_urls: '',
		bulkHttpRequest_parseJson: false,
		bulkHttpRequest_timeoutSecs: 10,
	});
	assert.deepEqual(ok.input, { requests: [{ url: 'https://example.com' }], parseJson: false, timeoutSecs: 10 });
	assert.match(buildActorInput(meta, { bulkHttpRequest_requests: '[' }).error, /not valid JSON/);
	assert.match(buildActorInput(meta, { bulkHttpRequest_urls: ' ' }).error, /at least one of: requests, urls/);
});

test('execute calls run-sync-get-dataset-items with the credential and returns items', async () => {
	const node = new InternamaroData();
	const { ctx, calls } = context(
		{
			operation: 'checkDomainAvailability',
			checkDomainAvailability_domains: 'example.com\nfree-name-123.dev',
			checkDomainAvailabilityOptions: { checkDomainAvailability_details: true },
			maxTotalChargeUsd: 0.2,
		},
		{ response: [{ domain: 'example.com', available: false }, { domain: 'free-name-123.dev', available: true }] },
	);
	const [out] = await node.execute.call(ctx);
	assert.equal(out.length, 2);
	assert.equal(out[1].json.available, true);
	assert.deepEqual(out[0].pairedItem, { item: 0 });
	assert.equal(calls[0].credName, 'internamaroApifyApi');
	assert.equal(
		calls[0].opts.url,
		'https://api.apify.com/v2/acts/ucchiii~domain-availability-api/run-sync-get-dataset-items',
	);
	assert.equal(calls[0].opts.qs.maxTotalChargeUsd, 0.2);
	assert.deepEqual(calls[0].opts.body, { domains: ['example.com', 'free-name-123.dev'], details: true });
});

test('empty source: error without an HTTP call; continueOnFail returns the error as an item', async () => {
	const node = new InternamaroData();
	const a = context({ operation: 'htmlToMarkdown', htmlToMarkdown_urls: '' });
	await assert.rejects(() => node.execute.call(a.ctx), /at least one of/);
	assert.equal(a.calls.length, 0);
	const b = context({ operation: 'htmlToMarkdown', htmlToMarkdown_urls: '' }, { continueOnFail: true });
	const [out] = await node.execute.call(b.ctx);
	assert.match(out[0].json.error, /at least one of/);
});

test('API failure becomes a node error (or an error item with continueOnFail)', async () => {
	const node = new InternamaroData();
	const fail = Object.assign(new Error('Request failed with status code 401'), { httpCode: '401' });
	const a = context({ operation: 'excelToJson', excelToJson_fileUrl: 'https://x.test/a.xlsx' }, { fail });
	await assert.rejects(() => node.execute.call(a.ctx));
	const b = context(
		{ operation: 'excelToJson', excelToJson_fileUrl: 'https://x.test/a.xlsx' },
		{ fail, continueOnFail: true },
	);
	const [out] = await node.execute.call(b.ctx);
	assert.match(out[0].json.error, /401/);
});
