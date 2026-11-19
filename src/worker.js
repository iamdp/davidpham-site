function renderBody(status, content) {
  const html = `
    <script>
      const receiveMessage = (message) => {
        window.opener.postMessage(
          'authorization:github:${status}:${JSON.stringify(content)}',
          message.origin
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    </script>
  `;
  return new Blob([html]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // GitHub OAuth start
    if (url.pathname === "/api/auth") {
      const client_id = env.GITHUB_CLIENT_ID;
      if (!client_id) return new Response("Missing GITHUB_CLIENT_ID", { status: 500 });

      const redirectUrl = new URL("https://github.com/login/oauth/authorize");
      redirectUrl.searchParams.set("client_id", client_id);
      redirectUrl.searchParams.set("redirect_uri", url.origin + "/api/callback");
      redirectUrl.searchParams.set("scope", "repo user");
      redirectUrl.searchParams.set(
        "state",
        crypto.getRandomValues(new Uint8Array(12)).join("")
      );
      return Response.redirect(redirectUrl.href, 302);
    }

    // GitHub OAuth callback
    if (url.pathname === "/api/callback") {
      const client_id = env.GITHUB_CLIENT_ID;
      const client_secret = env.GITHUB_CLIENT_SECRET;
      if (!client_id || !client_secret) {
        return new Response("Missing OAuth secrets", { status: 500 });
      }

      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      try {
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "accept": "application/json",
            "user-agent": "davidpham-site-oauth",
          },
          body: JSON.stringify({ client_id, client_secret, code }),
        });
        const result = await tokenRes.json();

        if (result.error) {
          return new Response(renderBody("error", result), {
            headers: { "content-type": "text/html;charset=UTF-8" },
            status: 401,
          });
        }

        return new Response(
          renderBody("success", { token: result.access_token, provider: "github" }),
          { headers: { "content-type": "text/html;charset=UTF-8" }, status: 200 }
        );
      } catch (err) {
        return new Response(String(err), { status: 500 });
      }
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
};
