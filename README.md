# Arjun — portfolio website

A vintage-cinema portfolio. The **design is fixed**; **all content** (text, photos, projects, tags, links, contact) lives in `content/site.json` and the `media/` folder, and you edit it through forms on your own site at **/admin** (or at app.pagescms.org). No coding needed.

---

## One-time setup (about 30 minutes)

### 1. Put the site on GitHub (free)
1. Create a free account at **github.com**.
2. Click **New repository** → name it `arjun-portfolio` → choose **Public** → **Create repository**.
3. On the new repository page click **uploading an existing file**, then drag in **everything inside this folder** (all folders and files), and click **Commit changes**.
4. Check that the two hidden files arrived: `.pages.yml` and `.nojekyll`. If either is missing (some browsers skip files starting with a dot), click **Add file → Create new file**, type the name, paste the contents from this folder, and commit.

### 2. Turn it into a website (free)
1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
3. After a minute or two the address appears at the top of that page, like `https://YOUR-NAME.github.io/arjun-portfolio/`. It opens on any phone, tablet or laptop.

### 3. Your own domain (optional, recommended)
1. Buy a domain such as `arjunactor.in` from any registrar (GoDaddy, Hostinger, Namecheap and so on).
2. In **Settings → Pages → Custom domain**, type the domain and **Save**.
3. At the registrar, add the DNS records GitHub asks for. GitHub's guide: <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>
4. Once it verifies, tick **Enforce HTTPS**.

### 4. Turn on editing at yoursite/admin (free, one time)
1. `admin/config.yml` already points to `arjunreddi02-cell/arjun-portfolio`. If you rename the repository or account, update the `repo:` line there.
2. Create a key that lets the editor save for you: open <https://github.com/settings/personal-access-tokens/new>
   - **Token name:** `portfolio editor` · **Expiration:** up to 1 year
   - **Repository access:** *Only select repositories* → `arjun-portfolio`
   - **Permissions → Contents:** *Read and write*
   - **Generate token**, and copy it somewhere safe (a password manager or a private note).
3. Open **https://YOUR-SITE/admin** → **Sign In Using Access Token** → paste the token. The browser remembers it, so you only do this once per device.

> Keep the token private: it can change your website. If it leaks, delete it on GitHub and make a new one.

**Prefer not to deal with tokens?** You can use **https://app.pagescms.org** instead: sign in with GitHub and open the repository. The `.pages.yml` file already sets up the same forms there.

---

## Everyday editing

Open **YOUR-SITE/admin → Portfolio content**, change anything, and click **Save** (works on your phone too). Or use **app.pagescms.org**. The live site updates about a minute later (refresh the page).

| You want to… | Do this |
|---|---|
| Add a new film, ad, short or event | **Projects → Add**. Pick **In front** (acting) or **Behind** (direction, writing, creative). It appears on the Work wall and in the end credits automatically. |
| Announce something not yet released | Add the project and set **Status → Upcoming**. A *Coming soon* section appears by itself. |
| Add photos or new looks | **Photos and looks → Add**, upload the photo, write a caption, add tags. |
| Put a photo in the screen-test filmstrip | Give it the tag **Headshot**. |
| Make a new photo filter appear | Use the same tag on two or more photos (for example *Action*, *Rural*, *Period*). |
| Change the showreel | **Showreel → link**: paste a YouTube or Google Drive link. Leave it empty to hide the section. |
| Add reviews or kind words | **Press and kind words → Add**. The section stays hidden while it's empty. |
| Update height, age range, languages, skills, awards | **Profile**. |
| Replace the downloadable profile | **Profile → Downloadable profile (PDF)**: upload the new PDF. |
| Add Instagram, YouTube or IMDb | **Contact**. Each link appears only once it's filled in. |

### Photo tips
- Use JPG, about **1600–2000 px** on the long side and under **1 MB**. Large phone photos slow the site down on mobile data.
- In Google Drive, set reel links to **Anyone with the link can view**, or they won't play for visitors.

---

## Hosting alternative: Cloudflare Pages (also free)
GitHub Pages is the simplest choice. If you'd like faster loading worldwide and unlimited traffic, connect the same GitHub repository to **Cloudflare Pages** (dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git; no build command; output folder `/`). The `/admin` editor works the same there.

## What not to touch
`index.html`, `src/` and `public/` are the template (design, animation, fonts). Editing content never needs them.

## How it's built
Plain HTML, CSS and JavaScript, with no framework and no build step. `src/render.js` builds every section from `content/site.json`; `src/main.js` runs the film effects and scroll scenes; `src/fx/film.js` draws the grain, flicker and scratches. It respects the reduced-motion setting and works without WebGL (the film effects simply switch off).
