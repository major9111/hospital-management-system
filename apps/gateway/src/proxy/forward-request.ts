import axios from 'axios';
import { InternalClaims, InternalTokenService } from './internal-token.service';

export async function forwardRequest(
  internalTokenService: InternalTokenService,
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  claims: InternalClaims,
  body?: unknown,
) {
  const internalToken = internalTokenService.sign(claims);

  const response = await axios.request({
    url: `${baseUrl}${path}`,
    method,
    data: body,
    headers: {
      'x-internal-token': internalToken,
    },
    timeout: 5000, // fail fast — don't let a stuck downstream service hang the gateway
    validateStatus: () => true, // pass through the downstream status code as-is
  });

  return { status: response.status, data: response.data };
}
