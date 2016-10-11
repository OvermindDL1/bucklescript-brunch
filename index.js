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
    this.verbosity = (this.config.verbosity === undefined) ? 1 : this.config.verbosity;
    this.binPaths = this.config.binPaths || {}; // "./node_modules/bs-platform/bin";
    this.binPaths.bsc = this.binPaths.bsc ||
      this.retIfFileIsExecutable(path.posix.join("node_modules", "bs-platform", "bin", "bsc.exe")) ||
      "bsc.exe";
    this.binPaths.bsppx = this.binPaths.bsppx ||
      this.retIfFileIsExecutable(path.posix.join("node_modules", "bs-platform", "bin", "bsppx.exe")) ||
      "bsppx.exe";
    // this.binPaths.ocamldep = this.binPaths.ocamldep || "ocamldep";
    this.binPaths.ocamldep = this.binPaths.ocamldep ||
      this.retIfFileIsExecutable(path.posix.join("node_modules", "bs-platform", "bin", "bsdep.exe")) ||
      "bsdep.exe";
    this.bscCwd = this.config.bscCwd || null; // null is the project root directory
    this.tempOutputFolder = this.config.tempOutputFolder || "tmp"
    this.compileAllAtOnce = this.config.compileAllAtOnce || false;
    this.disableDepCheck = this.config.compileAllAtOnce || false;
    this.bscParameters = this.config.bscParameters || [];
    this.globIgnore = this.config.globIgnore || "node_modules/**/*";

    // Resolve paths:
    this.binPaths.bsc = (this.binPaths.bsc=="bsc.exe") ? this.binPaths.bsc : path.resolve(this.binPaths.bsc);
    this.binPaths.bsppx = (this.binPaths.bsppx=="bsppx.exe") ? this.binPaths.bsppx : path.resolve(this.binPaths.bsppx);
    // this.binPaths.ocamldep = (this.binPaths.ocamldep=="ocamldep") ? this.binPaths.ocamldep : path.resolve(this.binPaths.ocamldep);
    this.binPaths.ocamldep = (this.binPaths.ocamldep=="bsdep.exe") ? this.binPaths.ocamldep : path.resolve(this.binPaths.ocamldep);

    // Internal caches
    this.pendingCompiles = [];
    this.compileds = {};
    this.isCompiling = 0;
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

  getFilepathWithoutBscCwd(filepath) {
    // filepath = path.posix.join(filepath);
    if(this.bscCwd !== null) {
      var cwdTerm = path.posix.join(this.bscCwd, "i").slice(0, -1);
      if(!filepath.startsWith(cwdTerm)) {
        return undefined;
      }
      return filepath.substring(cwdTerm.length);
    }
    else return filepath;
  }

  getFilenameWithNewExt(filename, newExt) {
    const ext = path.extname(filename);
    return filename.slice(0,-ext.length) + newExt;
  }

  parseOcamlDepOutput(output) {
    const verbosity = this.verbosity;
    const deps = {
      dependentsOf: {},
      dependsOf: {}
    };
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if(verbosity > 4) console.log("Output:", line);
      const [key, value] = line.split(/:/, 2);
      if(key.length>0 && value !== undefined && value.length>0) {
        const file = this.getFilenameWithNewExt(key, '.ml');
        deps.dependsOf[file] = deps.dependsOf[file] || {};
        deps.dependentsOf[file] = deps.dependentsOf[file] || {};
        const dependsOn = value.trim().split(/ /);
        if(verbosity > 4) console.log("K", key);
        if(verbosity > 4) console.log("V", '"', value, '"', value.length);
        if(verbosity > 4) console.log("D", dependsOn);
        for (const dep of dependsOn) {
          const depFile = this.getFilenameWithNewExt(dep, '.ml');
          deps.dependentsOf[depFile] = deps.dependentsOf[depFile] || {};
          deps.dependsOf[file][depFile] = true;
          deps.dependentsOf[depFile][file] = true;
        }
      }
    }
    return deps;
  }

  getDependsOf(fullInFile, callback) {
    const verbosity = this.verbosity;
    const inFile = this.getFilepathWithoutBscCwd(fullInFile);
    if(!inFile) {
      callback("Invalid file given to depends of: "+fullInFile, "");
      return;
    }
    // callback("'getDependsOf' is not implemented!", []);
    const self = this;
    const bscCwd = this.bscCwd;
    const binPaths = this.binPaths;
    const ocamldep = binPaths.ocamldep;
    const bsppx = binPaths.bsppx;
    const command = '"' + ocamldep + '" "-one-line" "-ppx" "' + bsppx + '" "' + inFile + '"';

    const info = 'Bucklescript depends check: ' + command;
    if(verbosity > 2) console.log(info);

    try {
      childProcess.exec(command, {cwd: bscCwd}, (error, stdout, stderr) => {
        if(stderr) if(verbosity > 0) console.log(stderr);
        if(error) callback(error, "");
        else {
          if(stderr != "") callback(stderr, "");
          else {
            const deps = self.parseOcamlDepOutput(stdout);
            if(verbosity > 3)  console.log("Possible deps of:", inFile, deps);
            if(deps.dependsOf[inFile]) callback(null, Object.keys(deps.dependsOf[inFile]));
            else callback(null, []);
          }
        }
      })
    } catch (error) {
      if(verbosity > 3) console.log("DEPS ERRORS", error);
      callback(error, "");
    }
  }

  getDependentsOf(fullInFile, callback) {
    const verbosity = this.verbosity;
    const inFile = this.getFilepathWithoutBscCwd(fullInFile);
    if(!inFile) {
      callback("Invalid file given to dependents of: "+fullInFile, "");
      return;
    }
    const self = this;
    const binPaths = this.binPaths;
    const bscCwd = this.bscCwd;
    const tempOutputFolder = this.tempOutputFolder;
    const doCompile = this.doCompile;
    const globIgnore = this.globIgnore;
    var glob_opts = {};

    glob_opts.nosort = true;
    glob_opts.ignore = globIgnore;
    if(bscCwd) glob_opts.cwd = bscCwd;
    glob("**/*.{ml,mli}", glob_opts, function (err, files) {
      if(err) callback(err, []);
      else if (files.length == 0) callback("No Source Files found during dependency check", [])
      else {
        // ocamldep does the inverse of the dependency check that we want here, rather we want to see what other files
        // need to be compiled once this one is compiled...  So we grab all files then see what depends on 'this'
        if(verbosity > 4) console.log("Deps files to check:", files);

        const ocamldep = binPaths.ocamldep;
        const bsppx = binPaths.bsppx;
        const command = '"' + ocamldep + '" "-one-line" "-ppx" "' + bsppx + '" "' + files.join('" "') + '"';

        const info = 'Bucklescript dependents check: ' + command;
        if(verbosity > 1) console.log(info);

        try {
          childProcess.exec(command, {cwd: bscCwd}, (error, stdout, stderr) => {
            if(verbosity > 4) console.log("DEPS CHECK:", error, stdout, stderr);
            if(stderr) if(verbosity > 0) console.log("DepCheck Error of", inFile, ":", stderr);
            if(error) callback(error, "");
            else {
              if(stderr) callback(stderr, "");
              else {
                const deps = self.parseOcamlDepOutput(stdout);
                if(verbosity > 3) console.log("Deps of:", inFile, deps);
                if(deps.dependentsOf[inFile]) callback(null, Object.keys(deps.dependentsOf[inFile]));
                else callback(null, []);
              }
            }
          })
        } catch (error) {
          if(verbosity > 3) console.log("DEPS ERRORS", error);
          callback(error, "");
        }
      }
    });
  }

  // // Allows Brunch to calculate dependants of the file and re-compile them too.
  // // Examples: SASS '@import's, Jade 'include'-s.
  getDependencies(data, filepath, callback) {
    const verbosity = this.verbosity;
    if(this.disableDepCheck) {
      callback(null, []);
    }
    else if(this.compileAllAtOnce) {
      const inFile = this.getFilepathWithoutBscCwd(fullInFile);
      const bscCwd = this.bscCwd;
      const globIgnore = this.globIgnore;
      var glob_opts = {};
      glob_opts.nosort = true;
      glob_opts.ignore = globIgnore;
      if(bscCwd) glob_opts.cwd = bscCwd;
      glob("**/*.{ml,mli}", glob_opts, function (err, files) {
        if(err) callback(err, []);
        else {
          var idx = files.indexOf(inFile);
          if(idx >= 0) files = files.splice(idx, 1);
          callback(null, files.map(p => path.posix.join(bscCwd, p)));
        }
      });
    }
    else {
      const bscCwd = this.bscCwd;
      //this.getDependentsOf(filepath, function (err, files) {
      this.getDependsOf(filepath, function (err, files) {
        if(err) callback(err, []);
        else {
          callback(null, files.map(p => path.posix.join(bscCwd, p)));
        }
      });
    }
  }

  doGetJavascript(inFile, folder, callback) {
    var js_filename = inFile.substr(0, inFile.lastIndexOf(".")) + ".js"
    fs.readFile(path.posix.join(folder, js_filename), "utf-8", callback);
  }

  doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, callback) {
    var self = this;
    const verbosity = this.verbosity;
    var compileds = this.compileds;
    var executable = binPaths.bsc;
    var command = '"' + executable + '" "' + params.join('" "') + '"';

    var info = 'Bucklescript compile: ' + command;
    if(verbosity > 1) console.log(info);

    try {
      childProcess.exec(command, {cwd: bscCwd}, (error, stdout, stderr) => {
        if(stderr) if(verbosity > 0) console.log("Compile Issues of", inFile, ":\n" + stderr);
        if(error) {
          compileds[inFile] = false;
          callback(error, "");
        }
        else {
          self.doGetJavascript(inFile, tempOutputFolder, (err, data) => {
            if(err) {
              compileds[inFile] = false;
              callback(err, "");
            }
            else {
              compileds[inFile] = true;
              callback(null, data);
            }
          });
        }
      })
    } catch (error) {
      compileds[inFile] = false;
      callback(error, "");
    }
  }

  getMissingDeps(deps) { // TODO:  Need to check for recursive dependencies
    var compileds = this.compileds;
    // console.log("getMissingDeps", deps, compileds);
    var ret = [];
    for (var dep of deps) {
      if(compileds[dep] === undefined) ret.push(dep);
    }
    return ret;
  }

  doDepCompile(fullInFile, inFile, params, binPaths, callback) {
    const tempOutputFolder = this.tempOutputFolder;
    var self = this;
    var bscCwd = this.bscCwd;
    var compileds = this.compileds;
    var pendingCompiles = this.pendingCompiles;
    var verbosity = this.verbosity;

    if(verbosity > 2) console.log("doDepCompile", fullInFile, inFile);
    self.getDependsOf(fullInFile, function (err, files) { // Always re-run this so it is up-to-date
      if(verbosity > 2) console.log("Dependency Check During compile:", inFile, compileds, pendingCompiles, err, files);
      if(err) {
        compileds[inFile] = false; // File cannot be compiled, syntax error or so...
        callback(err, "");
      }
      else {
        var missingDeps = self.getMissingDeps(files);
        if(missingDeps.length>0) {
          if(verbosity > 1) console.log("Dependencies of", fullInFile, "have not been compiled in this session, waiting for", missingDeps, "before trying again.");
          pendingCompiles.push(function depCheckFunc() {
            var missingDeps = self.getMissingDeps(files);
            if(missingDeps.length>0) pendingCompiles.push(depCheckFunc);
            else self.doDepCompile(fullInFile, inFile, params, binPaths, callback);
          })
        }
        else {
          params = params.concat([inFile]);
          if(inFile.endsWith(".ml")) {
            const inFileI = inFile + "i";
            const base = bscCwd || "";
            if(fsExistsSync(path.posix.join(base, inFileI))) {
              params = params.concat([inFileI]);
            }
          }
          self.doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, function(error, output) {
            // compileds[inFile] = (error === undefined);
            // console.log("=========== Compiled Output", inFile, error);
            if(error) callback(error, "")
            else callback(null, output);
            const len = pendingCompiles.length;
            for (var i = 0; i < len; i++) {
              var cb = pendingCompiles.shift();
              if(cb) cb();
            }
          });
        }
      }
    });
  }

  compile(filedata, callback) {
    const verbosity = this.verbosity;
    const fullInFile = filedata.path;
    var inFile = fullInFile;

    if(this.bscCwd !== null) {
      var cwdTerm = path.posix.join(this.bscCwd, "i").slice(0, -1);
      if(!inFile.startsWith(cwdTerm)) {
        if(verbosity > 1)  console.log("External ml file ignored due to not being on the working path", inFile);
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

    const self = this;
    const binPaths = this.binPaths;
    const bscCwd = this.bscCwd;
    const tempOutputFolder = this.tempOutputFolder;
    const globIgnore = this.globIgnore;

    if(this.compileAllAtOnce) {
      var glob_opts = {};
      glob_opts.nosort = true;
      // glob_opts.nonull = true;
      glob_opts.ignore = globIgnore;
      if(bscCwd) glob_opts.cwd = bscCwd;
      if(self.isCompiling > 0) {
        self.pendingCompiles.push((error) => {
          if(error) callback(error, "");
          else self.doGetJavascript(inFile, tempOutputFolder, (err, data) => {
            if(err) callback(err, "");
            else callback(null, data);
          });
        });
        self.isCompiling += 1;
      }
      else {
        self.isCompiling += 1; // Thankfully javascript has a global lock as far as I've seen...  I hope...
        glob("**/*.{ml,mli}", glob_opts, function (er, files) {
          if(er) callback(er, "");
          else {
            params = params.concat(files);

            self.doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, function compileCB(error, js) {
              if(self.isCompiling > 1) {
                self.isCompiling = 1;
                self.doCompile(inFile, binPaths, params, bscCwd, tempOutputFolder, compileCB);
              }
              else {
                self.isCompiling = 0;
                while(self.pendingCompiles.length > 0) {
                  var cb = self.pendingCompiles.shift();
                  // console.log("Pending compile:", cb);
                  if(cb) cb(error);
                }
                if(error) callback(error, "");
                else {
                  callback(null, js);
                }
              }
            });
          }
        });
      }
    }
    else {
      this.doDepCompile(fullInFile, inFile, params, binPaths, callback)
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
