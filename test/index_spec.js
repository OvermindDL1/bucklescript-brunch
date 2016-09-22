var chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect
  , path = require('path');

chai.use(sinonChai);

var BucklescriptCompiler = require('../index')
  , exec
  , readFile;

describe('BucklescriptCompiler', function (){
  var bucklescriptCompiler
    , baseConfig = {
        paths: {
          public: 'test/public/folder'
        },
        plugins: {
          bucklescriptBrunch: {}
        }
      }
    , bscFullPath = path.resolve(path.posix.join("node_modules", "bs-platform", "bin", "bsc.exe"))
    , bscPosixPath = path.posix.join("node_modules", "bs-platform", "bin", "bsc.exe");


  describe('plugin', function () {
    beforeEach(function () {
      bucklescriptCompiler = new BucklescriptCompiler(baseConfig);
    });

    it('is an object', function () {
      expect(bucklescriptCompiler).to.be.ok;
    });

    it('has a #compile method', function () {
      expect(bucklescriptCompiler.compile).to.be.an.instanceof(Function);
    });
  });


  describe('bucklescript config', function () {
    describe('binPaths', function () {
      describe('bsc', function () {
        beforeEach(function () {
          bucklescriptCompiler = new BucklescriptCompiler(baseConfig);
        });

        it('is in node_modules', function () {
          expect(bucklescriptCompiler.binPaths.bsc).to.equal(bscFullPath);
        });
      });
    });

    describe('bscParameters', function () {
      describe('when no bscParameters are not specified', function () {
        beforeEach(function () {
          bucklescriptCompiler = new BucklescriptCompiler(baseConfig);
        });

        it('defaults to an empty list', function () {
          expect(bucklescriptCompiler.bscParameters).to.be.empty;
        });
      });

      describe('when some bscParameters are specified', function () {
        var bscParameters = ['-unsafe'];

        beforeEach(function () {
          config = JSON.parse(JSON.stringify(baseConfig));
          config.plugins.bucklescriptBrunch.bscParameters = bscParameters;
          bucklescriptCompiler = new BucklescriptCompiler(config);
        });

        it('uses the specified bscParameters', function () {
          expect(bucklescriptCompiler.bscParameters).to.equal(bscParameters);
        });
      });
    });
  });


  describe('dependency testing Bucklescript', function () {
    var sampleConfig;

    beforeEach(function () {
      sampleConfig = JSON.parse(JSON.stringify(baseConfig));
      sampleConfig.plugins.bucklescriptBrunch.bscCwd = "test";
    });

    describe('file with no dependencies', function () {
      beforeEach(function () {
        config = JSON.parse(JSON.stringify(sampleConfig));
        bucklescriptCompiler = new BucklescriptCompiler(config);
      });

      it('should return an empty list', function (done) {
        var data = '';
        bucklescriptCompiler.getDependencies(data, "test/test_dep.ml", function(error, result) {
          expect(error).to.not.be.ok;
          expect(result).to.deep.equal([]);
          done();
        });
      });
    });

    describe('file with dependencies', function () {
      beforeEach(function () {
        config = JSON.parse(JSON.stringify(sampleConfig));
        bucklescriptCompiler = new BucklescriptCompiler(config);
      });

      it('should return a non-empty list', function (done) {
        var data = '';
        // test_dep.ml depends on test.ml
        bucklescriptCompiler.getDependencies(data, "test/test.ml", function(error, result) {
          expect(error).to.not.be.ok;
          expect(result).to.deep.equal(["test/test_dep.ml"]);
          done();
        });
      });
    });
  });


  describe('compiling Bucklescript', function () {
    var childProcess = require('child_process')
      , fs = require('fs')
      , sampleConfig;

    beforeEach(function () {
      exec = sinon.stub(childProcess, 'exec');
      exec.callsArgWith(2, null, "Success childProcess.exec", "");

      readFile = sinon.stub(fs, 'readFile');
      readFile.callsArgWith(2, null, "Success fs.readFile");

      sampleConfig = JSON.parse(JSON.stringify(baseConfig));
    });

    afterEach(function () {
      readFile.restore();
      exec.restore();
    });

    describe('file by file', function () {
      var fileByFileConfig;

      beforeEach(function () {
        fileByFileConfig = JSON.parse(JSON.stringify(sampleConfig));
        fileByFileConfig.plugins.bucklescriptBrunch.compileAllAtOnce = false;
      });

      describe('with default configs otherwise', function () {
        beforeEach(function () {
          bucklescriptCompiler = new BucklescriptCompiler(fileByFileConfig);
        });

        it('should call compile successfully', function (done) {
          var data = '';
          expected = '"' + bscFullPath + '" "-c" "-bs-package-name" "bucklescript" "-bs-package-output" "tmp" "-o" "tmp" "-bs-files" "test/test.ml"';
          bucklescriptCompiler.compile({data, path: "test/test.ml"}, function(error) {
            expect(error).to.not.be.ok;
            expect(childProcess.exec).to.have.been.calledWith(expected, {cwd: null});
            done();
          });
        });
      });

      describe('when bscParameters is specified', function () {
        beforeEach(function () {
          var config = JSON.parse(JSON.stringify(fileByFileConfig));
          config.plugins.bucklescriptBrunch.bscParameters = ["-blah"];
          bucklescriptCompiler = new BucklescriptCompiler(config);
        });

        it('should call compile successfully', function (done) {
          var data = '';
          expected = '"' + bscFullPath + '" "-blah" "-c" "-bs-package-name" "bucklescript" "-bs-package-output" "tmp" "-o" "tmp" "-bs-files" "test/test.ml"';
          bucklescriptCompiler.compile({data, path: "test/test.ml"}, function(error) {
            expect(error).to.not.be.ok;
            expect(childProcess.exec).to.have.been.calledWith(expected, {cwd: null});

            done();
          });
        });
      });

      describe('when bscCwd is specified', function () {
        beforeEach(function () {
          config = JSON.parse(JSON.stringify(fileByFileConfig));
          config.plugins.bucklescriptBrunch.bscCwd = "test";
          bucklescriptCompiler = new BucklescriptCompiler(config);
        });

        it('should call compile successfully', function (done) {
          var data = '';
          expected = bscFullPath + ' -c -bs-package-name bucklescript -bs-package-output tmp -o tmp -bs-files test.ml';
          bucklescriptCompiler.compile({data, path: path.posix.join("test", "test.ml")}, function(error) {
            expect(error).to.not.be.ok;
            expect(fs.readFile).to.have.been.calledWith(path.posix.join("tmp", "test.js"), "utf-8");
            done();
          });
        });
      });
    });
  });
});
