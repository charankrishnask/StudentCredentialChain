require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.0",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545", // Use 8545 if Ganache shows 8545
      accounts: [process.env.GANACHE_PRIVATE_KEY]
    }
  }
};