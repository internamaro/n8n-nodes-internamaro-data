import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InternamaroApifyApi implements ICredentialType {
	name = 'internamaroApifyApi';

	displayName = 'Internamaro Data (Apify Token) API';

	icon: Icon = { light: 'file:../icons/internamaro.svg', dark: 'file:../icons/internamaro.dark.svg' };

	documentationUrl = 'https://docs.apify.com/platform/integrations/api#api-token';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Your own Apify API token from Apify Console > Settings > API & Integrations. Actor runs are billed to this Apify account.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.apify.com',
			url: '/v2/users/me',
			method: 'GET',
		},
	};
}
