export async function onRequest(context) {
    const {
        request,
        env,
        params,
        waitUntil,
        next,
        data,
    } = context;
    const client_id = context.env.GITHUB_CLIENT_ID;
    try {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const redirectUrl = new URL('https://github.com/login/oauth/authorize');
        redirectUrl.searchParams.set('client_id', client_id);
        redirectUrl.searchParams.set('redirect_uri', `${protocol}://${host}/callback`);
        redirectUrl.searchParams.set('scope', 'repo user');
        const stateArray = new Uint8Array(12);
        crypto.getRandomValues(stateArray);
        const state = Array.from(stateArray, byte => byte.toString(16).padStart(2, '0')).join('');
        redirectUrl.searchParams.set('state', state);
        return Response.redirect(redirectUrl.href, 301);
    } catch (error) {
        console.error(error);
        return new Response(error.message, {
            status: 500,
        });
    }
}