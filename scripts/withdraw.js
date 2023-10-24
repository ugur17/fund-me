const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const { deployer } = await getNamedAccounts();
  const fundMeAddress = (await deployments.get("FundMe")).address;
  fundMe = await ethers.getContractAt("FundMe", fundMeAddress);
  console.log("Withdrawing Contract...");
  const txResponse = await fundMe.withdraw();
  await txResponse.wait(1);
  console.log("Withdrawed!");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(0);
  });
