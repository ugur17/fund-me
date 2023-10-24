const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", () => {
      let fundMe, deployer, mockV3Aggregator;
      const sendValue = ethers.parseEther("1");
      beforeEach(async () => {
        // console.log(`namedAccounts: ${(await getNamedAccounts()).deployer}`);
        deployer = (await getNamedAccounts()).deployer;
        const contracts = await deployments.fixture(["all"]);
        // const signer = await ethers.getSigner(deployer);
        // console.log(await deployments.get("FundMe"));
        // const fundMeAddress = (await deployments.get("FundMe")).address;
        const fundMeAddress = contracts["FundMe"].address;
        // console.log(`Fund Me: ${contracts["FundMe"].address}`)
        fundMe = await ethers.getContractAt("FundMe", fundMeAddress);
        // console.log(`Fund Me 2: ${fundMe.address}`);
        // console.log(contracts);
        // console.log(await deployments.get("MockV3Aggregator"));
        const mockV3AggregatorAddress = contracts["MockV3Aggregator"].address;
        mockV3Aggregator = await ethers.getContractAt(
          "MockV3Aggregator",
          mockV3AggregatorAddress
        );
        // console.log("------------------------------------------");
        // console.log(mockV3Aggregator);
        // console.log(mockV3AggregatorAddress);
      });

      describe("constructor()", () => {
        it("sets the aggregator addresses correctly...", async () => {
          const response = await fundMe.s_priceFeed();
          // console.log(response);
          assert.equal(response, mockV3Aggregator.target);
        });
      });

      describe("fund()", () => {
        it("the amount should be bigger than minimum usd...", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        }),
          it("should update the mapping correctly...", async () => {
            await fundMe.fund({ value: sendValue });
            assert.equal(
              await fundMe.s_addressToAmountFunded(deployer),
              sendValue
            );
          }),
          it("should update the s_funders array correctly...", async () => {
            await fundMe.fund({ value: sendValue });
            const funder = await fundMe.s_funders(0);
            assert.equal(funder, deployer);
          });
      }),
        describe("withdraw()", () => {
          beforeEach(async () => {
            await fundMe.fund({ value: sendValue });
            // console.log(fundMe.provider);
          });
          it("should withdraw correctly...", async () => {
            const beforeWithdrawContractBalance =
              await ethers.provider.getBalance(fundMe);
            const beforeWithdrawDeployerBalance =
              await ethers.provider.getBalance(deployer);
            const txResponse = await fundMe.withdraw();
            const txReceipt = await txResponse.wait(1);
            const { gasPrice, gasUsed } = txReceipt;
            const gasCost = gasPrice * gasUsed;
            const afterWithdrawContractBalance =
              await ethers.provider.getBalance(fundMe);
            const afterWithdrawDeployerBalance =
              await ethers.provider.getBalance(deployer);
            assert.equal(afterWithdrawContractBalance, 0);
            assert.equal(
              beforeWithdrawContractBalance + beforeWithdrawDeployerBalance,
              afterWithdrawDeployerBalance + gasCost
            );
            await expect(fundMe.s_funders(0)).to.be.reverted;
            assert.equal(await fundMe.s_addressToAmountFunded(deployer), 0);
          }),
            it("allows us to withdraw with multiple accounts...", async () => {
              const accounts = await ethers.getSigners();
              for (let i = 0; i < 6; i++) {
                const fundMeConnectedContract = await fundMe.connect(
                  accounts[i]
                );
                await fundMeConnectedContract.fund({ value: sendValue });
              }
              const beforeWithdrawContractBalance =
                await ethers.provider.getBalance(fundMe);
              const beforeWithdrawDeployerBalance =
                await ethers.provider.getBalance(deployer);
              const txResponse = await fundMe.withdraw();
              const txReceipt = await txResponse.wait(1);
              const { gasPrice, gasUsed } = txReceipt;
              const gasCost = gasPrice * gasUsed;
              const afterWithdrawContractBalance =
                await ethers.provider.getBalance(fundMe);
              const afterWithdrawDeployerBalance =
                await ethers.provider.getBalance(deployer);
              assert.equal(afterWithdrawContractBalance, 0);
              assert.equal(
                beforeWithdrawContractBalance + beforeWithdrawDeployerBalance,
                afterWithdrawDeployerBalance + gasCost
              );
              await expect(fundMe.s_funders(0)).to.be.reverted;
              for (i = 0; i < 6; i++) {
                assert.equal(
                  await fundMe.s_addressToAmountFunded(accounts[i].address),
                  0
                );
              }
            }),
            it("Only allows owner to withdraw funds...", async () => {
              const accounts = await ethers.getSigners();
              const attacker = accounts[1];
              const fundMeAttackerConnectedContract = await fundMe.connect(
                attacker
              );
              await fundMe.fund({ value: sendValue });
              await fundMeAttackerConnectedContract.fund({ value: sendValue });
              await expect(
                fundMeAttackerConnectedContract.withdraw()
              ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
            });
        });

      describe("cheaperWithdraw()", () => {
        beforeEach(async () => {
          await fundMe.fund({ value: sendValue });
          // console.log(fundMe.provider);
        });
        it("should cheaperWithdraw correctly...", async () => {
          const beforeWithdrawContractBalance =
            await ethers.provider.getBalance(fundMe);
          const beforeWithdrawDeployerBalance =
            await ethers.provider.getBalance(deployer);
          const txResponse = await fundMe.cheaperWithdraw();
          const txReceipt = await txResponse.wait(1);
          const { gasPrice, gasUsed } = txReceipt;
          const gasCost = gasPrice * gasUsed;
          const afterWithdrawContractBalance = await ethers.provider.getBalance(
            fundMe
          );
          const afterWithdrawDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          assert.equal(afterWithdrawContractBalance, 0);
          assert.equal(
            beforeWithdrawContractBalance + beforeWithdrawDeployerBalance,
            afterWithdrawDeployerBalance + gasCost
          );
          await expect(fundMe.s_funders(0)).to.be.reverted;
          assert.equal(await fundMe.s_addressToAmountFunded(deployer), 0);
        }),
          it("allows us to cheaperWithdraw with multiple accounts...", async () => {
            const accounts = await ethers.getSigners();
            for (let i = 0; i < 6; i++) {
              const fundMeConnectedContract = await fundMe.connect(accounts[i]);
              await fundMeConnectedContract.fund({ value: sendValue });
            }
            const beforeWithdrawContractBalance =
              await ethers.provider.getBalance(fundMe);
            const beforeWithdrawDeployerBalance =
              await ethers.provider.getBalance(deployer);
            const txResponse = await fundMe.cheaperWithdraw();
            const txReceipt = await txResponse.wait(1);
            const { gasPrice, gasUsed } = txReceipt;
            const gasCost = gasPrice * gasUsed;
            const afterWithdrawContractBalance =
              await ethers.provider.getBalance(fundMe);
            const afterWithdrawDeployerBalance =
              await ethers.provider.getBalance(deployer);
            assert.equal(afterWithdrawContractBalance, 0);
            assert.equal(
              beforeWithdrawContractBalance + beforeWithdrawDeployerBalance,
              afterWithdrawDeployerBalance + gasCost
            );
            await expect(fundMe.s_funders(0)).to.be.reverted;
            for (i = 0; i < 6; i++) {
              assert.equal(
                await fundMe.s_addressToAmountFunded(accounts[i].address),
                0
              );
            }
          }),
          it("Only allows owner to cheaperWithdraw funds...", async () => {
            const accounts = await ethers.getSigners();
            const attacker = accounts[1];
            const fundMeAttackerConnectedContract = await fundMe.connect(
              attacker
            );
            await fundMe.fund({ value: sendValue });
            await fundMeAttackerConnectedContract.fund({ value: sendValue });
            await expect(
              fundMeAttackerConnectedContract.cheaperWithdraw()
            ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
          });
      });
    });
