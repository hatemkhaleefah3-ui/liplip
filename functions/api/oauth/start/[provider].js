import { createOAuthState } from '../../../_lib/social.js';
import { error } from '../../../_lib/http.js';

const PUBLIC_ORIGIN = 'https://liplip.pages.dev';

export async function onRequestGet(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const provider = String(context.params?.provider || '').toLowerCase();
  const redirectUri = `${PUBLIC_ORIGIN}/api/oauth/callback/${provider}`;

  let clientId = '';
  let authUrl = '';
  if (provider === 'google') {
    clientId = String(context.env.GOOGLE_CLIENT_ID || '');
    if (!clientId || !context.env.GOOGLE_CLIENT_SECRET) return error(503, 'google_unconfigured', 'Google sign-in is not configured.');
    authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  } else if (provider === 'facebook') {
    clientId = String(context.env.FACEBOOK_APP_ID || '');
    if (!clientId || !context.env.FACEBOOK_APP_SECRET) return error(503, 'facebook_unconfigured', 'Facebook sign-in is not configured.');
    authUrl = 'https://www.facebook.com/dialog/oauth';
  } else {
    return error(404, 'provider_not_supported', 'Unsupported OAuth provider.');
  }

  const oauth = await createOAuthState(context, provider);
  const url = new URL(authUrl);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', oauth.state);
  if (provider === 'google') {
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('include_granted_scopes', 'true');
  } else {
    url.searchParams.set('scope', 'public_profile');
  }

  return new Response(null, {
    status: 302,
    headers: { location: url.toString(), 'set-cookie': oauth.cookie, 'cache-control': 'no-store' }
  });
}
