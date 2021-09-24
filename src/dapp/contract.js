import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import getRandomAirlineName from "../../utils";

export default class Contract {
  constructor(network, callback) {
    console.log("network", network);

    let config = Config[network];
    this.web3 = new Web3(
      // new Web3.providers.HttpProvider(config.url)
      new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
    );
    window.web3 = this.web3;
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.initialize(callback);
    this.initEvents();
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
    this.accts = [];
    this.newAirlineNameVoting = null;
    this.newAirlineAddressVoting = null;
    this.timestampRetrieved = null;
    this.resultStatusCodeOracles = [];
    this.refSetTimeout = null;
    this.enableCalculationStatusCode = false;
    this.triggerResultForFlight = null;
    this.returnValuesCurr = null;
    this.statusCodeTriggerBySettimeout = false;
  }

  setEnableCalculationStatusCode() {
    let self = this;
    clearTimeout(self.refSetTimeout);
    self.enableCalculationStatusCode = true;
    self.resultStatusCodeOracles = [];
    self.returnValuesCurr = null;
    self.statusCodeTriggerBySettimeout = false;
  }

  initEvents() {
    let self = this;
    self.flightSuretyApp.events.FlightStatusInfo(
      {
        fromBlock: 0,
      },
      function (error, event) {
        // Trigger result when there are 10 results
        // or 15 sec have passed
        if (error) console.log(error);
        if (event.returnValues.timestamp == self.timestampRetrieved) {
          if (
            self.resultStatusCodeOracles.length < 10 &&
            !self.statusCodeTriggerBySettimeout
          ) {
            self.resultStatusCodeOracles.push(event.returnValues.status);
            self.returnValuesCurr = { ...event.returnValues };
          }
          if (
            self.resultStatusCodeOracles.length == 10 &&
            !self.statusCodeTriggerBySettimeout
          ) {
            self.resultStatusCodeOracles.push(event.returnValues.status);
            // trigger result of oracles
            self.triggerResultForFlight(
              self.resultStatusCodeOracles,
              event.returnValues
            );
            if (self.refSetTimeout !== null) {
              clearTimeout(self.refSetTimeout);
              self.refSetTimeout = null;
            }
          }
          if (self.enableCalculationStatusCode) {
            self.enableCalculationStatusCode = false;
            self.resetStatusCodeArray();
          }
        }
      }
    );
  }

  resetStatusCodeArray() {
    let self = this;
    let timeout = 15000;
    self.refSetTimeout = setTimeout(() => {
      // trigger result of oracles
      self.statusCodeTriggerBySettimeout = true;
      self.triggerResultForFlight(
        self.resultStatusCodeOracles,
        self.returnValuesCurr
      );
    }, timeout);
  }

  setTrigger(trigger) {
    let self = this;
    self.triggerResultForFlight = trigger;
  }

  initialize(callback) {
    let self = this;
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      this.firstAirlineAcc = accts[1];
      console.log("Total # accounts: ", accts.length);
      this.accts = [...accts];
      this.airlines = [this.firstAirlineAcc];

      for (let p = 15; p < 20; p++) {
        this.passengers.push(accts[p]);
      }
      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, airline, callback) {
    let self = this;
    self.timestampRetrieved = Math.floor(Date.now() / 1000);

    let payload = {
      airline: airline,
      flight: flight,
      timestamp: self.timestampRetrieved,
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(
        payload.airline,
        String(payload.flight),
        payload.timestamp
      )
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }

  async fetchAirlines(callback = null) {
    let self = this;
    let airlines = [];

    let airlineAddresses = await self.flightSuretyApp.methods
      .getAirlineAddresses()
      .call();

    for (let addressAirpline of airlineAddresses) {
      let airline = await self.flightSuretyApp.methods
        .getAirlineData(addressAirpline)
        .call();
      airlines.push(airline);
    }
    callback && callback(airlines);
    return airlines;
  }

  async fetchAirline(airlineAddress) {
    let self = this;
    let airline = await self.flightSuretyApp.methods
      .getAirlineData(airlineAddress)
      .call();
    return airline;
  }

  async registerAirline(airlineCallerAddress) {
    let self = this;
    let res;
    let newAirlineName = getRandomAirlineName();

    let counterArray = await self.flightSuretyApp.methods
      .getAirlineAddresses()
      .call();
    let counter = counterArray.length;
    counter++;

    let newAirlineAddress = self.accts[counter];
    self.airlines.push(newAirlineAddress);
    try {
      res = await self.flightSuretyApp.methods
        .registerAirline(
          newAirlineName,
          newAirlineAddress,
          airlineCallerAddress
        )
        .send({ from: airlineCallerAddress, gas: 220000 });
    } catch (error) {
      console.log("contract.js error", error);
    }

    if (res) {
      return res?.events?.RegisterArlineEvent?.returnValues;
    }
    return null;
  }

  async registerAirlineByVoting(airlineVoterAddress_) {
    let self = this;
    let res;
    if (self.newAirlineNameVoting == null) {
      self.newAirlineNameVoting = getRandomAirlineName();
    }

    let counterArray = await self.flightSuretyApp.methods
      .getAirlineAddresses()
      .call();
    let counter = counterArray.length;
    counter++;

    let newAirlineAddress_ = self.accts[counter];
    self.airlines.push(newAirlineAddress_);
    console.log("airlineVoterAddress_", airlineVoterAddress_);
    console.log("newAirlineAddress_", newAirlineAddress_);

    try {
      res = await self.flightSuretyApp.methods
        .registerAirlineByVoting(
          self.newAirlineNameVoting,
          newAirlineAddress_,
          airlineVoterAddress_
        )
        .send({ from: airlineVoterAddress_, gas: 550000 });
    } catch (error) {
      console.error(error.message);
    }
    self.newAirlineNameVoting = null;

    if (res) {
      return {
        RegisterArlineEvent: res?.events?.RegisterArlineEvent?.returnValues,
        VoteForArlineEvent: res?.events?.VoteForArlineEvent?.returnValues,
      };
    }
    return null;
  }

  async fundByAirline(airlineAddress_) {
    let self = this;
    let res,
      tenEther = this.web3.utils.toWei("10", "ether");
    try {
      res = await self.flightSuretyApp.methods.fund().send({
        from: airlineAddress_,
        value: tenEther,
      });
    } catch (error) {
      console.log("Error in funding by airline", error);
    }
    if (res) {
      return res?.events?.AirlineFund?.returnValues;
    }
    return null;
  }

  async getTotalAirlineFunding() {
    let self = this;
    let res;
    try {
      res = await self.flightSuretyApp.methods.totalAirlineFunding().call();
    } catch (error) {
      console.log("Error getting total funds give by airline", error);
    }

    if (res) {
      return res;
    }
    return null;
  }

  async registerFlight(airlineAddress, flightNumber, updatedTimestamp) {
    let self = this;
    let res;
    try {
      res = await self.flightSuretyApp.methods
        .registerFlight(airlineAddress, flightNumber, 1, updatedTimestamp)
        .send({ from: self.owner, gas: 550000 });
    } catch (error) {
      console.error("Error registering flight.", error);
    }

    if (!res) return;
    console.log(`Fligt number ${flightNumber} has been saved in SC.`);
  }

  async updateStatusCode(statusCode, flightNumber) {
    let self = this;
    let res;
    try {
      res = await self.flightSuretyApp.methods
        .updateStatusCode(statusCode, flightNumber)
        .send({ from: self.owner, gas: 550000 });
    } catch (error) {
      console.error("Error setting status code for a flight number.", error);
    }
    if (res) return res;
    return null;
  }

  async buy(insuree, flightNumber, costInsurance) {
    let self = this;
    let cost = this.web3.utils.toWei(String(costInsurance), "ether");
    let balance = await self.web3.eth.getBalance(insuree);
    console.log("Balance of insuree before buy ", balance);

    let res;
    try {
      res = await self.flightSuretyApp.methods
        .buy(insuree, flightNumber, cost)
        .send({
          from: insuree,
          gas: 550000,
          value: cost,
        });
    } catch (error) {
      console.error("Error buying insurance by Insuree.", error);
    }

    if (!res) return;

    balance = await self.web3.eth.getBalance(insuree);
    console.log("Balance of insuree after buy ", balance);
    return Web3.utils.fromWei(balance, "ether");
  }

  async pay(insuree) {
    let self = this;
    let res;
    let balance = await self.web3.eth.getBalance(insuree);
    console.log("Balance of insuree before pay ", balance);
    try {
      res = await self.flightSuretyApp.methods
        .pay(insuree)
        .send({ from: insuree, gas: 550000 });
    } catch (error) {
      console.error("Error setting status code for a flight number.", error);
    }

    if (!res) {
      console.log("Something went wrong withdrawing funds.");
      return null;
    }

    balance = await self.web3.eth.getBalance(insuree);

    console.log("Balance of insuree after pay ", balance);

    return Web3.utils.fromWei(balance, "ether");
  }
}
