const AcademicPaperRegistry = artifacts.require("AcademicPaperRegistry");

module.exports = function (deployer) {
  deployer.deploy(AcademicPaperRegistry);
};