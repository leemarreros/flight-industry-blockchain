# Flightsurety Project

#### This projects aims to portray a specific implementation of the Flight industry on top of the Blockchain.

###### **Features**

For airlines:

1. Airlines can be registered one by one, freely, up to four.
2. Once there are more then four airlines, they need to vote (multiparty consensus) in order to add a new one.
3. An airline needs to fund 10 Ether in order to be allowed to list flights for customers

![AirlineManagement](/airline-mgm.png)

For customers:

1. Customers are able to select a flight (from airlines that funded) from a list.
2. Customers can purchase an insurance for securing his flights in case a flight is delayed
3. In case of a delayed flight, Customers are able to get a refund plus an additional 50%

![PassengerManagement](/passenger-mgm.png)

For Oracles:

1. For the purpose of this project, 30 Oracles are simulated using Node.js
2. Each oracle gives back a specific status of a flight, such as delayes, on time, among others.
3. Each oracle's answer is weighted in order to determine the final status of a flight.

**Set up for running FLIGHTSURETY**

The following libraries were used and compatible among each other:

* Truffle v5.0.2 (core: 5.0.2)
* Solidity - ^0.4.24 (solc-js)
* Node v11.14.0
* Web3 ^1.5.2

Run the project with the following commands (each of these in a different tab within a Terminal):

* Running the DApp: ` npm run dapp`
* Running the local blockchain using truffle: `ganache-cli -m "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" -a 60`
* Running the truffle console for deploying the contracts: `truffle console`. Once there, run `migrate --reset --network development`in order to deploy a new state of Smart Contracts and local blockchain
* Runnin the Oracles in Node.js: `npm run server`



**Operating the DApp**

Airline Management

1. Start at *Airline Management*. One airline is added by default and was added by the owner account.
2. `Add New Airline` allows a specific airline to add a new one. This button is activated when there are less than four airlines.
3. `Vote fore new Airline` allows you to vote for a new airline. It's activated whenever there are more then four airlines. Each airline has a vote. When there are more votes equivalente to 50% of current amount of airlines, a new airlines is added.
4. `Fund 10 ether` is used to fund the contract. Each airline could fund 10 ether at a time. Only the airlines that funded 10 ether will have available flights for the customers to purchase from.

Passenger Management

1. `Passenger`: There are 5 passengers created by default. Each passenger with a different address.
2. `Flights (choose one)`: Everytime an airline funds 10 ether, its flight will appear here. A passenger could select one from available flights.
3. `Purchase insurance/Get Flight Status`: Once the user has selected a flight, the button  `Purchase insurance at X Ether` is activated. With this button, the users makes a deposit of `X` amout of Ether to purchase an insurance. This `X` amout of Ether is randomly calculated for each passenger. After the user purchase the insurance, the button `Get Flight Status (submit to Oracle)` is enabled. With this button, the status of this particular flight is calculated by the Oracles running in the background. **Note:** When calling `Get Flight Status (submit to Oracle)`, it will take a while before getting a response. Be patient and DO NOT CALL other flight status from other passengers: do it one after the other.
4. `Flight Status Result`: After the Oracles have done their job, you will get the status of a particular flight from a particular passenger. If the result becomes red, it means the flight is delayed. If it is green, it means the flight is on time. Only when the result is red, you can click on it to get a refund plus an additional 50%.
5. `Balance`: Shows the balance of each passenger. It decreases when the passenger pays for his insurance. It increases in the case of getting a refund when the result red shows that the flight is actually delayed

**Check the console for more results**

Overall implementation of features for this project:

* Smart Contract Seperation ✅
* Dapp Created and Used for Contract Calls ✅
* Oracle Server Application ✅
* Operational status control is implemented in contracts ✅
* Fail Fast Contract ✅
* Airline Contract Initialization ✅
* Multiparty Consensus (current airline add a new one) ✅
* Multiparty Consensus (new one is added by vote of 50%+) ✅
* Airline Ante ✅
* Passenger Airline Choice ✅
* Passenger Payment ✅
* Passenger Repayment ✅
* Passenger Withdraw ✅
* Insurance Payouts ✅
* Functioning Oracle ✅
* Oracle Initialization ✅
* Oracle Updates ✅
* Oracle Functionality ✅