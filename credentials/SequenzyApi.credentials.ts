import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

import { getSequenzyApiBaseUrl } from "../nodes/shared/SequenzyApiBaseUrl";

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
      baseURL: getSequenzyApiBaseUrl(),
      url: "/subscribers/me",
      method: "GET",
    },
  };
}
