pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true;
    uint256 public totalAirlineFunding = 0;
    FlightSuretyData flightSuretyData;

    struct Flight {
        string flightNumber;
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(string => Flight) private flights;

    struct Insuree {
        address insuree;
        uint256 costInsurance;
        uint256 refund;
        bool isRegistered;
        string flightNumber;
    }
    mapping(address => Insuree) private insurees;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event RegisterArlineEvent(
        string airlineName_,
        address airlineAddress_,
        address airlineCallerAddress
    );
    event VoteForArlineEvent(
        address airlineVoterAddress_,
        bool newAirlinedAdded
    );
    event AirlineFund(address airlineAddress_, uint256 amountFunded_);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
     * @dev Contract constructor
     *
     */
    constructor(address dataContract) public {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public returns (bool) {
        return operational; // Modify to call data contract's status
    }

    function changeOperational(bool operational_)
        public
        requireContractOwner
        returns (bool)
    {
        operational = operational_;
        return operational;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function registerAirline(
        string airlineName_,
        address airlineAddress_,
        address airlineCallerAddress
    ) public returns (bool) {
        require(
            flightSuretyData.registerAirline(
                airlineName_,
                airlineAddress_,
                airlineCallerAddress
            ),
            "There's an Error registering an airline."
        );
        emit RegisterArlineEvent(
            airlineName_,
            airlineAddress_,
            airlineCallerAddress
        );
        return true;
    }

    function registerAirlineByVoting(
        string newAirlineName_,
        address newAirlineAddress_,
        address airlineVoterAddress_
    ) public returns (bool) {
        bool newAirlinedAdded = flightSuretyData.registerAirlineByVoting(
            newAirlineName_,
            newAirlineAddress_,
            airlineVoterAddress_
        );
        if (newAirlinedAdded) {
            emit RegisterArlineEvent(
                newAirlineName_,
                newAirlineAddress_,
                airlineVoterAddress_
            );
        }
        emit VoteForArlineEvent(airlineVoterAddress_, newAirlinedAdded);
        return true;
    }

    function getAirlineAddresses() public view returns (address[]) {
        return flightSuretyData.getAirlineAddresses();
    }

    function getAirlineData(address airlineAddress_)
        external
        returns (
            bool isRegistered,
            uint256 count,
            uint256 updatedTimestamp,
            address airlineAddress,
            string airlineName,
            bool hasVoted,
            uint256 countAirlines_,
            uint256 fund
        )
    {
        return flightSuretyData.getAirlineData(airlineAddress_);
    }

    /**
     * @dev Register a future flight for insuring (front-end).
     *
     */
    function registerFlight(
        address airlineAddress,
        string flightNumber,
        uint8 statusCode,
        uint256 updatedTimestamp
    ) external {
        require(
            !flights[flightNumber].isRegistered,
            "Flight number is already registered."
        );
        flights[flightNumber] = Flight(
            flightNumber,
            true,
            1,
            updatedTimestamp,
            airlineAddress
        );
    }

    function updateStatusCode(uint8 statusCode, string flightNumber) public {
        require(
            flights[flightNumber].isRegistered,
            "Flight number is not registered."
        );
        flights[flightNumber].statusCode = statusCode;
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3]) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);

        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );

        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {
        require(
            msg.sender.balance >= 10 ether,
            "Account caller does not have enough ether balance"
        );
        require(msg.value == 10 ether, "Each airline must fund 10 ether.");
        uint256 amountFunded_ = flightSuretyData.registerFundAirline(
            msg.sender
        );
        totalAirlineFunding += 10;
        emit AirlineFund(msg.sender, amountFunded_);
    }

    /**
     * @dev Buy insurance for a flight by insuree
     *
     */
    function buy(
        address insuree,
        string flightNumber,
        uint256 costInsurance
    ) external payable {
        require(
            msg.sender.balance >= costInsurance,
            "Caller does not have enough funds to purchase insurance."
        );
        require(
            msg.value >= costInsurance,
            "Caller's deposit is not matching insurance cost."
        );
        insurees[insuree] = Insuree(
            insuree,
            costInsurance,
            (costInsurance * 15) / 10,
            true,
            flightNumber
        );
    }

    /**
     *  @dev Transfers eligible payout funds to insuree.
     *  Trigger by Insuree.
     *
     */
    function pay(address insuree) external {
        require(
            insurees[insuree].isRegistered,
            "Insuree making the call is not registered"
        );
        require(
            insurees[insuree].refund != 0,
            "Insuree making the call does not have anything to refund."
        );
        require(
            flights[insurees[insuree].flightNumber].statusCode ==
                STATUS_CODE_LATE_AIRLINE,
            "The airline did not refund because it was not late."
        );

        uint256 amountToRefund = insurees[insuree].refund;
        insurees[insuree].refund = 0;
        insuree.transfer(amountToRefund);
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        fund();
    }
}

interface FlightSuretyData {
    function registerAirline(
        string airlineName_,
        address airlineAddress_,
        address airlineCallerAddress
    ) external returns (bool);

    function registerAirlineByVoting(
        string newAirlineName_,
        address newAirlineAddress_,
        address airlineVoterAddress
    ) external returns (bool);

    function getAirlineAddresses() external returns (address[]);

    function getAirlineData(address airlineAddress_)
        external
        returns (
            bool isRegistered,
            uint256 count,
            uint256 updatedTimestamp,
            address airlineAddress,
            string airlineName,
            bool hasVoted,
            uint256 countAirlines_,
            uint256 fund
        );

    function registerFundAirline(address airlineAddress_)
        external
        returns (uint256);
}
