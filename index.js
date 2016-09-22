'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var glob = require( 'glob' );

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
    this.binPaths = this.config.binPaths || {}; // "./node_modules/bs-platform/bin";
    this.binPaths.bsc = this.binPaths.bsc ||
      this.retIfFileIsExecutable(path.posix.join("node_modules", "bs-platform", "bin", "bsc.exe")) ||
      "bsc.exe";
    this.binPaths.bsppx = this.binPaths.bsppx ||
      this.retIfFileIsExecutable(path.posix.join("node_modules", "bs-platform", "bin", "bsppx.exe")) ||
      "bsppx.exe";
    this.binPaths.ocamldep = this.binPaths.ocamldep || "ocamldep";
    this.bscCwd = this.config.bscCwd || null; // null is the project root directory
    this.tempOutputFolder = this.config.tempOutputFolder || "tmp"
    this.compileAllAtOnce = this.config.compileAllAtOnce || false;
    this.bscParameters = this.config.bscParameters || [];
    this.globIgnore = this.config.globIgnore || "node_modules/**/*";

    // Resolve paths:
    this.binPaths.bsc = path.resolve(this.binPaths.bsc);
    this.binPaths.bsppx = path.resolve(this.binPaths.bsppx);
    this.binPaths.ocamldep = path.resolve(this.binPaths.ocamldep);
  }

  retIfFileIsExecutable(path, ret) {
    try {
      fs.accessSync(path, fs.X_OK);
      if(!ret) return path;
      return ret;
    } catch (error) {
      return undefined;
    }
  }

  // Called before every compilation. Stops it when the error is returned.  TODO:  Maybe use an ocaml linter here?
  // lint(data, path, callback) {console.log("lint", data, path, callback); callback(null, true); }

  // // Allows Brunch to calculate dependants of the file and re-compile them too.
  // // Examples: SASS '@import's, Jade 'include'-s.
  getDependencies(data, path, callback) {
    // console.log("getDependencies", /*data,*/ path, callback);
    var inFile = path;

    if(this.bscCwd !== null) {
      var cwdTerm = path.posix.join(this.bscCwd, "i").slice(0, -1);
      if(!inFile.startsWith(cwdTerm)) {
        // console.log("External ml file ignored due to not being on the working path", inFile);
        // return callback(null, "");
        return callback(filedata.path + " is not in the supported cwd path", "");
      }
      inFile = inFile.substring(cwdTerm.length);
    }

    const ocamldep = this.binPaths.ocamldep;
    const bsppx = this.binPaths.bsppx;
    var command = ocamldep + ' -ppx "' + bsppx + '" "' + inFile + '"';

    var info = 'Bucklescript dependencies check: ' + command;
    console.log(info);

    try {
      childProcess.exec(command, {cwd: this.bscCwd}, (error, stdout, stderr) => {
        if(stderr) console.log(stderr);
        if(error) callback(error, "");
        else {
          if(stderr != "") callback(stderr, "");
          else {
            console.log("TODO:  deps", stdout);
            callback(null, []);
          }
        }
      })
    } catch (error) {
      callback(error, "");
    }
  }

  doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, callback) {
    var executable = binPaths.bsc;
    var command = '"' + executable + '" "' + params.join('" "') + '"';

    var info = 'Bucklescript compile: ' + command;
    console.log(info);

    try {
      childProcess.exec(command, {cwd: bscCwd}, (error, stdout, stderr) => {
        if(stderr) console.log(stderr);
        if(error) callback(error, "");
        else {
          var js_filename = inFile.substr(0, inFile.lastIndexOf(".")) + ".js"
          fs.readFile(path.posix.join(tempOutputFolder, js_filename), "utf-8", (err, data) => {
            if(err) callback(err, "");
            else callback(null, data);
          });
        }
      })
    } catch (error) {
      callback(error, "");
    }
  }

  compile(filedata, callback) {
    var inFile = filedata.path;

    if(this.bscCwd !== null) {
      var cwdTerm = path.posix.join(this.bscCwd, "i").slice(0, -1);
      if(!inFile.startsWith(cwdTerm)) {
        // console.log("External ml file ignored due to not being on the working path", inFile);
        // return callback(null, "");
        console.log("Blah", filedata.path, inFile, cwdTerm, this.bscCwd);
        return callback(filedata.path + " is not in the supported cwd path", "");
      }
      inFile = inFile.substring(cwdTerm.length);
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
      .concat(["-bs-files"]); // -bs-files must remain last

    const binPaths = this.binPaths;
    const bscCwd = this.bscCwd;
    const tempOutputFolder = this.tempOutputFolder;
    const doCompile = this.doCompile;
    const globIgnore = this.globIgnore;

    if(this.compileAllAtOnce) {
      var glob_opts = {};
      glob_opts.nosort = true;
      // glob_opts.nonull = true;
      glob_opts.ignore = globIgnore;
      if(bscCwd) glob_opts.cwd = bscCwd;
      glob("**/*.{ml,mli}", glob_opts, function (er, files) {
        if(er) callback(er, "");
        else {
          params = params.concat(files);

          doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, callback);
        }
      });
    }
    else {
      params = params.concat([inFile]);
      if(inFile.endsWith(".ml")) {
        const inFileI = inFile + "i";
        const base = this.bscCwd || "";
        if(fsExistsSync(path.posix.join(base, inFileI))) {
          params = params.concat([inFileI]);
        }
      }
      doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, callback);
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
