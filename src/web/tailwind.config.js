// @ts-check
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable JIT mode for better performance and smaller builds
  mode: 'jit',

  // Enable class-based dark mode strategy
  darkMode: 'class',

  // Define content sources for Tailwind to scan for classes
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],

  // Theme configuration extending Tailwind's defaults
  theme: {
    // Screen breakpoints following mobile-first approach
    screens: {
      'sm': '320px',  // Mobile
      'md': '768px',  // Tablet
      'lg': '1024px', // Desktop
      'xl': '1440px'  // Large Desktop
    },

    // Extend default theme with custom design tokens
    extend: {
      // Color system using CSS variables for theme support
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          light: 'var(--color-secondary-light)',
          dark: 'var(--color-secondary-dark)'
        },
        // Feedback colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        // Interface colors
        background: {
          DEFAULT: 'var(--color-background)',
          alt: 'var(--color-background-alt)'
        },
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)'
        },
        border: 'var(--color-border)',
        surface: 'var(--color-surface)',
        focus: 'var(--color-focus)',
        overlay: 'var(--color-overlay)'
      },

      // Typography configuration
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },

      // Font size scale using CSS variables
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        '4xl': 'var(--font-size-4xl)'
      },

      // Spacing scale based on 8px grid system
      spacing: {
        '0': 'var(--spacing-0)',
        '1': 'var(--spacing-1)',
        '2': 'var(--spacing-2)',
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '6': 'var(--spacing-6)',
        '8': 'var(--spacing-8)',
        '12': 'var(--spacing-12)',
        '16': 'var(--spacing-16)',
        '20': 'var(--spacing-20)',
        '24': 'var(--spacing-24)',
        '32': 'var(--spacing-32)'
      },

      // Border radius using CSS variables
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'full': 'var(--radius-full)'
      },

      // Box shadows using CSS variables
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)'
      },

      // Z-index scale
      zIndex: {
        'dropdown': 'var(--z-index-dropdown)',
        'sticky': 'var(--z-index-sticky)',
        'modal': 'var(--z-index-modal)',
        'tooltip': 'var(--z-index-tooltip)'
      },

      // Transition utilities
      transitionProperty: {
        'base': 'var(--transition-base)'
      }
    }
  },

  // Configure plugins for enhanced functionality
  plugins: [
    // @tailwindcss/forms v0.5+ - Form element styling
    require('@tailwindcss/forms')({
      strategy: 'class'
    }),
    
    // @tailwindcss/typography v0.5+ - Rich text content styling
    require('@tailwindcss/typography')({
      className: 'prose'
    }),
    
    // @tailwindcss/aspect-ratio v0.4+ - Responsive media
    require('@tailwindcss/aspect-ratio')
  ]
};