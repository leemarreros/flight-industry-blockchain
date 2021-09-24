const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");
const getRandomAirlineName = require("../utils");

module.exports = async function (deployer, network, accounts) {
  console.log("accounts used for deployement", accounts);
  let firstAirlineAddress = accounts[1];
  let firstAirlineName = getRandomAirlineName();

  await deployer.deploy(FlightSuretyData);
  let flightSuretyData = await FlightSuretyData.deployed();
  let res = await flightSuretyData.registerAirline(
    firstAirlineName,
    firstAirlineAddress,
    accounts[0]
  );
  console.log("Registered 1st airline?", res);

  await deployer.deploy(FlightSuretyApp, flightSuretyData.address);
  let flightSuretyApp = await FlightSuretyApp.deployed();

  let config = {
    localhost: {
      url: "http://localhost:8545",
      dataAddress: flightSuretyData.address,
      appAddress: flightSuretyApp.address,
    },
  };
  fs.writeFileSync(
    __dirname + "/../src/dapp/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );
  fs.writeFileSync(
    __dirname + "/../src/server/config.json",
    JSON.stringify(config, null, "\t"),
    "utf-8"
  );
};
