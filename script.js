/* =========
   Utilities
   ========= */

/**
 * Shorthand to select a single element.
 * @param {string} sel - CSS selector
 * @param {ParentNode} scope - Optional scope
 */
const $ = (sel, scope = document) => scope.querySelector(sel); // Helper: first match.

/**
 * Create an element with classes and attributes.
 * @param {string} tag - e.g., 'div'
 * @param {object} opts - { className, attrs: {key: value} }
 */
function el(tag, opts = {}) {                               // Element factory.
  const node = document.createElement(tag);                 // Create the node.
  if (opts.className) node.className = opts.className;      // Apply classes if provided.
  if (opts.attrs) {                                         // Apply attributes (e.g., aria-label).
    for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  }
  return node;                                              // Return ready-to-use node.
}

/* =====================
   Global Bootstrapping
   ===================== */

document.addEventListener('DOMContentLoaded', () => {       // Wait until DOM is ready.
  setYear();                                                // Update © year.
  enhanceStickyHeader();                                    // Add shadow when scrolled.
  wireContactForm();                                        // Attach "mailto:" submit handler.
  loadProjects();                                           // Fetch and render project cards.
  loadProjectDetail();
});

function setYear() {
  const y = $('#year');                                     // Find span#year.
  if (y) y.textContent = new Date().getFullYear();          // Insert current year (e.g., 2025).
}

/** Toggle a 'scrolled' class on header for a drop shadow after top. */
function enhanceStickyHeader() {
  const header = document.querySelector('.site-header');    // Grab the header.
  if (!header) return;                                      // Bail if not found.
  const toggle = () => {                                     // Define handler.
    const atTop = window.scrollY < 6;                       // Near top threshold.
    header.style.boxShadow = atTop
      ? 'none'                                              // No shadow at top.
      : '0 10px 30px rgba(0,0,0,.25)';                      // Shadow after scroll.
  };
  toggle();                                                  // Run on load.
  window.addEventListener('scroll', toggle, { passive: true }); // Update on scroll.
}


/* ===============
   Projects Loader
   =============== */

/**
 * Fetch projects.json (same folder as index.html) and render cards.
 * Expected shape per project:
 * { title, description, slug, tags: [..], cover } // 'cover' is optional image path.
 */
async function loadProjects() {
  const grid = $('#project-grid');                          // Mount point for cards.
  if (!grid) return;                                        // Bail if missing.

  let projects;
  try {
    const res = await fetch('projects.json', { cache: 'no-store' }); // Request latest copy.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);     // Treat non-2xx as failure.
    projects = await res.json();                            // Parse JSON into JS array.
  } catch (err) {
    // Fallback demo data if projects.json is missing/invalid.
    projects = [
      {
        title: 'Sample Project',
        description: 'Replace projects.json to populate real projects.',
        slug: 'sample-project',
        tags: ['demo', 'starter'],
        cover: ''                                           // Leave blank to use gradient.
      }
    ];
    console.warn('Using fallback projects:', err);          // Helpful console message.
  }

  renderProjects(projects, grid);                           // Build the cards.
}

/**
 * Render an array of project objects into card elements.
 * @param {Array} projects - Project data array
 * @param {HTMLElement} grid - Container to append cards
 */
function renderProjects(projects, grid) {
  grid.innerHTML = '';                                      // Clear any previous content.

  projects.forEach((p) => {                                 // Iterate through projects.
    const card = el('article', {
      className: 'card',                                    // Card styling class.
      attrs: {
        tabindex: '0',                                      // Make focusable for keyboard users.
        role: 'link',                                       // Announce as link to AT.
        'aria-label': `Open ${p.title} project`             // Accessible label.
      }
    });

    // Cover (image or gradient placeholder).
    const cover = el('div', { className: 'card-cover' });   // Visual header for card.
    if (p.cover) {                                          // If an image path exists…
      const img = el('img', { attrs: { src: p.cover, alt: `${p.title} cover` } }); // Create img.
      cover.appendChild(img);                               // Insert into cover.
    }
    card.appendChild(cover);                                // Add cover to card.

    // Body: title, description, tags.
    const body = el('div', { className: 'card-body' });     // Inner content wrapper.

    const h3 = el('h3', { className: 'card-title' });       // Project title element.
    h3.textContent = p.title || 'Untitled';                 // Fallback title if missing.

    const desc = el('p', { className: 'card-desc' });       // Short description text.
    desc.textContent = p.description || 'No description yet.'; // Fallback text.

    const tagRow = el('div', { className: 'card-tags' });   // Tag container.
    (p.tags || []).forEach(t => {                           // Loop tags if present.
      const tag = el('span', { className: 'tag' });         // Create tag pill.
      tag.textContent = t;                                  // Tag label.
      tagRow.appendChild(tag);                              // Add to row.
    });

    body.append(h3, desc, tagRow);                          // Compose body.
    card.appendChild(body);                                 // Attach body to card.

    // Click + keyboard activation -> navigate to detail page with ?id=<slug>.
    const go = () => {                                      // Define navigation function.
      const slug = p.slug || 'sample-project';              // Ensure slug exists.
      window.location.href = `project.html?id=${encodeURIComponent(slug)}`; // Navigate.
    };
    card.addEventListener('click', go);                     // Mouse click activates.
    card.addEventListener('keydown', (e) => {               // Keyboard accessibility.
      if (e.key === 'Enter' || e.key === ' ') {             // Enter or Space.
        e.preventDefault();                                 // Prevent page scroll on Space.
        go();                                               // Trigger navigation.
      }
    });

    grid.appendChild(card);                                 // Add card to grid.
  });
}

/**
 * Load a single project's details into project.html using ?id=<slug>.
 */
async function loadProjectDetail() {                                   // Define async so we can await fetch.
  const article = document.getElementById('project-article');          // Find the detail page container.
  if (!article) return;                                                // If not on project.html, do nothing.

  // Grab all target nodes we'll populate.
  const titleEl   = document.getElementById('project-title');          // <h1> title placeholder.
  const summaryEl = document.getElementById('project-summary');        // One-line summary/description.
  const metaEl    = document.getElementById('project-meta');           // Tags + links (live/repo).
  const bodyEl    = document.getElementById('project-body');           // Long description section.
  const galleryEl = document.getElementById('project-gallery');        // Thumbnails grid.

  // Read ?id= from the URL (getParam is defined inline in project.html).
  const id = (typeof getParam === 'function') ? getParam('id') : null; // Safely call helper if present.

  // Handle missing id.
  if (!id) {                                                           // If no slug provided…
    if (titleEl)   titleEl.textContent = 'Project not specified';      // Tell the user what’s wrong.
    if (summaryEl) summaryEl.textContent = 'Missing ?id=… in the URL.';// Guidance message.
    return;                                                            // Stop here.
  }

  // Fetch the catalog of projects.
  let data = [];                                                       // Will hold parsed JSON array.
  try {
    const res = await fetch('projects.json', { cache: 'no-store' });   // Always fetch fresh copy.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);                // Treat non-2xx as errors.
    data = await res.json();                                           // Parse JSON into JS objects.
  } catch (e) {
    if (titleEl)   titleEl.textContent = 'Error loading project';      // Error UI for title.
    if (summaryEl) summaryEl.textContent = 'Could not fetch projects.json.'; // Error UI for summary.
    console.warn(e);                                                   // Log for debugging.
    return;                                                            // Abort rendering.
  }

  // Find the matching project by slug.
  const p = data.find(x => (x.slug || '') === id);                     // Compare slug to ?id.
  if (!p) {                                                            // If no match…
    if (titleEl)   titleEl.textContent = 'Project not found';          // Not found UI.
    if (summaryEl) summaryEl.textContent = `No project with id="${id}".`; // Helpful message.
    return;                                                            // Stop here.
  }

  // Set title in the page and the browser tab.
  if (titleEl) titleEl.textContent = p.title || 'Untitled project';    // Visible page title.
  document.title = `${p.title || 'Project'} • My Portfolio`;            // <title> in <head>.

  // Summary beneath the title (fallback to short description).
  if (summaryEl) summaryEl.textContent = p.summary || p.description || '';// Prefer summary > description.

  // Build the meta area: tags + optional live/repo links.
  if (metaEl) {
    metaEl.innerHTML = '';                                             // Clear previous content.

    // Tags row (if any).
    if (Array.isArray(p.tags) && p.tags.length) {                      // Guard for arrays with items.
      const row = document.createElement('div');                       // Container for tag pills.
      row.className = 'project-tags card-tags';                        // Reuse tag styling.
      p.tags.forEach(t => {                                            // For each tag…
        const tag = document.createElement('span');                    // Create pill element.
        tag.className = 'tag';                                         // Tag visuals.
        tag.textContent = t;                                           // Text label.
        row.appendChild(tag);                                          // Add to row.
      });
      metaEl.appendChild(row);                                         // Insert into meta area.
    }

    // Optional: live site link.
    if (p.link) {                                                      // If link field exists…
      const link = document.createElement('a');                        // Create anchor.
      link.href = p.link;                                              // Destination URL.
      link.target = '_blank';                                          // Open in new tab.
      link.rel = 'noopener noreferrer';                                // Security best practice.
      link.className = 'btn btn-secondary';                            // Styled as secondary button.
      link.textContent = 'View Live';                                  // Button label.
      metaEl.appendChild(link);                                        // Add to meta.
    }

    // Optional: repository link.
    if (p.repo) {                                                      // If repo field exists…
      const link = document.createElement('a');                        // Create anchor.
      link.href = p.repo;                                              // Repo URL (e.g., GitHub).
      link.target = '_blank';                                          // New tab.
      link.rel = 'noopener noreferrer';                                // Security.
      link.className = 'btn btn-secondary';                            // Consistent style.
      link.textContent = 'Source Code';                                // Button label.
      metaEl.appendChild(link);                                        // Add to meta.
    }
  }

  // Long-form body: supports several shapes from projects.json.
  if (bodyEl) {
    bodyEl.innerHTML = '';                                             // Clear existing content.

    if (Array.isArray(p.body)) {                                       // If body is an array of paragraphs…
      p.body.forEach(par => {                                          // For each paragraph string…
        const para = document.createElement('p');                      // Create <p>.
        para.textContent = par;                                        // Set text.
        bodyEl.appendChild(para);                                      // Append to body.
      });
    } else if (p.bodyHtml) {                                           // If you provide trusted HTML…
      bodyEl.innerHTML = p.bodyHtml;                                   // Inject HTML (trusted only).
    } else if (p.long) {                                               // Single long string alternative.
      const para = document.createElement('p');                        // Create <p>.
      para.textContent = p.long;                                       // Set text.
      bodyEl.appendChild(para);                                        // Append.
    } else if (p.description) {                                        // Fallback to short description.
      const para = document.createElement('p');                        // Create <p>.
      para.textContent = p.description;                                // Set text.
      bodyEl.appendChild(para);                                        // Append.
    }
  }

  // Image gallery: accepts array of strings or objects {src, alt}.
  if (galleryEl) {
    galleryEl.innerHTML = '';                                          // Reset gallery content.
    const imgs = Array.isArray(p.images) ? p.images : [];              // Normalize to array.

    imgs.forEach(it => {                                               // For each image entry…
      const src = typeof it === 'string' ? it : it?.src;               // Resolve image URL.
      const alt = (typeof it === 'object' && it?.alt)                  // Use provided alt…
        ? it.alt                                                       // …or fallback below.
        : `${p.title} image`;                                          // Basic accessible alt.
      if (!src) return;                                                // Skip if no valid src.

      const a = document.createElement('a');                           // Wrap image in a link.
      a.href = src;                                                    // Click opens full image.
      a.target = '_blank';                                             // New tab.
      a.rel = 'noopener noreferrer';                                   // Security.
      a.className = 'card';                                            // Reuse card visuals.
      a.style.display = 'block';                                       // Ensure block for grid.

      const cover = document.createElement('div');                     // Visual frame.
      cover.className = 'card-cover';                                  // Consistent aspect ratio.

      const img = document.createElement('img');                       // Actual image element.
      img.src = src;                                                   // Thumbnail source.
      img.alt = alt;                                                   // Alt text for a11y.
      img.style.width = '100%';                                        // Fill container width.
      img.style.height = '100%';                                       // Fill container height.
      img.style.objectFit = 'cover';                                   // Crop to frame nicely.

      cover.appendChild(img);                                          // Put image in frame.
      a.appendChild(cover);                                            // Put frame in link.

      a.style.gridColumn = 'span 6';                                   // Make each thumb 2-up on 12-col grid.
      galleryEl.appendChild(a);                                        // Add to gallery grid.
    });
  }
}

/* ===============
   Contact (mailto)
   =============== */

/**
 * Convert form submission into a mailto: link that opens the user's email client.
 * In production, replace with a real email sending API (e.g., Resend, AWS SES, etc.).
 */
function wireContactForm() {
  const form = $('#contact-form');                          // Grab the contact form.
  if (!form) return;                                        // If missing, exit.

  const TO_EMAIL = 'you@example.com';                       // TODO: Put your email here.

  form.addEventListener('submit', (e) => {                  // Capture submit event.
    e.preventDefault();                                     // Stop default page reload.

    const name = $('#name')?.value.trim() || '';            // Read name field.
    const email = $('#email')?.value.trim() || '';          // Read email field.
    const message = $('#message')?.value.trim() || '';      // Read message field.

    // Simple client-side validation (HTML 'required' already covers basic checks).
    if (!name || !email || !message) {                      // Ensure all fields present.
      alert('Please complete all fields.');                 // Notify user.
      return;                                               // Abort sending.
    }

    // Compose a subject and body that are readable in email clients.
    const subject = `Portfolio contact from ${name}`;       // Email subject line.
    const bodyLines = [                                     // Email body as lines.
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Message:',
      message
    ];
    const body = bodyLines.join('\n');                      // Join with newlines.

    // Construct the mailto URL and navigate to it.
    const mailto = `mailto:${encodeURIComponent(TO_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; // Encode safely.
    window.location.href = mailto;                          // Open default mail client.

    // Optional: provide quick UI feedback after click.
    const btn = form.querySelector('button[type="submit"]'); // Find submit button.
    if (btn) {
      const prev = btn.textContent;                         // Save original label.
      btn.disabled = true;                                  // Prevent double-submits.
      btn.textContent = 'Opening your email client…';       // Temporary feedback.
      setTimeout(() => { btn.disabled = false; btn.textContent = prev; }, 2500); // Reset.
    }
  });
}