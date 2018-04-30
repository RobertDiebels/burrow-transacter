# Burrow transacter
Currently there are no tools to test Burrow's performance in a containerized environment.
The transacter is intended to do just that. 

## How does it do that?
The transacter uses [Burrow's Javascript client](https://www.npmjs.com/package/@monax/legacy-db) and NodeJS to send transactions to validators.

## Usage
The container has the following environment variables.

### Environment variables
- `VALIDATORS`
  - An array containing validator addresses.
- `AMOUNT_OF_TRANSACTIONS`
  - A number representing the amount of transactions to send.
- `TRANSACTIONS_PER_SECOND`
  - A number representing the amount of transactions to send each second.
- `PAYLOADS`
  - An array with JSON objects which will be used to send to validators.


### Files
- `configuration.json`
  - If the evironment variables: `VALIDATORS`, `AMOUNT_OF_TRANSACTIONS` and `TRANSACTIONS_PER_SECOND` or not set, the transacter looks for this file and tries to find values there.
  - If it does not find the file default values are used.
  - The file should contain a JSON object with the properties: ``validators``, `amountOfTransactions` and `transactionsPerSecond`.
- `payloads.json`
  - If the environment variables: `PAYLOADS` is not set the payloads are retrieved from this file.
  - If it does not find the file default values are used.
  - The file should contain a JSON array JSON objects.

## Additional information
- The container runs until it has sent out the set `AMOUNT_OF_TRANSACTIONS`.
- The transacter is best used in conjunction with [Kubechain](https://github.com/kubechain/kubechain) a tool that allows you to easily run Hyperledger Burrow locally.
