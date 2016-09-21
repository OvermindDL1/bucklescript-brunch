var chai = require('chai')
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , expect = chai.expect;

chai.use(sinonChai);

var BucklescriptCompiler = require('../index')
  , execSync;

describe('BucklescriptCompiler', function (){
  var bucklescriptCompiler, baseConfig = {
        paths: {
          public: 'test/public/folder'
        },
        plugins: {
          bucklescriptBrunch: {}
        }
      };


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



  describe('compiling Bucklescript', function () {
    var childProcess = require('child_process')
      , sampleConfig;

    beforeEach(function () {
      exec = sinon.stub(childProcess, 'exec');

      sampleConfig = JSON.parse(JSON.stringify(baseConfig));
    });

    afterEach(function () {
      exec.restore();
    });

    describe('the initial run', function () {
      describe('when bscParameters is specified', function () {
        beforeEach(function () {
          config = JSON.parse(JSON.stringify(sampleConfig));
          config.plugins.bucklescriptBrunch.bscParameters = ["-blah"];
          bucklescriptCompiler = new BucklescriptCompiler(config);
        });

        it('should compile successfully', function () {
          var data = '';
          bucklescriptCompiler.compile({data, path: "test.ml"}, function(error) {
            expect(error).to.not.be.ok;
          });
          expected = 'bsc -blah -c -bs-package-name bucklescript -bs-package-output tmp -o tmp -bs-files test.ml';
          expect(childProcess.exec).to.have.been.calledWith(expected, {cwd: null});
        });
      });

      describe('when bscCwd is specified', function () {
        beforeEach(function () {
          config = JSON.parse(JSON.stringify(sampleConfig));
          config.plugins.bucklescriptBrunch.bscCwd = "src";
          bucklescriptCompiler = new BucklescriptCompiler(config);
        });

        it('should compile successfully', function () {
          var data = '';
          bucklescriptCompiler.compile({data, path: "src/test.ml"}, function(error) {
            expect(error).to.not.be.ok;
          });
          expected = 'bsc -c -bs-package-name bucklescript -bs-package-output tmp -o tmp -bs-files test.ml';
          expect(childProcess.exec).to.have.been.calledWith(expected, {cwd: "src"});
        });
      });
    });
  });
});
