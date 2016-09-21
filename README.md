# bucklescript-brunch

[Brunch](http://brunch.io) plugin to compile [Bucklescript](https://bloomberg.github.io/bucklescript/) code

# Install Bucklescript

Official NPM installation:

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
      // The path to the Bucklescript binary directory.
      // If installed globally than "" is fine, else if
      // installed inside project then something like
      // "./node_modules/bs-platform/bin" or so.
      // (optional)
      binPath: "",

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

      // Parameters to the bsc application (required)
      // A list of string arguments, you will need to
      // escape the parameters as usual for a shell.
      // (optional)
      bscParameters: [
      ], // example:  [ "-bs-cross-module-opt" ]
    }
  }
```
