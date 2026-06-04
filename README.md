# Transposable Playlists

A web application to manage and play YouTube playlists with real-time pitch shifting.

## Audio Proxy Troubleshooting

If you encounter a "Sign in to confirm you're not a bot" error from YouTube, the proxy server's IP has likely been flagged. You can bypass this by providing YouTube cookies.

### Option 1: Using `cookies.txt`
1. Export your YouTube cookies from your browser using an extension like "Get cookies.txt LOCALLY" or similar.
2. Save the file as `cookies.txt` in the root of this project.
3. Restart the proxy. The server is configured to automatically detect and use this file.

### Option 2: Using Environment Variables
You can also specify the cookies file or a browser to extract cookies from via environment variables:

- `YT_DLP_COOKIES`: Path to your cookies file.
- `YT_DLP_COOKIES_FROM_BROWSER`: Name of the browser to extract cookies from (e.g., `chrome`, `firefox`, `safari`). Note: This only works if the browser is installed on the same machine as the proxy.

### Docker Usage
If running via Docker, you can mount your `cookies.txt` file:
```bash
docker run -v $(pwd)/cookies.txt:/usr/src/app/cookies.txt ...
```

## React + TypeScript + Vite
...
Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
