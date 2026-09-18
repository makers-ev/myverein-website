// Same generated image for Twitter Cards -- Next's `opengraph-image` and
// `twitter-image` conventions are separate files, but there's no reason
// for the content to differ here. `runtime` must be its own literal export
// (Next statically parses route segment config, can't follow a re-export).
export { default, alt, size, contentType } from './opengraph-image';
export const runtime = 'nodejs';
