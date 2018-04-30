import * as fs from "fs";
import Options from "./options";
import * as burrowFactory from "@monax/legacy-db";

let options = new Options().getAll();
const validatorClients: Array<ValidatorClient> = [];
let amountOfTransactionsToSend = options.amountOfTransactions;
let validatorClient: ValidatorClient = {address: "", client: {}};

interface ValidatorClient {
    address: string
    client: any
}


options.validators.forEach((validatorAddress: string) => {
    const clientAddress = "http://" + validatorAddress + ":1337/rpc";
    validatorClients.push({
        address: validatorAddress,
        client: burrowFactory.createInstance(clientAddress)
    });
});

validatorsUp().then(function () {
    startTransactions();
}).catch(retryValidatorsUp);

function retryValidatorsUp(error: any) {
    setTimeout(function () {
        console.error('[ERROR]: ', error);
        console.info("Waiting 30 seconds until retry.");
        console.info("Retrying..");
        validatorsUp()
            .then(function () {
                startTransactions()
            })
            .catch(retryValidatorsUp);
    }, 30000);
}

/**
 * Checks if the necessary amount of Burrow validators are up.
 * @return {Promise}
 */
function validatorsUp() {
    console.info("Verifying if validators are up.");
    return new Promise((resolve: any, reject: any) => {
        if (validatorClients && validatorClients.length > 1) {
            const promises = validatorClients.map((validatorClient) => {
                return validatorUp(validatorClient);
            });
            Promise.all(promises)
                .then(function () {
                    console.info("Validators are up.");
                    resolve();
                })
                .catch(function () {
                    reject("Validators are not up yet.");
                });
        }
        else {
            reject("The required amount of 2 validators for a burrow cluster has not been met. Please check your config.");
        }
    });
}

function validatorUp(validatorClient: ValidatorClient) {
    return new Promise<any>((resolve: any, reject: any) => {
        if (clientAddressMatchesHostAddress(validatorClient)) {
            resolve();
        }
        else {
            validatorClient.client.blockchain().getInfo((error: any) => {
                if (error) {
                    console.warn('[NOTUP] Validator', validatorClient.address, 'is not up.');
                    reject();
                }
                else {
                    console.info('[UP] Validator:', validatorClient.address, 'is up.');
                    resolve();
                }
            });
        }
    });
}

async function startTransactions() {
    console.info("Sending transactions..");
    validatorClient = randomValidatorClient();
    try {
        for (let i = 0; i < amountOfTransactionsToSend; i++) {
            const result = await sendAndWaitForConfirmation();
        }
    }
    catch (e) {
        console.error(e);
    }
}

function sendAndWaitForConfirmation() {
    const address = randomDestinationAddressFromGenesis();
    return new Promise((resolve, reject) => {
        validatorClient.client.txs().sendAndHold(options.privateKey, address, 1, null, (error: any, result: any) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        })
    });
}

function randomValidatorClient(): ValidatorClient {
    let randomClient = validatorClients[getRandomInt(0, options.validators.length - 1)];
    if (!clientAddressMatchesHostAddress(randomClient)) {
        console.info("Picked random validator as client:", randomClient.address);
        return randomClient;
    }
    else {
        return randomValidatorClient();
    }
}

function randomDestinationAddressFromGenesis(): string {
    try {
        const genesisJSON = JSON.parse(fs.readFileSync(options.genesisPath, 'utf-8'));
        const randomAccount = genesisJSON.accounts[getRandomInt(0, genesisJSON.accounts.length - 1)];
        const address = randomAccount.address;
        if (address !== options.ownAddress) {
            console.info("Selected random destination-address:", randomAccount.address);
            return address
        }
        else {
            return randomDestinationAddressFromGenesis();
        }
    }
    catch (error) {
        console.error('Unable to read JSON from genesis.json file:', error);
    }
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clientAddressMatchesHostAddress(client: ValidatorClient) {
    return client.address.match(options.hostValidator)
}
