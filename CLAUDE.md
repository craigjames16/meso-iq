# MesoIQ

React Native 0.83 (TypeScript) client for the MesoIQ workout tracker. The API lives in a separate repo.

## Redesign in progress

A full UI redesign is specified in [`docs/redesign/README.md`](docs/redesign/README.md). Read it before you change any screen, component or theme file. It defines the phases, the conventions and the definition of done.

## Checks

Run these before each commit:

```sh
npx tsc --noEmit
npm run lint
npm test
```
