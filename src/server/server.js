import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

let config = Config["localhost"];
let accounts;
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);

const AMOUNT_ORACLES = 30;
// Watch contract events
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;
// Duplication of status code: they will appear more after randomizing
const STATUS_ARRAY = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
];

web3.eth.getAccounts().then((accs) => {
  accounts = accs;
  web3.eth.defaultAccount = accounts[0];
  try {
    registerOracles();
  } catch (error) {
    console.log("Error registering oracles", error);
  }
});

let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

flightSuretyApp.events.OracleRequest(
  // {fromBlock: 0},
  function (error, event) {
    if (error) console.log(error);
    if (
      event &&
      event.returnValues &&
      event.returnValues.airline &&
      event.returnValues.flight &&
      event.returnValues.timestamp
    ) {
      let { airline, flight, timestamp } = event.returnValues;
      submitRandomOracleResponses(airline, flight, timestamp);
    }
  }
);

// Registering 26 Oracles
async function registerOracles() {
  let AMOUNT_FEE = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  for (let o = 0; o < AMOUNT_ORACLES; o++) {
    let acc = accounts[20 + o];
    console.log("Oracle #: ", o, "Registered with account: ", acc);
    await flightSuretyApp.methods.registerOracle().send({
      from: acc,
      value: AMOUNT_FEE,
      gas: 5000000,
    });
  }
  console.log(`${AMOUNT_ORACLES} ORACLES REGISTERED IN THE SERVER`);
}

// Submitting random responsed from oracles
async function submitRandomOracleResponses(airline, flight, timestamp) {
  for (let o = 0; o < AMOUNT_ORACLES; o++) {
    // for (let o = 0; o < 1; o++) {
    let acc = accounts[20 + o];
    let oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({
      from: accounts[20 + o],
    });
    console.log(
      "account Oracle number",
      o,
      "airline",
      airline,
      "oracleIndexes",
      oracleIndexes
    );
    let randomStatus = Math.floor(Math.random() * STATUS_ARRAY.length);
    for (let idx = 0; idx < 3; idx++) {
      console.log(
        "submitOracleResponse",
        oracleIndexes[idx],
        airline,
        flight,
        timestamp,
        STATUS_ARRAY[randomStatus]
      );
      try {
        await flightSuretyApp.methods
          .submitOracleResponse(
            oracleIndexes[idx],
            airline,
            flight,
            timestamp,
            STATUS_ARRAY[randomStatus]
          )
          .send({
            from: acc,
            gas: 5000000,
          });
      } catch (error) {
        console.log("Error submitting Oracle's response", error);
      }
    }
  }
}

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

export default app;
