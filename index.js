'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

function fsExistsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

// Documentation for Brunch plugins:
// https://github.com/brunch/brunch/blob/master/docs/plugins.md

// Remove everything your plugin doesn't need.
class BucklescriptBrunchPlugin {
  constructor(config) {
    // Replace 'plugin' with your plugin's name;
    this.config = config && config.plugins && config.plugins.bucklescriptBrunch;
    this.binPath = this.config.binPath || ""; // "./node_modules/bs-platform/bin";
    this.bscCwd = this.config.bscCwd || null; // null is the project root directory
    this.tempOutputFolder = this.config.tempOutputFolder || "tmp"
    this.bscParameters = this.config.bscParameters || [];
  }

  // Called before every compilation. Stops it when the error is returned.  TODO:  Maybe use an ocaml linter here?
  // lint(data, path, callback) {console.log("lint", data, path, callback); callback(null, true); }

  // // Allows Brunch to calculate dependants of the file and re-compile them too.
  // // Examples: SASS '@import's, Jade 'include'-s.
  getDependencies(data, path, callback) {
    // console.log("getDependencies", /*data,*/ path, callback);
    // if(path.endsWith(".ml") && fsExistsSync(path+"i")) callback(null, [path+"i"]);
    // else callback(null, []);
    callback(null, []);
  }

  compile(filedata, callback) {
    var inFile = filedata.path;

    if(this.bscCwd !== null) {
      if(!inFile.startsWith(this.bscCwd)) {
        console.log("External ml file ignored due to not being on the working path", inFile);
        return callback(null, "");
      }

      inFile = inFile.substring(this.bscCwd.length + 1);
    }

    var params = this.bscParameters
      .concat(["-c"])
      .concat(["-bs-package-name", "bucklescript"])
      // It is not relative to the cwd in 'package' mode, which the above command causes, but
      // rather it is relative to the 'package' root, I.E. 'package.json'
      // .concat(["-bs-package-output", path.relative(this.bscCwd, this.tempOutputFolder)])
      // .concat(["-o", path.relative(this.bscCwd, this.tempOutputFolder)])
      .concat(["-bs-package-output", this.tempOutputFolder])
      .concat(["-o", this.tempOutputFolder])
      .concat(["-bs-files", inFile]); // -bs-files must remain last

    if(inFile.endsWith(".ml")) {
      const inFileI = inFile + "i";
      const base = this.bscCwd || "";
      if(fsExistsSync(path.join(base, inFileI))) {
        params = params.concat([inFileI]);
      }
    }

    var executable = path.join(this.binPath, 'bsc');
    var command = executable + ' ' + params.join(' ');

    var info = 'Bucklescript compile: ' + command;
    console.log(info);

    try {
      childProcess.exec(command, { cwd: this.bscCwd }, (error, stdout, stderr) => {
        if(stderr) console.log(stderr);
        if(error) callback(error, "");
        else {
          var js_filename = inFile.substr(0, inFile.lastIndexOf(".")) + ".js"
          fs.readFile(path.join(this.tempOutputFolder, js_filename), "utf-8", (err, data) => {
            if(err) callback(err, "");
            else callback(null, data);
          });
        }
      })
    } catch (error) {
      callback(error, "");
    }
  }
}

// Required for all Brunch plugins.
BucklescriptBrunchPlugin.prototype.brunchPlugin = true;

// Required for compilers, linters & optimizers.
// 'javascript', 'stylesheet' or 'template'
BucklescriptBrunchPlugin.prototype.type = 'javascript';

// Required for compilers & linters.
// It would filter-out the list of files to operate on.
// BucklescriptBrunchPlugin.prototype.extension = 'js';
// BucklescriptBrunchPlugin.prototype.pattern = /\.mli?$/;
BucklescriptBrunchPlugin.prototype.pattern = /\.ml$/;

// Indicates which environment a plugin should be applied to.
// The default value is '*' for usual plugins and
// 'production' for optimizers.
// BucklescriptBrunchPlugin.prototype.defaultEnv = 'production';

module.exports = BucklescriptBrunchPlugin;
