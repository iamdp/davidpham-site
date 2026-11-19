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

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: text };
  const data = {};
  let currentKey = null;
  let inList = false;
  match[1].split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') && inList) {
      if (!data[currentKey]) data[currentKey] = [];
      data[currentKey].push(trimmed.slice(2).trim());
    } else {
      const idx = trimmed.indexOf(':');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (val === '[]' || val === '') {
          data[key] = [];
          currentKey = key;
          inList = true;
        } else {
          data[key] = val;
          inList = false;
        }
      }
    }
  });
  return { data, body: match[2].trim() };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
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

    // Dynamic homepage from CMS content
    if (url.pathname === "/" || url.pathname === "/index.html") {
      try {
        const contentRes = await env.ASSETS.fetch(new URL("/content/home.md", url.origin));
        if (!contentRes.ok) throw new Error("content not found");
        const text = await contentRes.text();
        const { data, body } = parseFrontmatter(text);

        const title = escapeHtml(data.title || "David Pham");
        const tagline = escapeHtml(data.tagline || "");
        const linkedin = escapeHtml(data.linkedin || "https://www.linkedin.com/in/d-pham");
        const bodyHtml = body ? `<div class="body">${escapeHtml(body).replace(/\n/g, '<br>')}</div>` : '';

        let galleryHtml = '';
        const images = Array.isArray(data.images) ? data.images : [];
        if (images.length > 0) {
          const imgs = images.map(src => 
            `<img src="${escapeHtml(src)}" alt="" loading="lazy">`
          ).join('');
          galleryHtml = `<section class="gallery"><h2>Photos</h2><div class="gallery-grid">${imgs}</div></section>`;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="container">
    <h1>${title}</h1>
    <p class="tagline">${tagline}</p>
    ${bodyHtml}
    <a href="${linkedin}" class="linkedin-link" target="_blank" rel="noopener">LinkedIn</a>
    ${galleryHtml}
  </main>
</body>
</html>`;

        return new Response(html, {
          headers: { "content-type": "text/html;charset=UTF-8" },
        });
      } catch (e) {
        // fall through to static assets if content missing
      }
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
};
