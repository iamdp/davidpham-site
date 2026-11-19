# David Pham Personal Site

Simple personal website for davidpham.ca, built for Cloudflare Pages + Decap CMS.

## Current Layout

Mimics the original Google Sites page as closely as possible:
- Centered name
- Tagline listing roles/activities
- LinkedIn link

## Structure

- `index.html` + `styles.css` — main page
- `admin/` — Decap CMS interface
- `static/images/` — media uploads (configured in Decap)
- `content/` — for future Markdown content (optional)

## Next Steps for Cloudflare Pages + Decap

1. Create a GitHub repo and push these files.
2. In Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git.
3. Build settings: no build command needed (static), output directory: `/` (or root).
4. For Decap authentication on Cloudflare Pages, follow a guide such as:
   - https://kunat.dev/notes/decap-cms-github-hugo-cloudflare-pages/
   - Or use the `i40west/netlify-cms-cloudflare-pages` Functions approach.
5. Update `admin/config.yml` with your actual GitHub repo.
6. Once live on a pages.dev URL, you can preview, then later point davidpham.ca DNS to Cloudflare.

## Future Improvements

- Add photo galleries via Decap (collections already sketched).
- Expand about section, activity pages.
- Switch to Astro or Hugo if you want more structure while keeping Decap.
