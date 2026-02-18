import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class SequenzyApi implements ICredentialType {
  name = "sequenzyApi";
  displayName = "Sequenzy API";
  documentationUrl = "https://docs.sequenzy.com/api-reference";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      required: true,
      description:
        'Find your API key in <a href="https://app.sequenzy.com/settings/api" target="_blank">Sequenzy Settings > API Keys</a>. It starts with "ek_".',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "=Bearer {{$credentials.apiKey}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://api.sequenzy.com/api/v1",
      url: "/subscribers/me",
      method: "GET",
    },
  };
}
