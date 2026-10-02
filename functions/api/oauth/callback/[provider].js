import { consumeOAuthState, completeIdentityLogin, socialErrorRedirect, socialRedirectResponse } from '../../../_lib/social.js';

const PUBLIC_ORIGIN = 'https://liplip.pages.dev';

async function googleIdentity(context, code, redirectUri) {
  const form = new URLSearchParams({
    code,
    client_id: String(context.env.GOOGLE_CLIENT_ID || ''),
    client_secret: String(context.env.GOOGLE_CLIENT_SECRET || ''),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.access_token) throw new Error('google_token_exchange_failed');
  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${token.access_token}` }
  });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.sub) throw new Error('google_profile_failed');
  return {
    provider: 'google',
    subject: profile.sub,
    email: profile.email || null,
    emailVerified: profile.email_verified === true,
    name: profile.name || null,
    picture: profile.picture || null
  };
}

async function facebookIdentity(context, code, redirectUri) {
  const tokenUrl = new URL('https://graph.facebook.com/oauth/access_token');
  tokenUrl.searchParams.set('client_id', String(context.env.FACEBOOK_APP_ID || ''));
  tokenUrl.searchParams.set('client_secret', String(context.env.FACEBOOK_APP_SECRET || ''));
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl.toString());
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.access_token) throw new Error('facebook_token_exchange_failed');
  const graphVersion = String(context.env.META_GRAPH_VERSION || 'v24.0').replace(/^\/+/, '');
  const profileUrl = new URL(`https://graph.facebook.com/${graphVersion}/me`);
  profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
  profileUrl.searchParams.set('access_token', token.access_token);
  const profileRes = await fetch(profileUrl.toString());
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.id) throw new Error('facebook_profile_failed');
  return {
    provider: 'facebook',
    subject: profile.id,
    email: profile.email || null,
    emailVerified: false,
    name: profile.name || null,
    picture: profile.picture?.data?.url || null
  };
}

export async function onRequestGet(context) {
  if (!context.env.DB) return socialErrorRedirect('database_unavailable');
  const provider = String(context.params?.provider || '').toLowerCase();
  if (!['google', 'facebook'].includes(provider)) return socialErrorRedirect('provider_not_supported');
  const url = new URL(context.request.url);
  if (url.searchParams.get('error')) return socialErrorRedirect(`${provider}_cancelled`);
  const code = String(url.searchParams.get('code') || '');
  const state = String(url.searchParams.get('state') || '');
  if (!code || !(await consumeOAuthState(context, provider, state))) return socialErrorRedirect('oauth_state_invalid');
  const redirectUri = `${PUBLIC_ORIGIN}/api/oauth/callback/${provider}`;

  try {
    const identity = provider === 'google'
      ? await googleIdentity(context, code, redirectUri)
      : await facebookIdentity(context, code, redirectUri);
    const login = await completeIdentityLogin(context, identity);
    return socialRedirectResponse(login.session, provider);
  } catch (error) {
    console.error('[social auth]', provider, error);
    return socialErrorRedirect(error?.message || `${provider}_login_failed`);
  }
}
