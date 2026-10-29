import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

import { SEQUENZY_PRODUCTION_API_BASE_URL } from "../nodes/shared/SequenzyApiBaseUrl";

export class SequenzyApi implements ICredentialType {
  name = "sequenzyApi";
  displayName = "Sequenzy API";
  documentationUrl = "https://docs.sequenzy.com/api-reference";
  icon = {
    light: "file:../nodes/Sequenzy/sequenzy.svg",
    dark: "file:../nodes/Sequenzy/sequenzy.svg",
  } as const;

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
        'Find your workspace API key in the <a href="https://sequenzy.com/dashboard" target="_blank">Sequenzy dashboard</a>. After you sign in, go to Settings &gt; API Keys. New keys start with "seq_live_"; legacy "ek_" keys remain supported.',
    },
    {
      displayName: "API Base URL",
      name: "baseUrl",
      type: "string",
      default: SEQUENZY_PRODUCTION_API_BASE_URL,
      description:
        "Leave the default. Change it only to test the node against a local Sequenzy API, such as http://127.0.0.1:4000/api/v1.",
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
      baseURL: `={{$credentials.baseUrl || "${SEQUENZY_PRODUCTION_API_BASE_URL}"}}`,
      url: "/subscribers/me",
      method: "GET",
    },
  };
}
