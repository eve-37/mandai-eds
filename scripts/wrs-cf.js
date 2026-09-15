/**
 * Content Fragment fetch helper for the WRS servlet endpoint.
 *
 * WHY THIS EXISTS
 * ----------------
 * Two migrated blocks are Content-Fragment-backed and share nothing else:
 * `wrs-featured-listing` (model wrs-emp-zone) and `wrs-four-column-listing`
 * (models mandai-things-to-do / mandai-things-to-do-w-operating-hours). Both
 * resolve an authored fragment path against the same AEM servlet, so the
 * fetch/URL-building logic belongs in one shared place - but NOT in
 * `rb-helpers.js`, whose own docblock scopes it to the Ranger Buddies blocks.
 *
 * THE ENDPOINT CONTRACT (see ContentFragmentServlet.java in mandai-aem-cloud
 * for the authoritative source - this module is a thin, fixed client for it)
 * ----------------------------------------------------------------------------
 * - URL: `{origin}/content/mandai-api.cfdetails.json{fragmentPath}` - the
 *   fragment path is the SUFFIX, never a query string, because a query
 *   string is not cacheable by the dispatcher.
 * - The suffix is NOT URI-encoded. Browsers do not encode slashes in a URL
 *   path and the suffix is read literally on the server, so encoding it here
 *   would send a path AEM cannot resolve.
 * - No custom headers are sent. A plain GET with no custom headers is a
 *   CORS-simple request, so no OPTIONS preflight fires and the dispatcher
 *   only needs to allow GET - adding a header (even something as innocuous
 *   as `Accept`) would break that.
 * - Success: HTTP 200, body `{ path, model, elements: { ... } }`.
 * - Failure: a non-2xx status with `{ error }`. Treated identically to a
 *   network failure here - callers get `null`, never a thrown error.
 * - Elements the fragment has no value for are OMITTED from `elements`, not
 *   sent as null - one endpoint serves two fragment models with disjoint
 *   element sets, so callers must not assume any key is present.
 * - Multi-value elements (arrays) arrive already capped at 3 entries
 *   server-side. Do not re-cap client-side.
 */

/**
 * The AEM publish origin, derived from the author host in fstab.yaml
 * (author-p144127-e1488012 -> publish-p144127-e1488012).
 */
const PUBLISH_ORIGIN = 'https://publish-p144127-e1488012.adobeaemcloud.com';

/**
 * Returns the origin to fetch the Content Fragment servlet against.
 *
 * On the AEM-hosted preview/live domains (`aem.page` / `aem.live`) and on
 * localhost, the page itself is not served through the production CDN, so
 * the servlet has to be addressed directly on the publish origin. Elsewhere
 * (a production apex domain) this returns '' - a relative path - under the
 * assumption that the AEM CDN fronts production and routes the
 * `/content/mandai-api.cfdetails.json` path through to publish itself. If
 * EDS's own CDN fronts production instead of AEM's, that assumption is
 * wrong and this must return `PUBLISH_ORIGIN` unconditionally rather than
 * branching on hostname at all - that is an infrastructure decision, not
 * something this function can detect from the browser.
 */
export function getBasePathBasedOnEnv() {
  const { hostname } = window.location;
  if (
    hostname.endsWith('.aem.page')
    || hostname.endsWith('.aem.live')
    || hostname === 'localhost'
  ) {
    return PUBLISH_ORIGIN;
  }
  return '';
}

/**
 * Resolves one fragment path to its `elements` object, or `null` on any
 * failure (network error, non-2xx, unparseable body). Never throws - a
 * fragment that fails to resolve must not take down the block rendering it,
 * or its siblings.
 *
 * @param {string} fragmentPath e.g. /content/dam/mandai/fragments/zones/lions
 * @returns {Promise<object|null>}
 */
export async function fetchFragment(fragmentPath) {
  if (!fragmentPath) return null;
  const url = `${getBasePathBasedOnEnv()}/content/mandai-api.cfdetails.json${fragmentPath}`;
  try {
    // No custom headers - keeps this a CORS-simple request (see docblock).
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    return body?.elements ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves many fragment paths in parallel, preserving input order. Each
 * entry independently resolves to its `elements` object or `null` - one
 * fragment failing (404, network error) does not blank the others.
 *
 * @param {string[]} fragmentPaths
 * @returns {Promise<(object|null)[]>}
 */
export async function fetchFragments(fragmentPaths) {
  return Promise.all(fragmentPaths.map((path) => fetchFragment(path)));
}
