`use strict`;

import browserslist                from 'browserslist';
import eleventyAutoCacheBuster     from 'eleventy-auto-cache-buster';
import eleventyPluginFilesMinifier from '@sherby/eleventy-plugin-files-minifier';
import esbuild                     from 'esbuild';
import format                      from 'date-fns/format';
import Image                       from '@11ty/eleventy-img';
import markdownIt                  from 'markdown-it';
import markdownItAnchor            from 'markdown-it-anchor';
import markdownItAttrs             from 'markdown-it-attrs';
import { minify }                  from 'terser';
import outdent                     from 'outdent';
import pluginSEO                   from 'eleventy-plugin-seo';
import pluginTOC                   from 'eleventy-plugin-toc';
// Next 2 constants for JS bundling browser targets
import {resolveToEsbuildTarget}    from 'esbuild-plugin-browserslist';
const target                      = resolveToEsbuildTarget(browserslist(
    'production' [
      '>0.2%',
      'Firefox ESR',
      'not dead',
      'not op_mini all'
    ],
      'development' [
      'last 1 chrome version',
      'last 1 firefox version',
      'last 1 safari version'
    ]
  ), {
  printUnknownTargets: false,
});

/* Permalinks */
// This object is required inside the renderPermalink function.
// It's copied directly from the plugin source code.
const position = {
  false: "push",
  true: "unshift",
}

// Copied directly from the plugin source code, with one edit
// (marked with comments)
const renderPermalink = (slug, opts, state, idx) => {
  const space = () =>
    Object.assign(new state.Token("text", "", 0), {
      content: " ",
    })

  const linkTokens = [
    Object.assign(new state.Token("link_open", "a", 1), {
      attrs: [
        ["class", opts.permalinkClass],
        ["href", opts.permalinkHref(slug, state)],
      ],
    }),
    Object.assign(new state.Token("html_block", "", 0), {
      // Edit starts here:
      content: `<span class="sr-only toc-ignore">Direct link to this section</span>
      <span aria-hidden="true" class="header-anchor__symbol">#</span>`,
      // Edit ends
    }),
    new state.Token("link_close", "a", -1),
  ]

  if (opts.permalinkSpace) {
    linkTokens[position[!opts.permalinkBefore]](space())
  }
  state.tokens[idx + 1].children[position[opts.permalinkBefore]](
    ...linkTokens
  )
}

// For Markdown attributes
const markdownItOptions = {
  html: true,
  breaks: true,
  linkify: true
};

// Options for the `markdown-it-anchor` library
const markdownItAnchorOptions = {
  permalink: true,
  renderPermalink,
}

const markdownLib = markdownIt(markdownItOptions).use(
  markdownItAnchor//,
  //markdownItAnchorOptions,
).use(
  markdownItAttrs
)

export default async function(eleventyConfig) {

  const {EleventyRenderPlugin} = await import(`@11ty/eleventy`);

  // Require layout file extensions; see
  // https://www.11ty.dev/docs/layouts/#omitting-the-layouts-file-extension
  eleventyConfig.setLayoutResolution(false);

  // Copy assets to build directory
  eleventyConfig.addPassthroughCopy(`src/assets/images`);
  eleventyConfig.addPassthroughCopy(`src/assets/fonts`);
  // Image shortcode
  const imageShortcode = async (
    src,
    className = undefined,
    alt,
    caption,
    widths = [400, 800, 1280],
    formats = ['webp', 'jpeg'],
    sizes = ['25vw', '50vw', '100vw']
  ) => {

    const imageMetadata = await Image(src, {
      widths: [...widths, null],
      formats: [...formats, null],
      outputDir: '_site/assets/images',
      urlPath: '/assets/images',
    });

    /** Maps a config of attribute-value pairs to an HTML string
     * representing those same attribute-value pairs.
     */
    const stringifyAttributes = (attributeMap) => {
      return Object.entries(attributeMap)
        .map(([attribute, value]) => {
          if (typeof value === 'undefined') return '';
          return `${attribute}="${value}"`;
        })
        .join(' ');
    };

    const sourceHtmlString = Object.values(imageMetadata)
      // Map each format to the source HTML markup
      .map((images) => {
        // The first entry is representative of all the others
        // since they each have the same shape
        const { sourceType } = images[0];

        // Use our util from earlier to make our lives easier
        const sourceAttributes = stringifyAttributes({
          type: sourceType,
          // srcset needs to be a comma-separated attribute
          srcset: images.map((image) => image.srcset).join(', '),
          sizes
        });

        // Return one <source> per format
        return `<source ${sourceAttributes}>`;
      })
      .join('\n');

    const getLargestImage = (format) => {
      const images = imageMetadata[format];
      return images[images.length - 1];
    }

    const largestUnoptimizedImg = getLargestImage(formats[0]);
    const imgAttributes = stringifyAttributes({
      src: largestUnoptimizedImg.url,
      width: largestUnoptimizedImg.width,
      height: largestUnoptimizedImg.height,
      alt,
      loading: 'lazy',
      decoding: 'async',
    });
    const imgHtmlString = `<img ${imgAttributes}>`;

    const pictureAttributes = stringifyAttributes({
      class: className,
    });
    if (caption === undefined) caption = ``;
    const picture = `<figure><picture ${pictureAttributes}>
      ${sourceHtmlString}
      ${imgHtmlString}
    </picture><figcaption>${caption}</figcaption></figure>`;

    return outdent`${picture}`;
  };
  // SEO
  eleventyConfig.addPlugin(pluginSEO, {
    title: 'Chris J. Zähller',
    description: 'Résumé & portfolio micro-site for Chris J. Zähller',
    url: 'https://chris.zahller.me',
    author: 'Chris J. Zähller',
    twitter: 'czahller',
    image: '/assets/images/site/zed.webp/',
    options: {
      titleDivider: '|',
      imageWithBaseUrl: true,
      twitterCardType: 'summary_large_image',
      showPageNumbers: false
    }
  });
  // Needed for paired shortcodes
  eleventyConfig.addPlugin(EleventyRenderPlugin);
  // For inline SVG; see https://medium.com/@brettdewoody/inlining-svgs-in-eleventy-cffb1114e7b
  eleventyConfig.addNunjucksAsyncShortcode('svgIcon', async (src) => {
    let metadata = await Image(src, {
      formats: ['svg'],
      dryRun: true,
    })
    return metadata.svg[0].buffer.toString()
  });
  // JS inline minfication
  eleventyConfig.addNunjucksAsyncFilter(`jsmin`, async function (
    code,
    callback
  ) {
    try {
      const minified = await minify(code);
      callback(null, minified.code);
    } catch (err) {
      console.error(`Terser error: `, err);
      // Fail gracefully.
      callback(null, code);
    }
  });
  // Register image shortcode
  eleventyConfig.addNunjucksAsyncShortcode('image', imageShortcode);
  // Get today's date & update the timestamp
  eleventyConfig.addPairedShortcode(
    `Today`,
    (content, el = `time`, toDay) => {
      toDay = new Date();
      return `<${el} datetime="${toDay}">${content}</${el}>`
    }
  )
  // Extended Markdown
  eleventyConfig.setLibrary('md', markdownLib);
  // Table of Contents plugin
  eleventyConfig.addPlugin(pluginTOC, {
    tags: [`h2`, `h3`],
    extractText: function(el) {
      return el.text().replace(`Direct link to this section`, ``).replace(`#`, ``).trim();
    }
  });
  // Cache busting
  eleventyConfig.addPlugin(eleventyAutoCacheBuster, {
    globstring: `**/*.{css,js,png,jpg,jpeg,gif,webp,svg,mp4,ico}`
  });
  // HTML minification
  eleventyConfig.addPlugin(eleventyPluginFilesMinifier);
  // JS  & CSS bundling, tree-shaking, & minification
  eleventyConfig.on(`eleventy.before`, async () => {
    await esbuild.build({
      entryPoints: [`src/assets/js/index.js`, `src/assets/css/index.css`],
      bundle: true,
      treeShaking: true,
      outdir: `_site/assets/`,
      sourcemap: true,
      minify: true,
      target // From our constant, set at top of file
    });
  });
  // Watch directories for changes
  eleventyConfig.addWatchTarget(`./src/assets/css/`);
  eleventyConfig.addWatchTarget(`./src/assets/js/`);
  // add `date` filter
  eleventyConfig.addFilter('date', function (date, dateFormat) {
    return format(date, dateFormat)
  })
  // Copy files during build
  eleventyConfig.addPassthroughCopy(
    {
    // Copy `/favicon/` to `_site/`
    'favicon': '/'
  });
  // Set custom directory for input; otherwise use defaults
  return {
    // Site URL
    url: 'https://chris.zahller.me',
    // When a passthrough file is modified, rebuild the pages:
    passthroughFileCopy: true,
    // Copy any file in these formats:
    templateFormats: [`html`, `njk`, `md`, `js`],
    markdownTemplateEngine: `njk`,
    htmlTemplateEngine: `njk`,
    dataTemplateEngine: `njk`,
    // Set up directory structure:
    dir: {
      input: `src`,
    },
  };
};
