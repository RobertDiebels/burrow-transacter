import * as fs from "fs";

const nonces:any = {};
const options:any = {};
const validatorClients:ValidatorClient[] = [];

interface ValidatorClient {
    address: string
    rpcClient: any
    client: any
}

function transactionInterval() {
    let amountOfTransactionsSend = 0;
    const transactionInterval = setInterval(() => {
        if (amountOfTransactionsSend >= options.amountOfTransactions) {
            clearInterval(transactionInterval);
        }
        else {
            console.info('Tx', amountOfTransactionsSend);
            broadcastTransaction();
            amountOfTransactionsSend++;
        }
    }, 1000 / options.transactionsPerSecond)
}

function broadcastTransaction() {
    const addressBytes = Buffer.from(randomDestinationAddressFromGenesis()).toJSON().data;
    send(1, addressBytes, options.publicKey, options.privateKey, randomValidatorClient());
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

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clientAddressMatchesHostAddress(client: ValidatorClient) {
    return client.address.match(options.hostValidator)
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



function send(amount: number, addressBytes: any[], publicKey: any[], privateKey: any[], validatorClient: ValidatorClient) {
    const inputs = [];
    const addressString = Buffer.from(addressBytes).toString();
    inputs.push(TxInput(addressBytes, amount, getNonceForAddress(addressString)));
    const outputs = [];
    outputs.push(TxOutput(addressBytes, amount));
    const tx = sendTx(inputs, outputs);
    const accounts = [];
    accounts.push(privAccount(addressBytes, publicKey, privateKey));
    const toSign = signTx(tx, accounts);

    console.info("Sending tx", JSON.stringify(toSign));
    validatorClient.rpcClient.request('burrow.signTx', toSign, function (error: any, response: any) {
        if (error) {
            console.warn("[ERROR]", error);
        }
        else {
            console.warn("[RESPONSE]", response);
            validatorClient.client.txs().broadcastTx(response.tx, function (error: any, response: any) {
                if (error) {
                    console.warn("[ERROR]", error);
                }
                else {
                    console.warn("[RESPONSE]", response);
                }
            });
        }
    });
    upNonce(addressString);
}

function getNonceForAddress(address: string): number {
    if (nonces[address]) {
        return nonces[address]
    }
    else {
        setNonce(address, 1);
        return getNonceForAddress(address);
    }
}

function setNonce(address: string, nonce: number): void {
    nonces[address] = nonce
}

function upNonce(address: string): void {
    nonces[address] += 1;
}

/**
 Address   []byte           `json:"address"`   // Hash of the PubKey
 Amount    int64            `json:"amount"`    // Must not exceed account balance
 Sequence  int              `json:"sequence"`  // Must be 1 greater than the last committed TxInput
 Signature crypto.Signature `json:"signature"` // Depends on the PubKey type and the whole Tx
 PubKey    crypto.PubKey    `json:"pub_key"`   // Must not be nil, may be nil

 See: https://github.com/hyperledger/burrow/blob/9c70b8c8f68fce8e6dc9642fae992e9f3bc178b3/txs/tx.go
 */
interface TxInput {
    address: any[] //Address: []byte("input1"), TODO: 'utf8' encoding?
    amount: number
    sequence: number
}

/**
 Address []byte `json:"address"` // Hash of the PubKey
 Amount int64   `json:"amount"`  // The sum of all outputs must not exceed the inputs.

 See: https://github.com/hyperledger/burrow/blob/9c70b8c8f68fce8e6dc9642fae992e9f3bc178b3/txs/tx.go
 */
interface TxOutput {
    address: any[], //Address: []byte("input1"), TODO: 'utf8' encoding?
    amount: number
}

/**
 Inputs  []*TxInput  `json:"inputs"`
 Outputs []*TxOutput `json:"outputs"`
 */
interface SendTx {
    inputs: Array<TxInput>
    outputs: Array<TxOutput>
}

/**
 Tx           *txs.CallTx            `json:"tx"`
 PrivAccounts []*account.PrivAccount `json:"priv_accounts"`
 */
interface SignTx {
    tx: SendTx
    priv_accounts: Array<PrivAccount>
}

/**
 Address []byte         `json:"address"`
 PubKey  crypto.PubKey  `json:"pub_key"`
 PrivKey crypto.PrivKey `json:"priv_key"`

 Note:
 Address = cmn.HexBytes = []byte (hex encoding)
 See: https://github.com/tendermint/go-crypto/blob/master/pub_key.go && https://github.com/tendermint/tmlibs/blob/master/common/bytes.go

 Note:
 crypto.PubKey = PubKeyEd25519 = [32]byte
 See: https://github.com/tendermint/go-crypto/blob/master/pub_key.go

 Note:
 crypto.PrivKey = PrivKeyEd25519 = [64]byte
 See: https://github.com/tendermint/go-crypto/blob/master/priv_key.go
 */
interface PrivAccount {
    address: any[]
    pub_key: any[],
    priv_key: any[]
}

function signTx(tx: SendTx, accounts: PrivAccount[]): SignTx {
    return {
        tx: tx,
        priv_accounts: accounts
    };
}


function sendTx(inputs: TxInput[], outputs: TxOutput[]): SendTx {
    return {
        inputs: inputs,
        outputs: outputs
    }
}

function TxInput(address: any[], amount: number, nonce: number): TxInput {
    return {
        address: address,
        amount: amount,
        sequence: nonce
    };
}

function TxOutput(address: any[], amount: number): TxOutput {
    return {
        address: address,
        amount: amount
    }
}

function privAccount(address: any[], publicKey: any[], privateKey: any[]): PrivAccount {
    return {
        address: address,
        pub_key: publicKey,
        priv_key: privateKey
    }
}