// @ts-check

/**
 * PostCSS Configuration for Arena MVP
 * Version: 1.0.0
 * 
 * This configuration sets up the CSS processing pipeline with:
 * - Tailwind CSS 3.3+ for utility-first styling
 * - PostCSS Import 15.1+ for @import resolution
 * - PostCSS Preset Env 8.0+ for modern CSS features
 * - Autoprefixer 10.4+ for vendor prefixing
 */

const tailwindConfig = require('./tailwind.config.js');

/**
 * Configure PostCSS plugins based on environment
 * @param {object} env - Environment variables
 * @returns {object} PostCSS configuration object
 */
const configurePostCSS = (env) => {
  // Base plugins required in all environments
  const plugins = [
    // Handle @import rules and node_modules resolution
    require('postcss-import')({
      path: ['node_modules'],
      plugins: [
        // Apply PostCSS transformations to @imported files
        require('postcss-import/lib/transform')()
      ]
    }),

    // Process Tailwind directives and utilities
    require('tailwindcss')({
      config: tailwindConfig,
      // Enable all core plugins for full functionality
      corePlugins: {
        container: true,
        preflight: true,
        accessibility: true
      }
    }),

    // Convert modern CSS features to browser-compatible code
    require('postcss-preset-env')({
      stage: 3, // Use stage 3 features
      features: {
        'nesting-rules': true, // Enable CSS nesting
        'custom-properties': true, // Enable CSS variables
        'custom-media-queries': true, // Enable @custom-media
        'gap-properties': true, // Enable gap properties
        'place-properties': true // Enable place properties
      },
      autoprefixer: false // Disable built-in autoprefixer
    }),

    // Add vendor prefixes using browserslist config
    require('autoprefixer')({
      flexbox: 'no-2009', // Modern flexbox only
      grid: 'autoplace' // Enable grid autoplacement
    })
  ];

  // Production-specific optimizations
  if (env.mode === 'production') {
    plugins.push(
      require('cssnano')({
        preset: ['default', {
          discardComments: {
            removeAll: true
          },
          normalizeWhitespace: true,
          minifyFontValues: true,
          minifyGradients: true
        }]
      })
    );
  }

  return {
    plugins,
    // Enable source maps in development
    sourceMap: env.mode !== 'production',
    // Parse modern CSS features
    parser: 'postcss-scss',
    // Map source file locations
    map: env.mode !== 'production' ? { inline: true } : false
  };
};

// Export environment-aware configuration
module.exports = (ctx) => configurePostCSS(ctx);