pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    address[] airlineVoters = new address[](0);
    address[] airlinesAddresses = new address[](0);
    bool private operational = true; // Blocks all state changes throughout the contract if false
    uint256 countAirlines = 1; // keep the count of num of airlines in 'airlines' mapping

    struct Airline {
        bool isRegistered;
        uint256 count;
        uint256 updatedTimestamp;
        address airlineAddress;
        string airlineName;
        bool hasVoted;
        uint256 fund;
    }

    mapping(address => Airline) airlines; // Mapping for storing airlines

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    constructor() public {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
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
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline(
        string newAirlineName_,
        address newAirlineAddress_,
        address airlineCallerAddress_
    ) external returns (bool) {
        require(
            countAirlines < 5,
            "Only 4 airlines are allowed to register without voting."
        );
        require(
            airlines[airlineCallerAddress_].isRegistered ||
                msg.sender == contractOwner,
            "Only Contract Owner or registered airlines are allowed to register."
        );
        require(
            !airlines[newAirlineAddress_].isRegistered,
            "Airline has been registered already. Do not allow duplicated."
        );

        Airline storage newAirline = airlines[newAirlineAddress_];

        newAirline.isRegistered = true;
        newAirline.count = countAirlines;
        newAirline.updatedTimestamp = block.timestamp;
        newAirline.airlineAddress = newAirlineAddress_;
        newAirline.airlineName = newAirlineName_;
        newAirline.hasVoted = false;
        newAirline.fund = 0;

        countAirlines += 1;
        airlinesAddresses.push(newAirlineAddress_);
        return true;
    }

    /**
     * @dev Count votes of current airlines.
     *      More than 50% of voting enables a new airline
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirlineByVoting(
        string newAirlineName_,
        address newAirlineAddress_,
        address airlineVoterAddress_
    ) external returns (bool) {
        require(
            countAirlines >= 4,
            "Voting is require after registering 4 airlines."
        );
        require(
            countAirlines <= 10,
            "No more than 10 airlines could be registered."
        );
        require(
            airlines[airlineVoterAddress_].isRegistered,
            "Only registered airlines are allowed to vote for a new airline."
        );
        require(
            !airlines[airlineVoterAddress_].hasVoted,
            "The caller has already voted in this Round."
        );
        require(
            !airlines[newAirlineAddress_].isRegistered,
            "Airline has been registered already. Do not allow duplicated."
        );

        airlines[airlineVoterAddress_].hasVoted = true;
        airlineVoters.push(airlineVoterAddress_);
        if (airlineVoters.length >= countAirlines.div(2)) {
            airlines[newAirlineAddress_] = Airline({
                isRegistered: true,
                count: countAirlines,
                updatedTimestamp: now,
                airlineAddress: newAirlineAddress_,
                airlineName: newAirlineName_,
                hasVoted: false,
                fund: 0
            });
            airlinesAddresses.push(newAirlineAddress_);
            countAirlines++;
            for (uint256 c = 0; c < airlineVoters.length; c++) {
                airlines[airlineVoters[c]].hasVoted = false;
            }
            airlineVoters = new address[](0);
            return true;
        }
        return false;
    }

    function getAirlineAddresses() external view returns (address[]) {
        return airlinesAddresses;
    }

    function getAirlineData(address airlineAddress_)
        external
        view
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
        isRegistered = airlines[airlineAddress_].isRegistered;
        count = airlines[airlineAddress_].count;
        updatedTimestamp = airlines[airlineAddress_].updatedTimestamp;
        airlineAddress = airlines[airlineAddress_].airlineAddress;
        airlineName = airlines[airlineAddress_].airlineName;
        hasVoted = airlines[airlineAddress_].hasVoted;
        countAirlines_ = countAirlines - 1;
        fund = airlines[airlineAddress_].fund;
    }

    function registerFundAirline(address airlineAddress_)
        external
        returns (uint256)
    {
        airlines[airlineAddress_].fund += 10 ether;
        return airlines[airlineAddress_].fund;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
}
