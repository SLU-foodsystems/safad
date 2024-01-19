# SLU SAFAD

| Sustainability Assessment of Foods and Diets

A web-based implementation of the SAFAD model developed by Röös et al. (in
press) to benchmark sustainability impacts of diets.

## Project Structure

The project relies on extensive processing of the input data, some of which can
be found in the `./data-preprocessing/` directory. The majority, however, are
internal R-scripts and excel documents, as described in the above-mentioned
paper.

The implementation of the website, along with [the input
files](./src/default-input-files/) can be found in the [`./src/`](./src/)
directory, with the main logic being inside the [`./src/lib/`](./src/lib)
folder.

Some important files are:

- [rpc-reducer.ts](./src/lib/rpc-reducer.ts): The logic that breaks down a food
to its fundamental ingredients (and their amounts), along with transport,
processes, and packeting.
- [impact-csv-utils.ts](./src/lib/impacts-csv-utils.ts):
- [ResultsManager.ts](./src/lib/ResultsManager.ts):
- [input-files-parsers.ts](./src/lib/input-files-parsers.ts):
- [origin-waste-row-factors.ts](./src/lib/origin-waste-row-factors.ts):

One way to better understand what is going on in each file may be to look at the
test files (same names, but ending with `.test.ts` instead of just `.ts`).

## Technologies

The front-end uses [Vue](vuejs.org/) as the main framework, together with
TypeScript. These tools all require Node.js and a package-management system
(e.g. npm).

### Tooling

#### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) +
[Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and
disable Vetur) + [TypeScript Vue Plugin
(Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

#### Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run tests

```sh
npm run test
```
