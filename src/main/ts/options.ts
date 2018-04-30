const os = require('os');
const fs = require('fs-extra');
const Path = require('path');

export default class Options {
    private options: any;

    constructor() {
        this.options = {
            privValidatorPath: new ApplicationInput<string>("priv_validator", [Path.join('.', 'configuration', 'account', 'priv_validator.json')]).getValue(),
            genesisPath: new ApplicationInput<string>("genesis", [Path.join('.', 'configuration', 'account', 'genesis.json')]).getValue(),
            configurationPath: new ApplicationInput<string>("configuration", [Path.join('.', 'configuration', 'transacter', 'configuration.json')]).getValue()
        };
        try {
            const configuration = this.loadConfigurationFromFileSystem() || {};
            Object.assign(this.options, {
                transactionsPerSecond: new ApplicationInput<number>("transactionsPerSecond", [parseInt(process.env.TRANSACTIONS_PER_SECOND), configuration.transactionsPerSecond, 100]).getValue(),
                amountOfTransactions: new ApplicationInput<number>("amountOfTransactions", [parseInt(process.env.AMOUNT_OF_TRANSACTIONS), configuration.amountOfTransactions, 400]).getValue(),
                validators: new ApplicationInput<Array<string>>("validators", [(process.env.VALIDATORS) ? JSON.parse(process.env.VALIDATORS) : undefined, configuration.validators, []]).getValue(),
                payloads: new ApplicationInput<Array<any>>("payloads", [(process.env.PAYLOADS) ? JSON.parse(process.env.PAYLOADS) : undefined, configuration.payloads, [{"test": "Message"}]]).getValue(),
                privateKey: new ApplicationInput<string>("privateKey", [this.loadPrivateKeyFromConfigFile()]).getValue(),
                publicKey: new ApplicationInput<string>("publicKey", [this.loadPublicKeyFromConfigFile()]).getValue(),
                ownAddress: new ApplicationInput<string>("ownAddress", [this.loadOwnAddressFromConfigFile()]).getValue(),
                hostValidator: new ApplicationInput<string>("hostValidator", [os.hostname()]).getValue()
            })
        }
        catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    private loadConfigurationFromFileSystem(): any {
        let configuration = undefined;
        try {
            const contents = fs.readFileSync(this.options.configurationPath);
            configuration = JSON.parse(contents.toString());
            return configuration;
        }
        catch (e) {
            console.error(e);
        }
    }

    private loadPrivateKeyFromConfigFile(): string {
        try {
            const contents = fs.readFileSync(this.options.privValidatorPath);
            const validatorJSON = JSON.parse(contents.toString());
            return validatorJSON.priv_key[1];
        }
        catch (error) {
            console.error('Unable to read JSON from priv_validator.json file:', error);
        }
    }

    private loadPublicKeyFromConfigFile(): string {
        try {
            const contents = fs.readFileSync(this.options.privValidatorPath);
            const validatorJSON = JSON.parse(contents.toString());
            return validatorJSON.pub_key[1];
        }
        catch (error) {
            console.error('Unable to read JSON from priv_validator.json file:', error);
        }
    }

    private loadOwnAddressFromConfigFile(): string {
        try {
            const contents = fs.readFileSync(this.options.privValidatorPath);
            const validatorJSON = JSON.parse(contents.toString());
            return validatorJSON.address;
        }
        catch (error) {
            console.error('Unable to read JSON from priv_validator.json file:', error);
        }
    }

    getAll() {
        return this.options;
    }
}

class ApplicationInput<T> {
    private value: T;
    private name: string;
    private valueSources: Array<T>;

    constructor(name: string, valueSources: Array<T>) {
        this.name = name;
        this.valueSources = valueSources;
        this.value = this._determineValue();
    }

    _determineValue(): T {
        for (let i = 0; i < this.valueSources.length; i++) {
            if (this.valueSources[i]) {
                return this.valueSources[i];
            }
        }
    }

    getValue(): T {
        return this.value;
    }
}