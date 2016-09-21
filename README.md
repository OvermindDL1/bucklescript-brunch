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

Inside your brunch-config.js (or equivalant) file:

```javascript
  plugins: {
    ...
    bucklescriptBrunch: {
      // The path to the Bucklescript binary directory.
      // If installed globally than "" is fine, else if
      // installed inside project then something like
      // "./node_modules/bs-platform/bin" or so.
      binPath: "",

      // The base working directory for the bsc source
      // files, defaults to the base directory (required)
      bscCwd: null, // Example:  "src"

      // Parameters to the bsc application (required)
      // A list of string arguments, you will need to
      // escape the parameters as usual for a shell
      bscParameters: [
        ...
      ],
    }
  }
```
