import nextVitals from 'eslint-config-next/core-web-vitals'

export default [
  ...nextVitals, { files: ["src/lib/resend/templates/*.tsx"], rules: { "@next/next/no-head-element": "off" } },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
]
