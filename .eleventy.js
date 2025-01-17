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
import path                        from 'path';
import pluginSEO                   from 'eleventy-plugin-seo';
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

// For Markdown attributes
const markdownItOptions = {
  html: true,
  breaks: true,
  linkify: true
};

const markdownLib = markdownIt(markdownItOptions).use(markdownItAnchor).use(markdownItAttrs);

export default async function(eleventyConfig) {

  const {EleventyRenderPlugin} = await import('@11ty/eleventy');

  // Pagefind config; runs AFTER build
  eleventyConfig.on('eleventy.after', async function ({ dir }) {
    const inputPath = dir.output;
    const outputPath = path.join(dir.output, 'pagefind');

    console.log('Creating Pagefind index of %s', inputPath);

    const pagefind = await import('pagefind');
    const { index } = await pagefind.createIndex();
    const { page_count } = await index.addDirectory({ path: inputPath });
    await index.writeFiles({ outputPath });

    console.log(
      'Created Pagefind index of %i pages in %s',
      page_count,
      outputPath
    );
  });

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
    description: 'Résumé & portfolio microsite for Chris J. Zähller',
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
  // Sorted collection
  // See https://www.11ty.dev/docs/collections/#advanced-custom-filtering-and-sorting
  eleventyConfig.addCollection(`recipesAscending`, function (collectionApi) {
    return collectionApi.getFilteredByTag(`recipes`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingA`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/a*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingB`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/b*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingC`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/c*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingD`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/d*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingE`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/e*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingF`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/f*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingG`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/g*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingH`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/h*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingI`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/i*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingJ`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/j*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingK`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/k*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingL`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/l*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingM`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/m*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingN`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/n*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingO`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/o*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingP`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/p*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingQ`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/q*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingR`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/r*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingS`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/s*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingT`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/t*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingU`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/u*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingV`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/v*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingW`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/w*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingX`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/x*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingY`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/y*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`recipesAscendingZ`, function (collectionApi) {
    return collectionApi.getFilteredByGlob(`**/recipes/z*.md`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`mixesAscending`, function (collectionApi) {
    return collectionApi.getFilteredByTag(`mixes`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`rumsAscending`, function (collectionApi) {
    return collectionApi.getFilteredByTag(`rums`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
  eleventyConfig.addCollection(`rhumsAscending`, function (collectionApi) {
    return collectionApi.getFilteredByTag(`rhums`).sort(function (a, b) {
      return a.inputPath.localeCompare(b.inputPath); // sort by path - ascending
    });
  });
eleventyConfig.addPassthroughCopy({
  // Copy `/favicon/` to `_site/`
  'favicon': '/'
 });
// Set custom directory for input; otherwise use defaults
  return {
    // Site URL
    url: 'https://tinypaperumbrella.com',
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
