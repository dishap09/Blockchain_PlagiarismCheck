const PlagiarismChecker = artifacts.require("PlagiarismChecker");

module.exports = function(deployer) {
    deployer.deploy(PlagiarismChecker);
};