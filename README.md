# bucklescript-brunch

[Brunch](http://brunch.io) plugin to compile [Bucklescript](https://bloomberg.github.io/bucklescript/) code

# Install Bucklescript

## Bucklescript prerequisites

Bucklescript is a back-end for the OCaml compiler, thus OCaml needs to be properly installed and operational first.

If on linux or mac then from the repositories is fine, at least version 4.02.3 is best. If on Windows then one of the most reliably working ones is the cygwin one (which installs into or includes a copy of cygwin based on how you install it), others may work but have been iffy, if anyone tests any that do work on Windows with bs-platform official install then please report back with those and their links.

You can acquire the Windows cygwin variant at: <https://fdopen.github.io/opam-repository-mingw/>

## Official NPM installation:

Globally:

```bash
npm install -g bs-platform
```

Or per project:

```bash
npm install --save bs-platform
```

# Install bucklescript-brunch

```
npm install --save bucklescript-brunch
```

# Configuration

Inside your brunch-config.js (or equivalent) file:

```javascript
  plugins: {
    ...
    bucklescriptBrunch: {
      binPaths: {
        // This defaults to the bsc in bs-platform in the local node_modules directory if it exists, else falls
        // back to a global bsc.
        // (optional)
        bsc: "<path-to-bsc>",

        // This defaults to the bsppx in bs-platform in the local node_modules directory if it exists, else falls
        // back to a global bsppx.
        // (optional)
        bsppx: "<path-to-bsppx>",

        // This defaults to a global ocamldep on the $PATH unless bsdep exists in bs-platform,
        // please make sure that OCaml is on the path otherwise.
        // (optional)
        ocamldep: "<path-to-ocamldep>",
        
        // This defaults to a global ocamlfind on the $PATH, please make sure that OCaml is on the path.
        // (optional)
        ocamlfind: "<path-to-ocamlfind>"
      },

      // The base working directory for the bsc source
      // files, defaults to the base directory
      // (optional)
      bscCwd: null, // Example:  "src"

      // A directory that should not be watched by Brunch.
      // Optional if you want to commit or not as it will
      // contain the generated javascript from bucklescript
      // if you wish to look over it, but it should not be
      // included in the compiled javascript list.
      // Defaults to "tmp", so just add a /tmp to your
      // .gitignore file or so to ignore it if it should
      // not be committed.
      // (optional)
      tempOutputFolder: "tmp",

      // If true then anytime a file is changed then all
      // are recompiled, however only the change one is
      // output to javascript, so if a dependent is broken
      // due to another then it will still need to be
      // re-saved after as well in `watch` mode.  however,
      // this is highly useful for on-demand building as
      // there are no dependency issues then.
      // (optional)
      compileAllAtOnce: false,

      // When compileAllAtOnce is true then this will ignore
      // the defined glob:
      // (optional)
      globIgnore: "node_modules/**",

      // Parameters to the bsc application (required)
      // A list of string arguments.
      // (optional)
      bscParameters: [
      ], // example:  [ "-bs-cross-module-opt" ]
      
      // A list of PPX's that will be found and included via
      // ocamlfind.
      // (optional)
      ppxs: [
      ], // example:  [ "ppx-deriving" ]

      // Verbosity of output, all higher verbosity
      //   inclused the reporting of the earlier.
      // 0 turns off all output, even file errors.
      // 1 shows file errors, this is the default.
      // 2 shows commands used to compile and files
      //   that are out of the path.
      // 3 shows when a file fails compilation
      //   because its dependencies need to be
      //   recompiled, which then happens.
      // 4 includes dependency information output
      //   of source files to see what depends on
      //   what.
      // 5 Full debug output, this shows the state
      //   of various calls, commands, everything.
      verbosity: 1
    }
  }
```
