<div align="center">
  <img src="./docs/slu-logo.svg" width="64" height="64" alt="SLU logo"/>
  &nbsp;&nbsp;
  <img src="./docs/planeat-logo.png" width="244.74" height="64" alt="Plan'Eat logo"/>
</div>

# Sustainability Assessment of Foods and Diets (SAFAD)

A web-based implementation of the SAFAD model developed by [Röös et al.
(2025)](https://doi.org/10.1016/j.jclepro.2025.146002) to benchmark
environmental impacts of diets.

> Röös, E., Jacobsen, M., Karlsson, L., Wanecek, W., Spångberg, J., Mazac, R.,
> & Rydhmer, L. (2025). Introducing a comprehensive and configurable tool for
> calculating environmental and social footprints for use in dietary
> assessments. Journal of Cleaner Production, 519, 146002.
> https://doi.org/10.1016/j.jclepro.2025.146002

## Data sources

SAFAD consolidates a number of data sets to assess the sustainability of foods
and diets. For some indicators, we have needed to draw on different data sets
for different crops and different countries.

### Environmental footprinting

For detailed source data on N fertiliser, P fertiliser, Pesticides, Field
operations, and Emissions factors, see tab "Sources" under individual excel
files.

- Crop blue-water footprint from [Mialyk et al. (2024)](https://doi.org/10.1038/s41597-024-03051-3)
  (see file `national_wf_175_crops_annual_1990_2019.csv`)
- Land-use change data from [DeDuCE model](https://deforestationfootprint.earth/)
  by [Sigh et al. (2026)](https://doi.org/10.5281/zenodo.18953516)
- Biodiversity data from [Scherer et al. (2023)](https://doi.org/10.1021/acs.est.3c04191)
- Trade data provided by Thomas Kastner (thomas.kastner@senckenberg.de), last
  updated 2026-06-23. See [Kasnter et al.
  (2011)](https://doi.org/10.1016/j.ecolecon.2011.01.012) and [Laroche et al.
  (2020)](https://doi.org/10.1016/j.gloenvcha.2020.102066) for methods.
- Rice methane emissions: FAOSTAT (per-country rice total emissions CH4 divided
  by per-country rice production data)


### Crop data
- Crop yields: FAOSTAT for majority of crops, Eurostat for greenhouse-grown
  crops, and Swedish Board of Agriculture for specific greenhouse-grown crops.

### Overall
- Waste data
-


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
processes, and packaging.
- [input-files-parsers.ts](./src/lib/input-files-parsers.ts): Parsing of csv
files to internal data formats. Useful to see which columns are used.
- [impact-csv-utils.ts](./src/lib/impacts-csv-utils.ts): Converting the internal
representations of results to csv-files, where e.g. headings are set and
columns defined.
- [ResultsEngine.ts](./src/lib/ResultsEngine.ts): Strings together most of the
logic to compute impacts of foods.
- [origin-waste-row-factors.ts](./src/lib/origin-waste-row-factors.ts):

One way to better understand what is going on in each file may be to look at the
test files (same names, but ending with `.test.ts` instead of just `.ts`).

## Technologies

The front-end uses [Vue](vuejs.org/) as the main framework, together with
TypeScript. These tools all require a working installation of
[node](https://nodejs.org/en) and a package-management system (e.g. npm,
included when installing node).

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
