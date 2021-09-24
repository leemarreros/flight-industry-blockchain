import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";
import Web3 from "web3";
let contract,
  passengersInfo = {};

(async () => {
  let result = null;

  contract = new Contract("localhost", async () => {
    contract.triggerResultForFlight = async (
      resultStatusCodeOracles,
      returnValues
    ) => {
      let [res, statusCode] = computeStatusCodeResult(resultStatusCodeOracles);
      let message = {
        UNKNOWN: "Uknown failure",
        ON_TIME: "Airline on time",
        LATE_AIRLINE: "Airline is late! Click HERE to refund!",
        LATE_WEATHER: "Bad weather",
        LATE_TECHNICAL: "Tecnical Failure",
        LATE_OTHER: "Late (others)",
      }[res];

      let { flight } = returnValues;
      let elPassengerbtn = [...DOM.elclass("passenger-button")].filter(
        (el) => el.dataset.flightNumber === flight
      )[0];
      let { ix, flightNumber } = elPassengerbtn.dataset;
      if (!ix) return;

      let resDom = DOM.elid(`pending-status-${ix}`);
      resDom.innerText = message;
      let parent = resDom.parentElement.parentElement;

      if (res == "ON_TIME") {
        parent.classList.add("bg-success");
      } else if (res == "LATE_AIRLINE") {
        parent.classList.add("bg-danger");
        resDom.dataset.passenger = passengersInfo[ix].passenger;
        resDom.dataset.ix = ix;
        // enable insuree to claim refund due to airline being late
        resDom.addEventListener("click", claimRefundByInsuree);
      } else {
        parent.classList.add("bg-dark");
      }

      // updating status code for a specific flight number
      res = await contract.updateStatusCode(statusCode, flightNumber);
      if (!res) return;
      console.log(
        `Flight number ${flightNumber} was updated with status code ${statusCode}.`
      );
    };

    contract.setTrigger(contract.triggerResultForFlight);

    // Read transaction
    contract.isOperational((error, result) => {
      console.log(error, result);
      DOM.elid("contract-operational").innerText = result;
      if (result) {
        DOM.elid("contract-operational").style.color = "green";
      } else {
        DOM.elid("contract-operational").style.color = "red";
      }
    });

    contract.fetchAirlines((airlines) => {
      for (let airline of airlines) {
        let {
          airlineAddress,
          airlineName,
          count,
          countAirlines_,
          hasVoted,
          isRegistered,
          updatedTimestamp,
          fund,
        } = airline;
        addNewAirlineRow(
          airlineAddress,
          airlineName,
          countAirlines_,
          hasVoted,
          fund
        );
      }
    });

    // Create passengers
    await createPassengerTable();

    // Funding

    let res = await contract.getTotalAirlineFunding();

    if (res) {
      DOM.elid("totalFundsBy").innerText = `Total funds: ${res}`;
    }
  });
})();

function addNewAirlineRow(
  airlineAddress,
  airlineName,
  countAirlines_,
  hasVoted,
  fund
) {
  let displayDiv = DOM.elid("airlineManagement");
  let colMyAuto = (el) => DOM.div({ className: "col my-auto" }, el);

  let rowWrapper = DOM.div({ className: "row mt-4" });

  let card2 = DOM.div({ className: "col my-auto" }).appendChild(
    DOM.div({ className: "card" }).appendChild(
      DOM.div({ className: "card-body mx-auto my-auto" }).appendChild(
        DOM.h5({ className: "card-title" }, airlineName)
      )
    )
  );

  let cardTitle = DOM.h5({ className: "card-title" }, airlineName);
  let cardBody = DOM.div(
    {
      className: "card-body mx-auto my-auto",
    },
    cardTitle
  );
  let card = DOM.div({ className: "card" }, cardBody);
  let calAuto = DOM.div({ className: "col my-auto" }, card);
  rowWrapper.appendChild(calAuto);

  let btnNewAirlineDOM = DOM.button(
    {
      className: `btn btn-new-airline ${
        countAirlines_ < 4 ? "btn-primary" : "btn-secondary disabled"
      }`,
      id: "addNewAirlineF",
      title: airlineAddress,
    },
    "Add New Airline"
  );
  let col1 = colMyAuto(btnNewAirlineDOM);
  col1.addEventListener("click", addNewAirlineF);

  let btnVoteNewAirlineDOM = DOM.button(
    {
      className: `btn btn-vote-new-airline ${
        countAirlines_ < 4
          ? "btn-secondary disabled"
          : hasVoted
          ? "btn-success"
          : "btn-primary"
      }`,
      id: "voteNewAirlineF",
      title: airlineAddress,
    },
    hasVoted ? "VOTE MADE" : "Vote for new Airline"
  );
  if (countAirlines_ < 4) {
    btnVoteNewAirlineDOM.disabled = true;
  } else if (hasVoted) {
    btnVoteNewAirlineDOM.disabled = true;
  } else if (!hasVoted) {
    btnVoteNewAirlineDOM.disabled = false;
  }
  let col2 = colMyAuto(btnVoteNewAirlineDOM);
  col2.addEventListener("click", voteForNewAirline);

  let col3 = colMyAuto(
    DOM.button(
      {
        className: `btn fund-ether-airline ${
          fund == 0 ? "btn-primary" : "btn-success"
        }`,
        title: airlineAddress,
      },
      fund == 0
        ? "Fund 10 ether"
        : `${Web3.utils.fromWei(fund, "ether")} Eth funded`
    )
  );
  col3.addEventListener("click", fundByAirline);

  rowWrapper.appendChild(col1);
  rowWrapper.appendChild(col2);
  rowWrapper.appendChild(col3);
  displayDiv.appendChild(rowWrapper);

  if (countAirlines_ > 3) {
    let btnsNewAirline = [...DOM.elclass("btn-new-airline")];
    for (let btnNewAirline of btnsNewAirline) {
      if (btnNewAirline.classList.contains("btn-primary")) {
        btnNewAirline.classList.remove("btn-primary");
        if (!btnNewAirline.classList.contains("btn-secondary")) {
          btnNewAirline.classList.add("disabled");
          btnNewAirline.classList.add("btn-secondary");
        }
      }
      btnNewAirline.disabled = true;
      continue;
    }

    let btnsVoteNewAirline = [...DOM.elclass("btn-vote-new-airline")];
    for (let btnVoteNewAirline of btnsVoteNewAirline) {
      if (btnVoteNewAirline.classList.contains("btn-secondary")) {
        btnVoteNewAirline.classList.remove("btn-secondary");
        btnVoteNewAirline.classList.remove("disabled");
        if (!btnVoteNewAirline.classList.contains("btn-primary"))
          btnVoteNewAirline.classList.add("btn-primary");
      }
      btnVoteNewAirline.disabled = false;
    }
  }
}

async function addNewAirlineF(event) {
  event.preventDefault();
  let airlineCallerAddress = event.target.title;
  let returnValues;
  try {
    returnValues = await contract.registerAirline(airlineCallerAddress);
  } catch (error) {
    console.error("Error when addNewAirlineF", error);
  }

  if (!returnValues) return;

  let { airlineAddress_, airlineName_ } = returnValues;
  await fetchAirline(airlineAddress_, airlineCallerAddress);
}

async function fetchAirline(airlineAddress_, airlineCallerAddress) {
  let airline;
  try {
    airline = await contract.fetchAirline(airlineAddress_);
  } catch (error) {
    console.log("Error fetching data of new airline", error);
  }

  if (!airline) return;
  let {
    airlineAddress,
    airlineName,
    count,
    countAirlines_,
    hasVoted,
    isRegistered,
    updatedTimestamp,
    fund,
  } = airline;
  console.log(`New airline's address added: ${airlineAddress} ${airlineName}.`);
  console.log(`Added by : ${airlineCallerAddress}.`);
  addNewAirlineRow(airlineAddress, airlineName, countAirlines_, hasVoted, fund);
}

async function voteForNewAirline(event) {
  event.preventDefault();
  let airlineVoterAddress = event.target.title;
  let returnValues;
  try {
    returnValues = await contract.registerAirlineByVoting(airlineVoterAddress);
  } catch (error) {
    console.log("Error when addNewAirlineF", error);
  }

  if (!returnValues) return;

  let { RegisterArlineEvent, VoteForArlineEvent } = returnValues;

  if (VoteForArlineEvent) {
    let { airlineVoterAddress_, newAirlinedAdded } = VoteForArlineEvent;
    // airlineVoterAddress_ -> update UI put green that button
    let btn = event.target;
    if (btn.classList.contains("btn-primary")) {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-success");
      btn.innerText = "VOTE MADE";
    }
    // if newAirlinedAdded == true, reset UI
    if (newAirlinedAdded) {
      let btnsVoteNewAirline = [...DOM.elclass("btn-vote-new-airline")];
      for (let btnVoteNewAirline of btnsVoteNewAirline) {
        if (btnVoteNewAirline.classList.contains("btn-success")) {
          btnVoteNewAirline.classList.remove("btn-success");
          btnVoteNewAirline.classList.add("btn-primary");
          btnVoteNewAirline.innerText = "Vote for new Airline";
        }
      }
    }
  }

  if (RegisterArlineEvent) {
    let { airlineAddress_, airlineCallerAddress, airlineName_ } =
      RegisterArlineEvent;
    // If this happens, add new airline
    await fetchAirline(airlineAddress_, airlineCallerAddress);
  }
}

async function fundByAirline(event) {
  event.preventDefault();
  let airlineVoterAddress = event.target.title;
  let returnValues;
  try {
    returnValues = await contract.fundByAirline(airlineVoterAddress);
  } catch (error) {
    console.log("Error when funding new airline", error);
  }

  if (!returnValues) return;
  const { airlineAddress_, amountFunded_ } = returnValues;
  console.log(
    `Airline address ${airlineAddress_} provide a fund of ${amountFunded_}.`
  );
  let btn = event.target;
  if (btn.classList.contains("btn-primary")) {
    // fund-ether-airline
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-success");
    btn.innerText = `${Web3.utils.fromWei(amountFunded_, "ether")} Eth Funded`;
  } else {
    btn.innerText = `${Web3.utils.fromWei(
      amountFunded_ || "0",
      "ether"
    )} Eth Funded`;
  }

  let res = await contract.getTotalAirlineFunding();

  if (res) {
    DOM.elid("totalFundsBy").innerText = `Total funds: ${res}`;
  }
  await createPassengerTable();
}

function createCard(str) {
  let colauto = DOM.div(
    { className: "col my-auto" },
    DOM.div(
      { className: "card" },
      DOM.div(
        { className: "card-body mx-auto my-auto" },
        DOM.h5({ className: "card-title" }, str)
      )
    )
  );
  return colauto;
}
async function createPassengerTable() {
  let availableAirlines = (await contract.fetchAirlines()).filter(
    (airline) => airline.fund != 0
  );
  let row = DOM.div({ className: "row mt-4" });
  row.appendChild(createCard("Passenger"));
  row.appendChild(createCard("Available Flights (choose one)"));
  row.appendChild(createCard("Purchase insurance/Get Flight Status"));
  row.appendChild(createCard("Flight Status Result"));
  row.appendChild(createCard("Balance"));
  let passengerEl = DOM.elid("purchaseFlights");
  passengerEl.innerHTML = "";
  passengerEl.appendChild(row);
  console.log("Passengers account address:", contract.passengers);
  console.log("Airlines that provided fund so far:", availableAirlines);
  contract.passengers.forEach(async (passenger, ix) => {
    // # passenger    | available flights | purchase insurance  | withdraw | balance

    let rowWrapper = DOM.div({ className: "row mt-4" });
    // # passenger
    let card = DOM.div(
      { className: "col my-auto" },
      DOM.h5({ className: "card-title" }, `Passenger ${ix}`)
    );
    rowWrapper.appendChild(card);
    passengersInfo[ix] = {};
    passengersInfo[ix].passenger = passenger;

    // # available flights
    let aFlights = DOM.div({ className: "col my-auto" });
    let colFlights = DOM.div({ id: `flights-${ix}` });
    if (!!availableAirlines && availableAirlines.length != 0) {
      for (let fligth of availableAirlines) {
        let flightNumber = Math.trunc(Math.random() * 1000000);
        let { airlineAddress, airlineName } = fligth;
        let btnAirline = DOM.button(
          {
            className: "btn btn-primary passenger-button",
            id: `passenger-flight-${ix}`,
            title: airlineAddress,
          },
          `${airlineName} ${flightNumber}`
        );
        btnAirline.dataset.ix = ix;
        btnAirline.dataset.flightNumber = flightNumber;
        btnAirline.addEventListener("click", chooseAirline);
        colFlights.appendChild(btnAirline);
      }
    }
    aFlights.appendChild(colFlights);
    rowWrapper.appendChild(aFlights);
    let insurancePrice;
    if (!!passengersInfo[ix]?.insurancePrice) {
      insurancePrice = passengersInfo[ix]?.insurancePrice;
    } else {
      insurancePrice = Number(Math.random().toFixed(2));
      passengersInfo[ix].insurancePrice = insurancePrice;
    }
    // # purchase insurance/get fligth status
    let purchaseInsuranceButton = DOM.button(
      { className: "btn btn-secondary", id: `purchase-insurance-${ix}` },
      `Purchase insurance at ${insurancePrice} Ether`
    );
    purchaseInsuranceButton.disabled = true;
    purchaseInsuranceButton.dataset.ix = ix;

    let getFlightStatusButton = DOM.button(
      { className: "btn btn-secondary", id: `get-flight-status-${ix}` },
      "Get Flight Status (submit to Oracle)"
    );
    purchaseInsuranceButton.addEventListener("click", purchaseInsurance);
    getFlightStatusButton.disabled = true;
    getFlightStatusButton.dataset.ix = ix;
    getFlightStatusButton.addEventListener("click", getFlightStatus);

    let insuranceEl = DOM.div({ className: "col my-auto" });
    insuranceEl.appendChild(purchaseInsuranceButton);
    insuranceEl.appendChild(getFlightStatusButton);
    rowWrapper.appendChild(insuranceEl);

    // # Withdraw funds by passenger
    let withDrawFundsByPassengerBtn = DOM.div(
      { className: "card text-white text-center" },
      DOM.div(
        { className: "card-body" },
        DOM.h5(
          { className: "card-title text-white", id: `pending-status-${ix}` },
          "Pending Result"
        )
      )
    );
    let withDFundsEl = DOM.div(
      { className: "col my-auto" },
      withDrawFundsByPassengerBtn
    );
    rowWrapper.appendChild(withDFundsEl);

    // # Show balance after
    let balancePassenger = DOM.div(
      { className: `balance-passenger-${ix}` },
      contract.web3.utils.fromWei(
        await contract.web3.eth.getBalance(passenger),
        "ether"
      )
    );
    let showBalancePassenger = DOM.div(
      { className: "col my-auto" },
      balancePassenger
    );
    rowWrapper.appendChild(showBalancePassenger);

    passengerEl.appendChild(rowWrapper);
  });
}

async function chooseAirline(event) {
  event.preventDefault();
  let airlineAddress = event.target.title;
  event.target.disabled = true;
  let { ix, flightNumber } = event.target.dataset;
  passengersInfo[ix].airlineAddress = airlineAddress;
  passengersInfo[ix].flightNumber = flightNumber;
  let arilinesEl = [...DOM.elid(`flights-${ix}`).children];
  for (let airlineEl of arilinesEl) {
    if (airlineAddress != airlineEl.title) {
      airlineEl.disabled = true;
      airlineEl.classList.remove("btn-primary");
      airlineEl.classList.add("btn-secondary");
    }
  }
  let purchaseInsuranceButton = DOM.elid(`purchase-insurance-${ix}`);
  purchaseInsuranceButton.disabled = false;
  purchaseInsuranceButton.dataset.flightNumber = flightNumber;
  purchaseInsuranceButton.classList.remove("btn-secondary");
  purchaseInsuranceButton.classList.add("btn-primary");

  // registering airline
  let timestamp = Math.floor(Date.now() / 1000);
  await contract.registerFlight(airlineAddress, flightNumber, timestamp);
}

async function purchaseInsurance(event) {
  event.preventDefault();
  let { ix, flightNumber } = event.target.dataset;
  let flightStatusButton = DOM.elid(`get-flight-status-${ix}`);
  event.target.disabled = true;
  event.target.classList.remove("btn-primary");
  event.target.classList.add("btn-success");

  let { airlineAddress, insurancePrice, passenger } = passengersInfo[ix];
  flightStatusButton.disabled = false;
  flightStatusButton.dataset.flightNumber = flightNumber;
  flightStatusButton.classList.remove("btn-secondary");
  flightStatusButton.classList.add("btn-primary");

  // purchase insurance by passenger
  let newBalance = await contract.buy(
    passenger,
    String(flightNumber),
    insurancePrice
  );
  DOM.elclass(`balance-passenger-${ix}`)[0].innerText = newBalance;
}

function getFlightStatus(event) {
  event.preventDefault();
  let { ix } = event.target.dataset;
  let { flightNumber, airlineAddress, insurancePrice } = passengersInfo[ix];
  console.log("Submitted to Oracle------------");
  console.log("Passenger is: ", ix);
  console.log("Airline address is: ", airlineAddress);
  console.log("Flight number is: ", flightNumber);
  console.log("Insurance Price is: ", insurancePrice);
  contract.setEnableCalculationStatusCode();
  contract.fetchFlightStatus(flightNumber, airlineAddress, (error, result) => {
    event.target.disabled = true;
  });
}

function computeStatusCodeResult(results) {
  /**
   * STATUS_CODE_UNKNOWN = 0;
     STATUS_CODE_ON_TIME = 10;
     STATUS_CODE_LATE_AIRLINE = 20;
     STATUS_CODE_LATE_WEATHER = 30;
     STATUS_CODE_LATE_TECHNICAL = 40;
     STATUS_CODE_LATE_OTHER = 50;
   */
  // 1. Returns the status code with more repetitions
  // 2. If the # of repetitions of a status code are the same,
  //    there is a priority for returning the result:
  //    10      >   20         > 30           > 40             > 50         > 0
  //    ON_TIME > LATE_AIRLINE > LATE_WEATHER > LATE_TECHNICAL > LATE_OTHER > UNKNOWN

  let tableStatusCode = {
    UNKNOWN: 0,
    ON_TIME: 0,
    LATE_AIRLINE: 0,
    LATE_WEATHER: 0,
    LATE_TECHNICAL: 0,
    LATE_OTHER: 0,
  };
  let mapStatus = {
    0: "UNKNOWN",
    10: "ON_TIME",
    20: "LATE_AIRLINE",
    30: "LATE_WEATHER",
    40: "LATE_TECHNICAL",
    50: "LATE_OTHER",
  };
  let mapStatusInverse = {
    UNKNOWN: 0,
    ON_TIME: 10,
    LATE_AIRLINE: 20,
    LATE_WEATHER: 30,
    LATE_TECHNICAL: 40,
    LATE_OTHER: 50,
  };
  for (let st of results) {
    tableStatusCode[mapStatus[st]]++;
  }

  let q = null, // # of "0", # of "10", ...
    prevKey = null; // LATE_AIRLINE, LATE_WEATHER, ...
  for (let key in tableStatusCode) {
    if (q == null) {
      q = tableStatusCode[key];
      prevKey = key;
      continue;
    }
    if (q < tableStatusCode[key]) {
      q = tableStatusCode[key];
      prevKey = key;
    } else if (q == tableStatusCode[key]) {
      let newCode = mapStatusInverse[key];
      let prevCode = mapStatusInverse[prevKey];
      if (newCode == 0) newCode = 100;
      if (prevCode == 0) prevCode = 100;
      if (newCode < prevCode) {
        prevKey = key;
      }
    }
  }

  return [prevKey, mapStatusInverse[prevKey]];
}

async function claimRefundByInsuree(event) {
  event.preventDefault();
  let el = event.target;
  let { passenger, ix } = event.target.dataset;
  let newBalance;
  newBalance = await contract.pay(passenger);

  if (!newBalance) {
    console.error("Something went wrong. Try again!");
    return;
  }
  DOM.elclass(`balance-passenger-${ix}`)[0].innerText = newBalance;
  el.removeEventListener("click", claimRefundByInsuree);
}
