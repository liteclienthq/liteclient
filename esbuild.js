const esbuild = require('esbuild');
const { resolve } = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const watchPlugin = {
  name: 'watch-plugin',
  setup(build) {
    build.onStart(() => {
      console.log('[esbuild] Build started...');
    });
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error(`[esbuild] Build failed: ${result.errors.length} errors`);
      } else {
        console.log('[esbuild] Build complete');
      }
    });
  },
};

// Extension build configuration (Node.js)
const extensionConfig = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: !production,
  minify: production,
  plugins: [watchPlugin],
};

// Webview build configuration (Browser)
const webviewConfig = {
  entryPoints: {
    request: 'src/webview/request/index.ts',
    sidebar: 'src/webview/sidebar/index.ts',
    'cookie-manager': 'src/webview/cookie-manager/index.ts',
    'environment-manager': 'src/webview/environment-manager/index.ts',
    'collection-manager': 'src/webview/collection-manager/index.ts'
  },
  bundle: true,
  outdir: 'dist/webview',
  format: 'esm',
  platform: 'browser',
  sourcemap: !production,
  minify: production,
  loader: {
    '.ttf': 'file'
  },
  define: {
    global: 'globalThis'
  },
  plugins: [watchPlugin],
};



async function build() {
  try {
    if (watch) {
      // Watch mode for development
      const extensionCtx = await esbuild.context(extensionConfig);
      const webviewCtx = await esbuild.context(webviewConfig);

      await Promise.all([
        extensionCtx.watch(),
        webviewCtx.watch()
      ]);

      console.log('[esbuild] Watching for changes...');
    } else {

      // Single build
      await Promise.all([
        esbuild.build(extensionConfig),
        esbuild.build(webviewConfig)
      ]);

      console.log('[esbuild] Build complete');
    }
  } catch (err) {
    if (err.errors) {
      err.errors.forEach(e => console.error(`[esbuild] Error: ${e.text} (${e.location?.file}:${e.location?.line})`));
    } else {
      console.error('[esbuild] Build failed:', err);
    }
    process.exit(1);
  }
}


build();
