# n8n-nodes-internamaro-data

An [n8n](https://n8n.io/) community node for data post-processing with Apify Actors published
by [ucchiii](https://apify.com/ucchiii). One node, seven operations:

| Operation | Returns | Apify Actor |
| --- | --- | --- |
| Convert HTML to markdown text | One item per page or HTML string: url, title, markdown, counts, status | [ucchiii/html-to-markdown](https://apify.com/ucchiii/html-to-markdown) |
| Send bulk HTTP requests | One item per request: status, headers, JSON or text body, timing, error | [ucchiii/bulk-http-request](https://apify.com/ucchiii/bulk-http-request) |
| Flatten JSON items | One flat item per input item (`address.city` style keys) | [ucchiii/flatten-json](https://apify.com/ucchiii/flatten-json) |
| Filter rows by conditions | Matching rows of a CSV/TSV/JSON/NDJSON file or an Apify dataset | [ucchiii/filter-rows](https://apify.com/ucchiii/filter-rows) |
| Remove duplicate rows | Merged Apify datasets without duplicates | [ucchiii/dataset-dedup-merge](https://apify.com/ucchiii/dataset-dedup-merge) |
| Convert a spreadsheet to JSON | One item per Excel row (or a link to an .xlsx made from JSON) | [ucchiii/excel-to-json](https://apify.com/ucchiii/excel-to-json) |
| Check domain availability | One item per domain: available true/false/null, status, TLD | [ucchiii/domain-availability-api](https://apify.com/ucchiii/domain-availability-api) |

Every dataset item of the Actor run becomes one n8n output item.

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
and install `n8n-nodes-internamaro-data`.

## Credentials

Create an **Internamaro Data (Apify Token) API** credential and paste your own Apify API token
(Apify Console > Settings > API & Integrations). The credential test calls
`GET https://api.apify.com/v2/users/me`.

## Pricing

- The node is free and open source (MIT).
- Each execution starts one Actor run on the Apify account of the token. That account pays the
  Actor's **pay-per-event** price shown on its Apify Store page.
- **Max Total Charge (USD)** (default 1) caps what one run may charge (Apify `maxTotalChargeUsd`).
- An operation with no data (for example no URLs) fails before any run is started.

## Usage

1. Add the **Internamaro Data** node and pick an operation.
2. Fill in the main field (list fields take values separated by commas or new lines; JSON
   fields take a JSON array or object). More settings are under **Options**.
3. Run. The node calls `POST /v2/acts/ucchiii~<actor>/run-sync-get-dataset-items` and waits up to
   300 seconds; for bigger jobs split the input.

Example: *Check domain availability* with `example.com, my-new-shop-name.dev` returns two items
with `available: false` and `available: true`.

The node can also be used as a tool by n8n AI agents (`usableAsTool`).

## Compatibility

Built with `@n8n/node-cli` 0.56 and tested against `n8n-workflow` 2.x.

## Development

```bash
npm ci
npm run lint
npm test    # builds, then runs tests with a mocked HTTP helper
npm run dev # local n8n with the node loaded
```

## Support

Open a GitHub issue or write to support@internamaro.com.

## License

MIT
