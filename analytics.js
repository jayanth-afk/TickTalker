// Vercel Web Analytics initialization
// This script initializes Vercel Analytics for the TickTalker application

// For development with node_modules (when serving locally with a dev server)
if (typeof window !== 'undefined') {
  // Initialize the analytics queue
  window.va = window.va || function () { 
    (window.vaq = window.vaq || []).push(arguments); 
  };
  
  // Try to load from node_modules if available (for local development with a bundler)
  // Otherwise, Vercel will automatically inject the analytics script in production
  try {
    import('./node_modules/@vercel/analytics/dist/index.mjs')
      .then(({ inject }) => {
        inject({
          mode: 'auto', // auto-detect development vs production
          debug: false
        });
      })
      .catch(() => {
        // Silently fail if module can't be loaded (expected in production)
        // Vercel automatically serves analytics in production deployments
      });
  } catch (e) {
    // Module imports not supported or failed
  }
}
