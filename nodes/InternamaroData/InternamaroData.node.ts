import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { actorProperties, operationMeta } from './actors';
import { buildActorInput, runUrl } from './input';

export class InternamaroData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Internamaro Data',
		name: 'internamaroData',
		icon: { light: 'file:../../icons/internamaro.svg', dark: 'file:../../icons/internamaro.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Convert, clean and check data with Apify Actors by ucchiii, billed to your own Apify account',
		defaults: {
			name: 'Internamaro Data',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'internamaroApifyApi',
				required: true,
			},
		],
		properties: [
			...actorProperties,
			{
				displayName: 'Max Total Charge (USD)',
				name: 'maxTotalChargeUsd',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 0.01, numberPrecision: 2 },
				description:
					'Upper limit for what one Actor run may charge your Apify account. The run stops when it is reached.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const meta = operationMeta[operation];
			let problem: string | undefined;
			let input: IDataObject = {};
			if (!meta) {
				problem = `Unknown operation: ${operation}`;
			} else {
				const params: Record<string, unknown> = {};
				for (const name of meta.main) params[name] = this.getNodeParameter(name, i, '');
				Object.assign(params, this.getNodeParameter(meta.optionsName, i, {}) as IDataObject);
				const built = buildActorInput(meta, params);
				if (built.error !== undefined) problem = built.error;
				else input = built.input;
			}
			if (problem !== undefined || !meta) {
				const message = problem ?? 'Unknown operation';
				if (this.continueOnFail()) {
					out.push({ json: { error: message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), message, { itemIndex: i });
			}

			const maxTotalChargeUsd = this.getNodeParameter('maxTotalChargeUsd', i, 1) as number;
			let response: unknown;
			try {
				response = await this.helpers.httpRequestWithAuthentication.call(this, 'internamaroApifyApi', {
					method: 'POST',
					url: runUrl(meta.actorId),
					qs: { format: 'json', clean: true, maxTotalChargeUsd },
					body: input,
					json: true,
					timeout: 310000,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
			const rows = Array.isArray(response) ? response : [response];
			for (const row of rows) {
				out.push({ json: (row ?? {}) as IDataObject, pairedItem: { item: i } });
			}
		}
		return [out];
	}
}
